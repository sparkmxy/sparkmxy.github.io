import test from 'node:test';
import assert from 'node:assert/strict';
import { getAIEndpoint, requestInterpretation } from '../ai-client.mjs';
import { createAIReadingUI } from '../ai-ui.mjs';

const endpoint = 'https://iching-ai.example/api/interpret';
const record = { question: '如何合作？', lines: [6, 7, 8, 9, 6, 7].map(value => ({ value, steps: ['private audit'] })), entropy: { raw: [123], apiKey: 'must-not-send' } };
const answer = { text: '以卦象为参照，先明确彼此目标。', model: 'gemini-test', truncated: false };

test('client sends only the cast question and values with no credentials', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, endpoint);
    assert.deepEqual(JSON.parse(options.body), { question: record.question, values: [6, 7, 8, 9, 6, 7] });
    assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store');
    assert.equal(options.redirect, 'error'); assert.equal(options.referrerPolicy, 'no-referrer');
    return Response.json(answer);
  });
  assert.deepEqual(await requestInterpretation(record, { endpoint }), answer);
  assert.equal(mock.mock.callCount(), 1);
});

test('empty or unsafe endpoints fail locally before transmitting anything', async t => {
  const mock = t.mock.method(globalThis, 'fetch', () => assert.fail('must not call'));
  for (const invalid of ['', 'not a URL', 'http://example.com/api', 'javascript:alert(1)',
    'https://key:secret@example.com/api', `${endpoint}?key=secret`, `${endpoint}#fragment`]) {
    assert.throws(() => getAIEndpoint(invalid));
  }
  assert.equal(getAIEndpoint('http://127.0.0.1:8787/api/interpret'), 'http://127.0.0.1:8787/api/interpret');
  await assert.rejects(requestInterpretation(record, { endpoint: '' }), /尚未开放/);
  assert.equal(mock.mock.callCount(), 0);
});

test('untrusted errors, network failures and malformed success responses have readable messages', async t => {
  for (const [response, message] of [
    [() => Response.json({ error: 'secret details' }, { status: 429 }), /请求较多/],
    [() => Response.json({ error: 'secret details' }, { status: 503 }), /尚未就绪/],
    [() => new Response('<html>upstream error</html>'), /返回内容异常/],
    [() => Response.json({ ...answer, text: '' }), /返回内容异常/],
    [() => Response.json({ ...answer, text: 'a'.repeat(16001) }), /返回内容异常/],
  ]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => response());
    await assert.rejects(requestInterpretation(record, { endpoint }), message); mock.mock.restore();
  }
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(requestInterpretation(record, { endpoint }), /检查网络/);
});

test('client timeouts and explicit cancellation abort the outstanding fetch', async t => {
  t.mock.method(globalThis, 'fetch', (_url, { signal }) => new Promise((_resolve, reject) => {
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  // AbortSignal.timeout's internal timer does not itself keep Node running.
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(requestInterpretation(record, { endpoint, timeoutMs: 5 }), /超时/);
    const controller = new AbortController();
    const pending = requestInterpretation(record, { endpoint, signal: controller.signal });
    controller.abort(); await assert.rejects(pending, { name: 'AbortError' });
  } finally { clearTimeout(keepAlive); }
});

// Small DOM double to exercise async lifecycle behavior, without any web service.
function ui(request) {
  const nodes = new Map();
  const document = { querySelector(selector) {
    if (!nodes.has(selector)) nodes.set(selector, {
      textContent: '', hidden: false, disabled: false, attributes: {}, listeners: {},
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(name, callback) { this.listeners[name] = callback; },
      scrollIntoView() {}, focus() {},
      set innerHTML(_value) { assert.fail('AI output must never be parsed as HTML'); },
    });
    return nodes.get(selector);
  } };
  return { view: createAIReadingUI(document, endpoint, request), get: selector => document.querySelector(selector) };
}
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const flush = () => new Promise(resolve => setImmediate(resolve));

test('button appears after cast, prevents duplicate requests and uses the saved question', async () => {
  const pending = deferred(); const calls = [];
  const { view, get } = ui((snapshot, options) => { calls.push({ snapshot, options }); return pending.promise; });
  assert.equal(get('#ai-controls').hidden, true);
  const original = structuredClone(record); view.showReading(original); original.question = 'edited later';
  assert.equal(get('#ai-controls').hidden, false);
  get('#ai-interpret').listeners.click(); get('#ai-interpret').listeners.click();
  assert.equal(calls.length, 1); assert.equal(calls[0].snapshot.question, record.question);
  assert.equal(get('#ai-panel').attributes['aria-busy'], 'true');
  pending.resolve({ ...answer, text: '<img src=x onerror=alert(1)>\n卦意' }); await flush();
  assert.equal(get('#ai-answer').textContent, '<img src=x onerror=alert(1)>\n卦意');
  assert.equal(get('#ai-panel').attributes['aria-busy'], 'false');
  get('#ai-interpret').listeners.click(); assert.equal(calls.length, 1);
});

test('a late result from the previous cast cannot overwrite the next cast', async () => {
  const pending = deferred(); let oldSignal;
  const { view, get } = ui((_record, { signal }) => { oldSignal = signal; return pending.promise; });
  view.showReading(record); get('#ai-interpret').listeners.click();
  view.reset(); view.showReading({ ...record, question: '新的卦' });
  assert.equal(oldSignal.aborted, true); pending.resolve(answer); await flush();
  assert.equal(get('#ai-answer').textContent, ''); assert.equal(get('#ai-panel').hidden, true);
  assert.equal(get('#ai-question').textContent, '新的卦'); assert.equal(get('#ai-interpret').disabled, false);
});

test('failed requests can be retried; missing question and partial answer are visible', async () => {
  let count = 0;
  const { view, get } = ui(async () => { if (++count === 1) throw new Error('网络暂时不可用'); return { ...answer, truncated: true }; });
  view.showReading({ ...record, question: '' });
  assert.match(get('#ai-question-note').textContent, /整体卦意/);
  get('#ai-interpret').listeners.click(); await flush();
  assert.equal(get('#ai-error').hidden, false); assert.equal(get('#ai-interpret').disabled, false);
  get('#ai-interpret').listeners.click(); await flush();
  assert.equal(get('#ai-error').hidden, true); assert.equal(get('#ai-partial').hidden, false);
  get('#ai-retry').listeners.click(); await flush(); assert.equal(count, 3);
});
