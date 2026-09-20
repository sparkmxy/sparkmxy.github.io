/**
 * Randomness is acquired once for a cast; changing source always requires an
 * explicit UI choice. No pseudorandom fallback or automatic network retry.
 * RANDOM.ORG documentation: https://api.random.org/json-rpc/4/basic
 * Legacy public endpoint: https://www.random.org/clients/http/
 */
export const POOL_SIZE = 128;
export const REQUEST_TIMEOUT_MS = 20_000;

const WORD_RANGE = 65_536;
const API_ENDPOINT = 'https://api.random.org/json-rpc/4/invoke';
const PUBLIC_ENDPOINT = 'https://www.random.org/integers/?num=128&min=0&max=65535&col=1&base=10&format=plain&rnd=new';
const QUOTA_ENDPOINT = 'https://www.random.org/quota/?format=plain';
const SOURCES = {
  'random-org': { label: 'RANDOM.ORG 大气噪声 · 公共接口', endpoint: PUBLIC_ENDPOINT },
  'random-org-api': { label: 'RANDOM.ORG 大气噪声 · JSON-RPC API', endpoint: API_ENDPOINT },
  'web-crypto': { label: 'Web Crypto · 浏览器密码学随机数', endpoint: null },
};

let remoteInFlight = false;
let publicRetryAt = 0;
let apiRetryAt = 0;
let requestSequence = 0;

function failure(code, message) {
  const error = new Error(message);
  error.name = 'EntropyError';
  error.code = code;
  return error;
}

function aborted() {
  return failure('ABORTED', '本次随机数请求已取消，尚未起卦。');
}

function validateWords(raw) {
  if (!Array.isArray(raw) || raw.length !== POOL_SIZE ||
      raw.some(value => !Number.isInteger(value) || value < 0 || value >= WORD_RANGE)) {
    throw failure('INVALID_DATA', '随机源返回的数据数量或范围不正确，已停止起卦。请稍后重试或手动选择其他随机源。');
  }
  return raw;
}

function createPool(source, words, metadata = {}) {
  const raw = Object.freeze([...validateWords(words)]);
  let consumed = 0;
  let rejected = 0;
  const audit = Object.freeze({
    source,
    ...SOURCES[source],
    fetchedAt: new Date().toISOString(),
    wordBits: 16,
    poolSize: raw.length,
    sampling: 'uint16-rejection-v1',
    // These records explain the computation; Basic and public HTTP API data
    // are not signed RANDOM.ORG authenticity certificates.
    signed: false,
    ...metadata,
    raw,
    get consumed() { return consumed; },
    get rejected() { return rejected; },
  });

  return {
    audit,
    drawInt(maxExclusive) {
      if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > WORD_RANGE) {
        throw new RangeError('随机整数范围必须是 1 至 65536 之间的整数。');
      }
      // Discard the incomplete residue block to avoid modulo bias.
      const limit = WORD_RANGE - (WORD_RANGE % maxExclusive);
      while (consumed < raw.length) {
        const value = raw[consumed++];
        if (value < limit) return value % maxExclusive;
        rejected += 1;
      }
      throw failure('POOL_EXHAUSTED', '本次随机数池已用尽，已停止起卦。请重新开始以获取新的随机数。');
    },
  };
}

async function readResponse(url, options, signal) {
  const response = await fetch(url, {
    mode: 'cors',
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    ...options,
    signal,
  });
  if (response.status !== 200) {
    throw failure('HTTP_ERROR', `RANDOM.ORG 暂时无法提供随机数（HTTP ${response.status}）。请稍后重试或手动选择其他随机源。`);
  }
  return response;
}

async function publicWords(signal) {
  const quotaResponse = await readResponse(QUOTA_ENDPOINT, {}, signal);
  const quotaText = (await quotaResponse.text()).trim();
  if (!/^-?\d{1,16}$/.test(quotaText) || !Number.isSafeInteger(Number(quotaText))) {
    throw failure('INVALID_QUOTA', '无法确认 RANDOM.ORG 公共接口的剩余额度。请稍后重试或手动选择其他随机源。');
  }
  const quota = Number(quotaText);
  if (quota < 0) {
    publicRetryAt = Date.now() + 600_000;
    throw failure('QUOTA_EXHAUSTED', 'RANDOM.ORG 公共接口的当前 IP 额度已用尽。请至少十分钟后重试，或手动选择其他随机源。');
  }
  const response = await readResponse(PUBLIC_ENDPOINT, {}, signal);
  const body = (await response.text()).trim();
  if (!body || body.length > POOL_SIZE * 8) {
    throw failure('INVALID_DATA', 'RANDOM.ORG 返回了无效内容，已停止起卦。请稍后重试。');
  }
  const tokens = body.split(/\s+/);
  if (tokens.some(token => !/^\d{1,5}$/.test(token))) {
    throw failure('INVALID_DATA', 'RANDOM.ORG 返回了非整数内容，已停止起卦。请稍后重试。');
  }
  return { raw: tokens.map(Number), metadata: { quotaBefore: quota, legacyInterface: true } };
}

function rpcError(code) {
  if ([400, 401, 404, 405].includes(code)) {
    return failure('API_KEY_ERROR', 'RANDOM.ORG API Key 无效、未启用或不支持此接口。请检查个人 API Key。');
  }
  if ([402, 403, 503, 506].includes(code)) {
    return failure('QUOTA_EXHAUSTED', 'RANDOM.ORG API 的请求或随机位额度不足。请检查账户额度，或手动选择其他随机源。');
  }
  return failure('API_ERROR', `RANDOM.ORG API 未能完成请求（错误代码 ${Number.isInteger(code) ? code : '未知'}）。请稍后重试。`);
}

async function apiWords(apiKey, signal) {
  const requestId = `iching-${Date.now()}-${++requestSequence}`;
  const response = await readResponse(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'generateIntegers', id: requestId,
      params: { apiKey, n: POOL_SIZE, min: 0, max: WORD_RANGE - 1, replacement: true, base: 10 },
    }),
  }, signal);
  let payload;
  try { payload = await response.json(); }
  catch { throw failure('INVALID_DATA', 'RANDOM.ORG API 返回的内容不是有效 JSON，已停止起卦。'); }
  if (!payload || payload.jsonrpc !== '2.0' || payload.id !== requestId ||
      Boolean(payload.result) === Boolean(payload.error)) {
    throw failure('INVALID_DATA', 'RANDOM.ORG API 的响应与本次请求不符，已停止起卦。');
  }
  // Never expose an upstream message/data field: it may echo an API key.
  if (payload.error) throw rpcError(payload.error.code);
  const result = payload.result;
  if (!Number.isSafeInteger(result.advisoryDelay) || result.advisoryDelay < 0) {
    throw failure('INVALID_DATA', 'RANDOM.ORG API 未提供有效的请求间隔，已停止起卦。');
  }
  apiRetryAt = Date.now() + result.advisoryDelay;
  const metadata = { advisoryDelay: result.advisoryDelay };
  if (typeof result.random?.completionTime === 'string' &&
      result.random.completionTime.length < 100) metadata.completionTime = result.random.completionTime;
  for (const field of ['bitsUsed', 'bitsLeft', 'requestsLeft']) {
    if (Number.isSafeInteger(result[field])) metadata[field] = result[field];
  }
  return { raw: result.random?.data, metadata };
}

/** apiKey is sent only to RANDOM.ORG in the POST body and is never retained. */
export async function getEntropy(source, { apiKey, signal } = {}) {
  if (!Object.hasOwn(SOURCES, source)) throw failure('UNKNOWN_SOURCE', '请选择有效的随机源。');
  if (signal?.aborted) throw aborted();
  if (source === 'web-crypto') {
    if (typeof globalThis.crypto?.getRandomValues !== 'function') {
      throw failure('CRYPTO_UNAVAILABLE', '当前浏览器不支持 Web Crypto。请使用现代浏览器，或手动选择 RANDOM.ORG。');
    }
    const words = new Uint16Array(POOL_SIZE);
    try { globalThis.crypto.getRandomValues(words); }
    catch { throw failure('CRYPTO_UNAVAILABLE', '浏览器未能提供密码学随机数。请重试或手动选择 RANDOM.ORG。'); }
    return createPool(source, Array.from(words));
  }

  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (source === 'random-org-api' && !key) {
    throw failure('API_KEY_REQUIRED', '请先填写你自己的 RANDOM.ORG API Key，或选择无需 Key 的公共接口。');
  }
  if (remoteInFlight) throw failure('REQUEST_PENDING', '随机数请求正在进行中，请等待完成。');
  const retryAt = source === 'random-org' ? publicRetryAt : apiRetryAt;
  if (Date.now() < retryAt) {
    throw failure('RATE_LIMIT', `请等待 ${Math.ceil((retryAt - Date.now()) / 1000)} 秒后再请求此随机源。`);
  }

  remoteInFlight = true;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  try {
    const { raw, metadata } = source === 'random-org'
      ? await publicWords(controller.signal)
      : await apiWords(key, controller.signal);
    if (controller.signal.aborted) throw aborted();
    return createPool(source, raw, metadata);
  } catch (error) {
    if (signal?.aborted) throw aborted();
    if (timedOut) throw failure('TIMEOUT', 'RANDOM.ORG 请求超过 20 秒。请检查网络后重试，或手动选择其他随机源；本次未起卦。');
    if (error?.name === 'EntropyError') throw error;
    throw failure('NETWORK_ERROR', '无法连接 RANDOM.ORG，可能是网络或浏览器跨域限制。请检查网络后重试，或手动选择其他随机源。');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
    remoteInFlight = false;
  }
}
