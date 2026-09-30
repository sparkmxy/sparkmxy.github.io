import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, VERSION } from '../src/main.js';

const token = 'a'.repeat(64);
const origin = 'http://127.0.0.1:4173';
const env = { APPWRITE_REGION: 'sgp', GEMINI_API_KEY: 'gemini-key-must-stay-private', PROBE_TOKEN: token };
const request = (overrides = {}) => ({ method: 'POST', path: '/api/probe', bodyText: '{}',
  headers: { origin, 'content-type': 'application/json', 'x-probe-token': token }, ...overrides });
const execute = (handler, req = request()) => handler({ req, res: {
  text(body, status, headers) { return { body, status, headers, json: () => JSON.parse(body) }; },
} });
const response = (text = '连接成功') => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] });

test('health separates reachability and configuration from Gemini verification', async () => {
  let calls = 0;
  const handler = createHandler({ env, fetchImpl: async () => { calls++; } });
  const result = await execute(handler, request({ method: 'GET', path: '/health', headers: {} }));
  assert.equal(result.status, 200);
  assert.equal(result.json().ready, true);
  assert.equal(result.json().geminiVerified, false);
  assert.equal(result.json().version, VERSION);
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.equal(calls, 0);
  assert.doesNotMatch(result.body, /gemini-key|aaaaaa/);
  const notReady = createHandler({ env: { APPWRITE_REGION: 'sgp' } });
  const unconfigured = await execute(notReady, request({ method: 'GET', path: '/health' }));
  assert.equal(unconfigured.status, 200);
  assert.equal(unconfigured.json().ready, false);
});

test('only authenticated Singapore probes send the fixed request to Gemini', async () => {
  let calls = 0;
  const handler = createHandler({ env, fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    assert.equal(options.headers['x-goog-api-key'], env.GEMINI_API_KEY);
    assert.equal(options.redirect, 'manual');
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(JSON.parse(options.body).generationConfig.maxOutputTokens, 256);
    assert.match(JSON.parse(options.body).contents[0].parts[0].text, /连接成功/);
    return response();
  } });
  const result = await execute(handler);
  assert.equal(result.status, 200);
  assert.equal(result.json().geminiVerified, true);
  assert.equal(result.json().expectedReply, true);
  assert.equal(result.headers['access-control-allow-origin'], origin);
  assert.equal(calls, 1);
  assert.doesNotMatch(result.body, /gemini-key|aaaaaa|contents/);
});

test('missing/wrong token, region, origin and configuration cannot invoke Gemini', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return response(); };
  for (const badToken of [undefined, '', 'short', 'b'.repeat(64)]) {
    const handler = createHandler({ env, fetchImpl });
    assert.equal((await execute(handler, request({ headers: { 'x-probe-token': badToken } }))).status, 401);
  }
  for (const region of ['fra', 'unknown']) {
    assert.equal((await execute(createHandler({ env: { ...env, APPWRITE_REGION: region }, fetchImpl }))).status, 503);
  }
  for (const badOrigin of ['https://evil.test', 'null', `${origin}.evil.test`]) {
    assert.equal((await execute(createHandler({ env, fetchImpl }), request({ headers: { ...request().headers, origin: badOrigin } }))).status, 403);
  }
  for (const missing of ['GEMINI_API_KEY', 'PROBE_TOKEN']) {
    assert.equal((await execute(createHandler({ env: { ...env, [missing]: undefined }, fetchImpl }))).status, 503);
  }
  assert.equal(calls, 0);
});

test('older runtime can confirm Singapore through its injected regional endpoint', async () => {
  const handler = createHandler({ env: { ...env, APPWRITE_REGION: undefined, APPWRITE_FUNCTION_API_ENDPOINT: 'https://sgp.cloud.appwrite.io/v1' } });
  const result = await execute(handler, request({ method: 'GET', path: '/health' }));
  assert.equal(result.json().region, 'sgp');
  assert.equal(result.json().ready, true);
});

test('preflight allows only the pilot browser request and requires no secret', async () => {
  const handler = createHandler({ env: {} });
  const result = await execute(handler, request({ method: 'OPTIONS', headers: {
    origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type,x-probe-token',
  } }));
  assert.equal(result.status, 204);
  assert.equal(result.headers['access-control-allow-origin'], origin);
  assert.equal(result.body, '');
  const bad = await execute(handler, request({ method: 'OPTIONS', headers: {
    origin, 'access-control-request-method': 'DELETE',
  } }));
  assert.equal(bad.status, 403);
});

test('arbitrary prompts, URLs, oversized input and unexpected routes are rejected', async () => {
  let calls = 0;
  const handler = createHandler({ env, fetchImpl: async () => { calls++; return response(); } });
  for (const bodyText of ['null', '[]', '1', '""', '{', '{"prompt":"private question"}', '{"url":"https://evil.test"}']) {
    assert.equal((await execute(handler, request({ bodyText }))).status, 400);
  }
  assert.equal((await execute(handler, request({ bodyText: '问'.repeat(180) }))).status, 413);
  assert.equal((await execute(handler, request({ headers: { ...request().headers, 'content-type': 'text/plain' } }))).status, 415);
  assert.equal((await execute(handler, request({ path: '/api/unknown' }))).status, 404);
  assert.equal((await execute(handler, request({ method: 'GET' }))).status, 405);
  assert.equal(calls, 0);
});

test('upstream errors and unexpected model text cannot expose secrets', async () => {
  for (const status of [301, 400, 401, 403, 404, 429, 500]) {
    const handler = createHandler({ env, fetchImpl: async () => Response.json({ error: env.GEMINI_API_KEY }, { status }) });
    const result = await execute(handler);
    assert.equal(result.status, status === 429 ? 429 : 502);
    assert.equal(result.json().providerStatus, status);
    assert.doesNotMatch(result.body, /gemini-key|aaaaaa/);
  }
  const handler = createHandler({ env, fetchImpl: async () => response(env.GEMINI_API_KEY) });
  const result = await execute(handler);
  assert.equal(result.json().expectedReply, false);
  assert.doesNotMatch(result.body, /gemini-key/);
  const thrown = createHandler({ env, fetchImpl: async () => { throw new Error(env.GEMINI_API_KEY); } });
  assert.doesNotMatch((await execute(thrown)).body, /gemini-key/);
});

test('incomplete/blocked/malformed provider responses do not count as verification', async () => {
  for (const body of ['not-json', JSON.stringify({ candidates: [] }), JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } }),
    JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '连接' }] } }] }),
    JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'thought', thought: true }] } }] })]) {
    const handler = createHandler({ env, fetchImpl: async () => new Response(body) });
    const result = await execute(handler);
    assert.equal(result.status, 502);
    assert.notEqual(result.json().geminiVerified, true);
  }
});

test('timeouts are reported separately and cooldown prevents repeated provider calls', async () => {
  const handler = createHandler({ env, timeoutSignal: () => AbortSignal.abort(), fetchImpl: async (_url, options) => {
    options.signal.throwIfAborted();
  } });
  assert.equal((await execute(handler)).status, 504);
  let time = 100_000, calls = 0;
  const limited = createHandler({ env, now: () => time, fetchImpl: async () => { calls++; return response(); } });
  assert.equal((await execute(limited)).status, 200);
  assert.equal((await execute(limited)).status, 429);
  time += 30_000;
  assert.equal((await execute(limited)).status, 200);
  assert.equal(calls, 2);
});
