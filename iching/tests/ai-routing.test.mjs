import test from 'node:test';
import assert from 'node:assert/strict';
import { selectAIRoute, createRoutedInterpretation } from '../ai-routing.mjs';

const routes = {
  appwrite: { id: 'appwrite', label: '新加坡线路', endpoint: 'https://a.sgp.appwrite.run/api/interpret', health: 'https://a.sgp.appwrite.run/ai/health' },
  cloudflare: { id: 'cloudflare', label: 'Cloudflare', endpoint: 'https://cf.example/api/interpret', health: 'https://cf.example/health' },
};
const health = (countryCode = 'CN', overrides = {}) => Response.json({ service: 'iching-ai', ready: true,
  region: 'sgp', version: 'iching-appwrite-ai-v1', countryCode, ...overrides });
const pendingUntilAborted = (_url, { signal }) => new Promise((_resolve, reject) => {
  if (signal.aborted) reject(signal.reason);
  else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
});

test('mainland hint selects Appwrite without waiting for a blocked Cloudflare check', async () => {
  let cfSignal;
  const route = await selectAIRoute(routes, { fetchImpl: async (url, options) => {
    assert.equal(options.method, 'GET'); assert.equal(options.body, undefined);
    assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
    if (url === routes.appwrite.health) return health();
    cfSignal = options.signal; return pendingUntilAborted(url, options);
  } });
  assert.equal(route.id, 'appwrite'); assert.equal(cfSignal.aborted, true);
});

test('known non-mainland countries prefer Cloudflare; simultaneously healthy routes preserve that preference', async () => {
  for (const country of ['SG', 'US', 'HK', null]) {
    assert.equal((await selectAIRoute(routes, { fetchImpl: async () => health(country) })).id, 'cloudflare');
  }
  assert.equal((await selectAIRoute(routes, { fetchImpl: async url => {
    if (url === routes.cloudflare.health) throw new TypeError('offline');
    return health('US');
  } })).id, 'appwrite');
  assert.equal((await selectAIRoute(routes, { fetchImpl: async url => url === routes.appwrite.health
    ? health('CN', { ready: false }) : health() })).id, 'cloudflare');
});

test('missing country chooses a ready Appwrite without waiting for blocked Cloudflare', async () => {
  let signal;
  const route = await selectAIRoute(routes, { fetchImpl: async (url, options) => {
    if (url === routes.appwrite.health) return health(null);
    signal = options.signal; return pendingUntilAborted(url, options);
  } });
  assert.equal(route.id, 'appwrite'); assert.equal(signal.aborted, true);
});

test('healthy Cloudflare does not wait for unresponsive Appwrite metadata', async () => {
  let signal;
  const route = await selectAIRoute(routes, { fetchImpl: async (url, options) => {
    if (url === routes.cloudflare.health) return health(null);
    signal = options.signal; return pendingUntilAborted(url, options);
  } });
  assert.equal(route.id, 'cloudflare'); assert.equal(signal.aborted, true);
});

test('one failed health check does not discard a later ready route', async () => {
  let release;
  const delayed = new Promise(resolve => { release = resolve; });
  const pending = selectAIRoute(routes, { fetchImpl: async url => url === routes.cloudflare.health
    ? new Response(null, { status: 503 }) : delayed });
  await new Promise(resolve => setImmediate(resolve));
  release(health(null));
  assert.equal((await pending).id, 'appwrite');
});

test('old probe, wrong region, wrong service and invalid JSON never become AI routes', async () => {
  for (const bad of [{ service: 'iching-appwrite-probe' }, { region: 'fra' }, { version: 'old' }, { ready: false }]) {
    const route = await selectAIRoute(routes, { fetchImpl: async url => url === routes.appwrite.health ? health('CN', bad) : health() });
    assert.equal(route.id, 'cloudflare');
  }
  await assert.rejects(selectAIRoute(routes, { fetchImpl: async () => new Response('login') }), /无法连接/);
  await assert.rejects(selectAIRoute(routes, { fetchImpl: async () => new Response(null, { status: 503 }) }), /无法连接/);
  await assert.rejects(selectAIRoute({ appwrite: { ...routes.appwrite, health: 'https://evil.example/health' } }), /配置/);
});

test('health checks time out or cancel before any generation', async () => {
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(selectAIRoute(routes, { fetchImpl: pendingUntilAborted, timeoutMs: 5 }), /无法连接/);
    const controller = new AbortController();
    const result = selectAIRoute(routes, { fetchImpl: pendingUntilAborted, signal: controller.signal });
    controller.abort(); await assert.rejects(result, { name: 'AbortError' });
  } finally { clearTimeout(keepAlive); }
});

test('one click sends one generation; quota, provider and ambiguous network failures are never retried', async () => {
  const input = { question: '秘密问题', lines: [7, 7, 7, 8, 8, 8].map(value => ({ value })) };
  const statuses = [];
  for (const failure of [null, new Error('429'), new Error('503'), new TypeError('network lost')]) {
    let calls = 0;
    const request = createRoutedInterpretation(routes, { fetchImpl: async () => health(), request: async (record, options) => {
      calls++; assert.equal(record, input); assert.equal(options.endpoint, routes.appwrite.endpoint);
      assert.equal(options.timeoutMs, 35_000);
      if (failure) throw failure;
      return { text: '解读', model: 'gemini-test', truncated: false };
    } });
    if (failure) await assert.rejects(request(input), error => error === failure);
    else assert.equal((await request(input, { onStatus: message => statuses.push(message) })).route, '新加坡线路');
    assert.equal(calls, 1);
  }
  assert.match(statuses[0], /选择/); assert.match(statuses[1], /新加坡/);
});
