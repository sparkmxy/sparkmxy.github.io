import test from 'node:test';
import assert from 'node:assert/strict';

let moduleId = 0;
const fresh = () => import(`../random.mjs?test=${++moduleId}`);
const numbers = (first = []) => [...first, ...Array(128 - first.length).fill(0)];
const textResponse = value => new Response(value, { status: 200 });

function publicFetch(t, values = numbers()) {
  return t.mock.method(globalThis, 'fetch', async url =>
    textResponse(url.includes('/quota/') ? '1000000\n' : values.join('\n')));
}

function mockApi(t, createResult) {
  return t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const request = JSON.parse(options.body);
    return Response.json({ jsonrpc: '2.0', id: request.id, ...createResult(request) });
  });
}

test('public source checks quota, gets one fresh batch, and exports accurate audit', async t => {
  const calls = publicFetch(t, numbers([65535, 65534, 65529, 0]));
  const { getEntropy } = await fresh();
  const pool = await getEntropy('random-org');
  assert.equal(calls.mock.callCount(), 2);
  assert.match(calls.mock.calls[1].arguments[0], /rnd=new/);
  assert.equal(calls.mock.calls[1].arguments[1].credentials, 'omit');
  assert.equal(calls.mock.calls[1].arguments[1].cache, 'no-store');
  assert.equal(pool.drawInt(10), 9); // 65530..65535 are rejected.
  assert.equal(pool.audit.consumed, 3);
  assert.equal(pool.audit.rejected, 2);
  assert.equal(pool.drawInt(48), 0);
  const record = JSON.parse(JSON.stringify(pool.audit));
  assert.equal(record.consumed, 4);
  assert.equal(record.signed, false);
  assert.equal(record.raw.length, 128);
  assert.equal(record.legacyInterface, true);
  assert.match(record.fetchedAt, /^\d{4}-/);
});

test('uint16 sampler includes all values for full domain, rejects invalid bounds and stops on exhaustion', async t => {
  publicFetch(t, numbers([65535]));
  const { getEntropy } = await fresh();
  const pool = await getEntropy('random-org');
  for (const invalid of [0, -1, 1.2, 65537, NaN, Infinity, '4']) {
    assert.throws(() => pool.drawInt(invalid), RangeError);
  }
  assert.equal(pool.audit.consumed, 0);
  assert.equal(pool.drawInt(65536), 65535);
  for (let i = 1; i < 128; i++) assert.equal(pool.drawInt(1), 0);
  assert.throws(() => pool.drawInt(4), { code: 'POOL_EXHAUSTED' });
  assert.equal(pool.audit.consumed, 128);
});

test('sampler rejects an entire unusable pool without hidden refill', async t => {
  const calls = publicFetch(t, Array(128).fill(65535));
  const { getEntropy } = await fresh();
  const pool = await getEntropy('random-org');
  assert.throws(() => pool.drawInt(3), { code: 'POOL_EXHAUSTED' });
  assert.equal(pool.audit.rejected, 128);
  assert.equal(calls.mock.callCount(), 2);
});

test('public source rejects malformed bodies, wrong lengths, and out of range words', async t => {
  const badBodies = ['', '<html>unavailable</html>', 'Error: quota', '1 2',
    numbers([65536]).join('\n'), numbers([-1]).join('\n'),
    numbers([1.5]).join('\n'), Array(129).fill(0).join('\n')];
  for (const body of badBodies) {
    await t.test(`reject ${JSON.stringify(body.slice(0, 24))}`, async child => {
      child.mock.method(globalThis, 'fetch', async url =>
        textResponse(url.includes('/quota/') ? '1000000' : body));
      const { getEntropy } = await fresh();
      await assert.rejects(getEntropy('random-org'), { code: 'INVALID_DATA' });
    });
  }
});

test('negative public quota blocks generation and applies a ten minute cooldown', async t => {
  const calls = t.mock.method(globalThis, 'fetch', async () => textResponse('-1'));
  const { getEntropy } = await fresh();
  await assert.rejects(getEntropy('random-org'), { code: 'QUOTA_EXHAUSTED' });
  await assert.rejects(getEntropy('random-org'), { code: 'RATE_LIMIT' });
  assert.equal(calls.mock.callCount(), 1);
});

test('invalid quota does not request random numbers', async t => {
  const calls = t.mock.method(globalThis, 'fetch', async () => textResponse('unavailable'));
  const { getEntropy } = await fresh();
  await assert.rejects(getEntropy('random-org'), { code: 'INVALID_QUOTA' });
  assert.equal(calls.mock.callCount(), 1);
});

test('HTTP and network failure never silently fall back to browser randomness', async t => {
  const cryptoCall = t.mock.method(globalThis.crypto, 'getRandomValues', () => {
    throw new Error('Must not fall back');
  });
  const network = t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  const { getEntropy } = await fresh();
  await assert.rejects(getEntropy('random-org'), { code: 'HTTP_ERROR' });
  network.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(getEntropy('random-org'), { code: 'NETWORK_ERROR' });
  assert.equal(cryptoCall.mock.callCount(), 0);
});

test('Web Crypto explicitly uses getRandomValues and never accesses the network', async t => {
  const network = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network'); });
  const cryptoCall = t.mock.method(globalThis.crypto, 'getRandomValues', values => {
    assert.ok(values instanceof Uint16Array);
    assert.equal(values.length, 128);
    values.fill(42);
    return values;
  });
  const { getEntropy } = await fresh();
  const pool = await getEntropy('web-crypto');
  assert.equal(pool.drawInt(10), 2);
  assert.equal(pool.audit.source, 'web-crypto');
  assert.equal(pool.audit.endpoint, null);
  assert.equal(cryptoCall.mock.callCount(), 1);
  assert.equal(network.mock.callCount(), 0);
});

test('Web Crypto failure is actionable and has no fallback', async t => {
  t.mock.method(globalThis.crypto, 'getRandomValues', () => { throw new Error('unavailable'); });
  const { getEntropy } = await fresh();
  await assert.rejects(getEntropy('web-crypto'), { code: 'CRYPTO_UNAVAILABLE' });
  await assert.rejects(getEntropy('unknown'), { code: 'UNKNOWN_SOURCE' });
});

test('API key remains only in the POST body, never in audit, and advisory delay is respected', async t => {
  const key = 'visitor-private-key';
  const calls = mockApi(t, request => {
    assert.equal(request.params.apiKey, key);
    assert.equal(request.params.replacement, true);
    assert.equal(request.params.n, 128);
    assert.equal(request.params.max, 65535);
    assert.equal(request.method, 'generateIntegers');
    return { result: { random: { data: numbers(), completionTime: '2026-09-20 07:00:00Z' },
      advisoryDelay: 1000, bitsUsed: 2048, bitsLeft: 100000, requestsLeft: 99 } };
  });
  const { getEntropy } = await fresh();
  const pool = await getEntropy('random-org-api', { apiKey: ` ${key} ` });
  assert.equal(calls.mock.calls[0].arguments[0], 'https://api.random.org/json-rpc/4/invoke');
  assert.equal(calls.mock.calls[0].arguments[1].redirect, 'error');
  assert.equal(calls.mock.calls[0].arguments[1].method, 'POST');
  assert.ok(!JSON.stringify(pool.audit).includes(key));
  assert.equal(pool.audit.bitsUsed, 2048);
  await assert.rejects(getEntropy('random-org-api', { apiKey: key }), { code: 'RATE_LIMIT' });
  assert.equal(calls.mock.callCount(), 1);
});

test('API rejects missing keys before issuing any request', async t => {
  const calls = t.mock.method(globalThis, 'fetch', () => { throw new Error('unexpected'); });
  const { getEntropy } = await fresh();
  await assert.rejects(getEntropy('random-org-api'), { code: 'API_KEY_REQUIRED' });
  assert.equal(calls.mock.callCount(), 0);
});

test('API errors do not expose echoed secrets', async t => {
  mockApi(t, () => ({ error: { code: 400, message: 'secret-key', data: ['secret-key'] } }));
  const { getEntropy } = await fresh();
  await assert.rejects(getEntropy('random-org-api', { apiKey: 'secret-key' }), error =>
    error.code === 'API_KEY_ERROR' && !error.message.includes('secret-key'));
});

test('API rejects response mismatches, bad delays, and corrupt numeric data', async t => {
  for (const kind of ['wrong-id', 'wrong-version', 'missing-delay', 'string-word', 'both-result-error', 'invalid-json']) {
    await t.test(kind, async child => {
      child.mock.method(globalThis, 'fetch', async (_url, options) => {
        if (kind === 'invalid-json') return textResponse('not json');
        const request = JSON.parse(options.body);
        const payload = { jsonrpc: '2.0', id: request.id,
          result: { random: { data: numbers() }, advisoryDelay: 0 } };
        if (kind === 'wrong-id') payload.id = 'different-request';
        if (kind === 'wrong-version') payload.jsonrpc = '1.0';
        if (kind === 'missing-delay') delete payload.result.advisoryDelay;
        if (kind === 'string-word') payload.result.random.data[0] = '42';
        if (kind === 'both-result-error') payload.error = { code: 400 };
        return Response.json(payload);
      });
      const { getEntropy } = await fresh();
      await assert.rejects(getEntropy('random-org-api', { apiKey: 'a' }), { code: 'INVALID_DATA' });
    });
  }
});

test('requests can be cancelled, concurrent requests are blocked, and lock is released', async t => {
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  const { getEntropy } = await fresh();
  const controller = new AbortController();
  const request = getEntropy('random-org', { signal: controller.signal });
  await assert.rejects(getEntropy('random-org'), { code: 'REQUEST_PENDING' });
  controller.abort();
  await assert.rejects(request, { code: 'ABORTED' });
  await assert.rejects(getEntropy('web-crypto', { signal: controller.signal }), { code: 'ABORTED' });
  t.mock.restoreAll();
  publicFetch(t);
  assert.equal((await getEntropy('random-org')).audit.source, 'random-org');
});

test('network request has a twenty second deadline and timeout remains an explicit failure', async t => {
  t.mock.method(globalThis, 'setTimeout', (callback, ms) => {
    assert.equal(ms, 20000);
    queueMicrotask(callback);
    return 1;
  });
  t.mock.method(globalThis, 'clearTimeout', () => {});
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  const { getEntropy } = await fresh();
  await assert.rejects(getEntropy('random-org'), { code: 'TIMEOUT' });
});
