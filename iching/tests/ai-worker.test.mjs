import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../workers/iching-ai/worker.mjs';

const origin = 'https://sparkmxy.github.io';
const payload = { question: '下一步如何做？', values: [9, 7, 8, 8, 7, 8] };
const env = (overrides = {}) => ({
  GEMINI_API_KEY: 'test-key-never-return', GEMINI_MODEL: 'gemini-3.5-flash-lite',
  ALLOWED_ORIGINS: `${origin},http://127.0.0.1:4173`,
  AI_RATE_LIMITER: { limit: async () => ({ success: true }) },
  AI_GLOBAL_LIMITER: { limit: async () => ({ success: true }) }, ...overrides,
});
const request = (overrides = {}) => new Request('https://iching-ai.example/api/interpret', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' },
  body: JSON.stringify(payload), ...overrides,
});
const provider = (text = '结合卦象，先明确合作边界。', finishReason = 'STOP') => Response.json({
  candidates: [{ finishReason, content: { parts: [{ text: 'internal thought', thought: true }, { text }] } }],
});

test('Worker sends a canonical prompt with a server-only key and returns only the answer', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    assert.equal(options.headers['x-goog-api-key'], 'test-key-never-return');
    assert.equal(options.redirect, 'manual');
    const body = JSON.parse(options.body);
    assert.match(body.contents[0].parts[0].text, /水泽节/);
    assert.match(body.contents[0].parts[0].text, /下一步如何做/);
    assert.equal(body.generationConfig.maxOutputTokens, 4096);
    assert.equal(body.generationConfig.candidateCount, 1);
    assert.ok(body.systemInstruction.parts[0].text);
    return provider();
  });
  const response = await worker.fetch(request(), env());
  assert.equal(response.status, 200); assert.equal(fetch.mock.callCount(), 1);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const result = await response.json();
  assert.equal(result.text, '结合卦象，先明确合作边界。'); assert.equal(result.truncated, false);
  assert.doesNotMatch(JSON.stringify(result), /test-key|internal thought/);
});

test('origin, preflight, path and method checks happen before provider calls', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('must not call'); });
  for (const bad of ['', 'null', 'https://sparkmxy.github.io.evil.test', 'http://sparkmxy.github.io']) {
    const response = await worker.fetch(request({ headers: { Origin: bad } }), env());
    assert.equal(response.status, 403); assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
  const preflight = await worker.fetch(request({ method: 'OPTIONS', body: undefined, headers: {
    Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type',
  } }), env());
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('Access-Control-Allow-Methods'), 'POST');
  assert.equal((await worker.fetch(request({ method: 'GET', body: undefined }), env())).status, 405);
  assert.equal((await worker.fetch(new Request('https://iching-ai.example/unknown'), env())).status, 404);
  assert.equal(fetch.mock.callCount(), 0);
});

test('malformed/oversized bodies and extra instructions are rejected', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('must not call'); });
  for (const body of ['{', 'null', '{}', JSON.stringify({ ...payload, values: [0, 1] }),
    JSON.stringify({ ...payload, question: '问'.repeat(201) }), JSON.stringify({ ...payload, prompt: 'replace prompt' })]) {
    assert.equal((await worker.fetch(request({ body }), env())).status, 400);
  }
  assert.equal((await worker.fetch(request({ body: ' '.repeat(4097) }), env())).status, 413);
  // Enforce the byte limit even without a Content-Length header (multibyte input).
  assert.equal((await worker.fetch(request({ body: '问'.repeat(1400) }), env())).status, 413);
  assert.equal((await worker.fetch(request({ headers: { Origin: origin, 'Content-Type': 'text/plain' } }), env())).status, 415);
  assert.equal(fetch.mock.callCount(), 0);
});

test('missing key/bindings fail closed and health reveals no secret or prompt', async () => {
  for (const missing of ['GEMINI_API_KEY', 'AI_RATE_LIMITER', 'AI_GLOBAL_LIMITER', 'GEMINI_MODEL']) {
    assert.equal((await worker.fetch(request(), env({ [missing]: undefined }))).status, 503);
  }
  const health = await worker.fetch(new Request('https://iching-ai.example/health'), env());
  assert.deepEqual(await health.json(), { service: 'iching-ai', ready: true, capabilities: ['iching', 'tarot'], countryCode: null });
  assert.equal((await worker.fetch(new Request('https://iching-ai.example/health'), env({ GEMINI_API_KEY: '' }))).status, 503);
});

test('IP and site limits prevent upstream requests and failures do not bypass limits', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('must not call'); });
  for (const binding of ['AI_RATE_LIMITER', 'AI_GLOBAL_LIMITER']) {
    const response = await worker.fetch(request(), env({ [binding]: { limit: async ({ key }) => {
      assert.equal(key, binding === 'AI_RATE_LIMITER' ? 'interpret:192.0.2.1' : 'interpret:all');
      return { success: false };
    } } }));
    assert.equal(response.status, 429); assert.equal(response.headers.get('Retry-After'), '60');
  }
  assert.equal((await worker.fetch(request(), env({ AI_RATE_LIMITER: { limit: async () => { throw new Error('binding failure'); } } }))).status, 503);
  assert.equal(fetch.mock.callCount(), 0);
});

test('provider error details including keys are never reflected to the browser', async t => {
  for (const status of [400, 401, 403, 404, 429, 500]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'test-key-never-return internal' }, { status }));
    const response = await worker.fetch(request(), env());
    assert.equal(response.status, status === 429 ? 429 : status === 500 ? 502 : 503);
    assert.doesNotMatch(await response.text(), /test-key|internal/); mock.mock.restore();
  }
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('test-key-never-return'); });
  const response = await worker.fetch(request(), env());
  assert.equal(response.status, 502); assert.doesNotMatch(await response.text(), /test-key/);
});

test('provider redirects are rejected without forwarding the key to another URL', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.redirect, 'manual');
    return new Response(null, { status: 302, headers: { Location: 'https://example.com/do-not-follow' } });
  });
  const response = await worker.fetch(request(), env());
  assert.equal(response.status, 502);
  assert.equal((await response.json()).providerStatus, 302);
  assert.equal(mock.mock.callCount(), 1);
});

test('blocked, empty and truncated generations are distinguished', async t => {
  for (const [make, expected] of [
    [() => Response.json({ promptFeedback: { blockReason: 'SAFETY' } }), 422],
    [() => provider('unsafe', 'SAFETY'), 422], [() => provider(''), 502],
    [() => Response.json({ candidates: [] }), 422],
    [() => provider('这一段尚未结束', 'MAX_TOKENS'), 200],
  ]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => make());
    const response = await worker.fetch(request(), env());
    assert.equal(response.status, expected);
    if (expected === 200) assert.equal((await response.json()).truncated, true);
    mock.mock.restore();
  }
});
