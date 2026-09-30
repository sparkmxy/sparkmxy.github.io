import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../src/main.js';
import { TEST_INPUT } from '../src/interpret.mjs';

const origin = 'http://127.0.0.1:4173';
const token = 't'.repeat(64);
const env = { APPWRITE_REGION: 'sgp', GEMINI_API_KEY: 'secret-do-not-return', PROBE_TOKEN: token, PUBLIC_AI_ENABLED: 'true' };
const req = (overrides = {}) => ({ method: 'POST', path: '/api/interpret', bodyText: JSON.stringify(TEST_INPUT),
  headers: { origin, 'content-type': 'application/json', 'x-appwrite-client-ip': '192.0.2.1', 'x-appwrite-country-code': 'cn' }, ...overrides });
const run = (handler, request = req()) => handler({ req: request, res: {
  text(body, status, headers) { return { status, headers, data: body ? JSON.parse(body) : null }; },
} });
const answer = (finishReason = 'STOP') => Response.json({ candidates: [{ finishReason,
  content: { parts: [{ text: 'private thought', thought: true }, { text: '先明确合作边界，再循序推进。' }] } }] });

test('public interface is disabled by default, and old probe readiness is separate', async () => {
  const handler = createHandler({ env: { ...env, PUBLIC_AI_ENABLED: undefined }, fetchImpl: () => assert.fail('no provider') });
  assert.equal((await run(handler)).status, 503);
  const health = await run(handler, req({ path: '/ai/health', method: 'GET' }));
  assert.equal(health.status, 503); assert.equal(health.data.ready, false); assert.equal(health.data.countryCode, 'CN');
  assert.doesNotMatch(JSON.stringify(health.data), /192\.0|secret|ttttt/);
  const probe = await run(handler, req({ path: '/health', method: 'GET' }));
  assert.equal(probe.data.ready, true); assert.equal(probe.data.interpretationAvailable, true);
});

test('canonical full interpretation is identical in scope to Cloudflare and filters private output', async () => {
  const handler = createHandler({ env, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    assert.equal(options.headers['x-goog-api-key'], env.GEMINI_API_KEY); assert.equal(options.redirect, 'manual');
    const body = JSON.parse(options.body);
    assert.match(body.contents[0].parts[0].text, /水泽节/);
    assert.match(body.contents[0].parts[0].text, /彖传/); assert.match(body.systemInstruction.parts[0].text, /600–900/);
    assert.equal(body.generationConfig.maxOutputTokens, 4096); return answer();
  } });
  const result = await run(handler);
  assert.equal(result.status, 200); assert.equal(result.data.truncated, false);
  assert.equal(result.data.promptVersion, 'iching-v1');
  assert.doesNotMatch(JSON.stringify(result), /secret-do-not-return|private thought/);
  assert.equal(result.headers['access-control-allow-origin'], origin);
});

test('private full test needs token, ignores caller prompts, works while public service is off', async () => {
  let calls = 0;
  const handler = createHandler({ env: { ...env, PUBLIC_AI_ENABLED: undefined }, fetchImpl: async (_url, options) => {
    calls++; assert.match(JSON.parse(options.body).contents[0].parts[0].text, /面对新的合作机会/); return answer();
  } });
  const request = req({ path: '/api/interpret-test', bodyText: '{}', headers: { 'content-type': 'application/json', 'x-probe-token': token } });
  assert.equal((await run(handler, { ...request, headers: {} })).status, 401);
  assert.equal((await run(handler, { ...request, bodyText: JSON.stringify(TEST_INPUT) })).status, 400);
  assert.equal((await run(handler, request)).status, 200); assert.equal(calls, 1);
});

test('public CORS, Singapore, key, body validation and preflight fail before Gemini', async () => {
  const handler = createHandler({ env, fetchImpl: () => assert.fail('no provider') });
  for (const headers of [{}, { origin: 'https://evil.example' }]) assert.equal((await run(handler, req({ headers }))).status, 403);
  for (const bodyText of ['{}', 'null', '{', JSON.stringify({ ...TEST_INPUT, prompt: 'override' })]) {
    assert.equal((await run(handler, req({ bodyText }))).status, 400);
  }
  assert.equal((await run(handler, req({ bodyText: '问'.repeat(1400) }))).status, 413);
  assert.equal((await run(handler, req({ headers: { origin, 'content-type': 'text/plain' } }))).status, 415);
  for (const overrides of [{ APPWRITE_REGION: 'fra' }, { GEMINI_API_KEY: '' }]) {
    assert.equal((await run(createHandler({ env: { ...env, ...overrides } }))).status, 503);
  }
  const preflight = req({ method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST',
    'access-control-request-headers': 'content-type' } });
  assert.equal((await run(handler, preflight)).status, 204);
  assert.equal((await run(handler, { ...preflight, headers: { ...preflight.headers, 'access-control-request-headers': 'x-probe-token' } })).status, 403);
});

test('per-instance IP and overall limits apply before upstream, including provider failures', async () => {
  let now = 0, calls = 0;
  const handler = createHandler({ env, now: () => now, fetchImpl: async () => { calls++; return new Response(null, { status: 500 }); } });
  for (let i = 0; i < 3; i++) assert.equal((await run(handler)).status, 502);
  assert.equal((await run(handler)).status, 429); assert.equal(calls, 3);
  now = 60_000;
  for (let i = 0; i < 20; i++) assert.equal((await run(handler, req({ headers: { ...req().headers, 'x-appwrite-client-ip': `192.0.2.${i}` } }))).status, 502);
  assert.equal((await run(handler, req({ headers: { ...req().headers, 'x-appwrite-client-ip': '192.0.2.99' } }))).status, 429);
});

test('timeouts, redirects, blocked and truncated replies are distinguished without raw errors', async () => {
  for (const [provider, status] of [
    [() => new Response(null, { status: 302, headers: { location: 'https://evil.example' } }), 502],
    [() => new Response('secret-do-not-return', { status: 429 }), 429],
    [() => new Response('bad json'), 502], [() => answer('SAFETY'), 422], [() => answer('MAX_TOKENS'), 200],
  ]) {
    const result = await run(createHandler({ env, fetchImpl: async () => provider() }));
    assert.equal(result.status, status); assert.doesNotMatch(JSON.stringify(result), /secret-do-not-return/);
    if (status === 200) assert.equal(result.data.truncated, true);
  }
  const controller = new AbortController(); controller.abort();
  const result = await run(createHandler({ env, interpretationTimeoutSignal: () => controller.signal,
    fetchImpl: async () => { throw new Error('secret-do-not-return'); } }));
  assert.equal(result.status, 504); assert.equal(result.data.error, 'provider_timeout');
});
