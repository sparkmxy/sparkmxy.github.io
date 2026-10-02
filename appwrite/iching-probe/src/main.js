import { createHash, timingSafeEqual } from 'node:crypto';
import { createInterpreter, AI_VERSION, TEST_INPUT } from './interpret.mjs';

export const VERSION = 'iching-appwrite-probe-v1';
const MODEL = 'gemini-3.5-flash-lite';
const MAX_BODY_BYTES = 512;
const UPSTREAM_TIMEOUT_MS = 20_000; // Appwrite synchronous HTTP executions have a 30s ceiling.
const DEFAULT_ORIGINS = 'https://sparkmxy.github.io,http://127.0.0.1:4173,http://localhost:4173';

function regionOf(env) {
  if (env.APPWRITE_REGION) return String(env.APPWRITE_REGION).toLowerCase();
  // Older runtimes may supply the regional API endpoint instead of APPWRITE_REGION.
  try {
    const host = new URL(env.APPWRITE_FUNCTION_API_ENDPOINT).hostname;
    return host.endsWith('.cloud.appwrite.io') ? host.split('.')[0] : 'unknown';
  } catch { return 'unknown'; }
}

function originsOf(env) {
  return String(env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(',').map(value => value.trim()).filter(value => {
    try { return ['http:', 'https:'].includes(new URL(value).protocol) && new URL(value).origin === value; }
    catch { return false; }
  });
}

function validToken(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(value);
}

function matchesToken(candidate, expected) {
  if (!validToken(candidate) || !validToken(expected)) return false;
  const hash = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(candidate), hash(expected));
}

// Dependency injection keeps tests completely offline. No Gemini key is packaged.
export function createHandler({ env = process.env, fetchImpl = fetch, now = Date.now,
  timeoutSignal = () => AbortSignal.timeout(UPSTREAM_TIMEOUT_MS), interpretationTimeoutSignal } = {}) {
  let lastProbeAt = -Infinity;
  let busy = false;
  const interpret = createInterpreter({ env, fetchImpl, now,
    ...(interpretationTimeoutSignal ? { timeoutSignal: interpretationTimeoutSignal } : {}) });
  return async function handler({ req, res }) {
    const headers = Object.fromEntries(Object.entries(req.headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
    const origin = headers.origin;
    const allowed = originsOf(env).includes(origin);
    const reply = (data, status = 200, extra = {}) => res.text(data === null ? '' : JSON.stringify(data), status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
      vary: 'Origin', ...(allowed ? { 'access-control-allow-origin': origin } : {}), ...extra,
    });
    // Origin is a browser boundary, not authentication. POST additionally needs PROBE_TOKEN.
    if (origin && !allowed) return reply({ error: 'origin_not_allowed' }, 403);
    const path = String(req.path || '/').split('?')[0];
    const method = String(req.method || 'GET').toUpperCase();
    const region = regionOf(env);
    const geminiConfigured = Boolean(env.GEMINI_API_KEY?.trim());
    const probeConfigured = validToken(env.PROBE_TOKEN);
    const aiReady = region === 'sgp' && geminiConfigured && env.PUBLIC_AI_ENABLED === 'true';
    // Appwrite supplies this coarse routing hint. Never return or store client IP.
    const rawCountry = String(headers['x-appwrite-country-code'] || '').toUpperCase();
    const countryCode = /^[A-Z]{2}$/.test(rawCountry) && rawCountry !== 'XX' ? rawCountry : null;

    if (path === '/ai/health' && method === 'GET') {
      return reply({ service: 'iching-ai', version: AI_VERSION, region, ready: aiReady, countryCode, capabilities: ['iching', 'tarot'] }, aiReady ? 200 : 503);
    }

    if (['/', '/health'].includes(path) && method === 'GET') {
      return reply({ service: 'iching-appwrite-probe', version: VERSION, region,
        ready: region === 'sgp' && geminiConfigured && probeConfigured,
        geminiConfigured, probeConfigured, geminiVerified: false,
        interpretationAvailable: true, interpretationReady: aiReady, countryCode,
        checkedAt: new Date(now()).toISOString() });
    }
    if (!['/api/probe', '/api/interpret', '/api/interpret-test'].includes(path)) return reply({ error: 'not_found' }, 404);
    const publicRequest = path === '/api/interpret';
    if (method === 'OPTIONS') {
      const requested = String(headers['access-control-request-headers'] || '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
      if (!allowed || headers['access-control-request-method'] !== 'POST'
          || requested.some(value => !(publicRequest ? ['content-type'] : ['content-type', 'x-probe-token']).includes(value))) {
        return reply({ error: 'preflight_not_allowed' }, 403);
      }
      return reply(null, 204, { 'access-control-allow-methods': 'POST',
        'access-control-allow-headers': publicRequest ? 'Content-Type' : 'Content-Type, X-Probe-Token', 'access-control-max-age': '600' });
    }
    if (method !== 'POST') return reply({ error: 'method_not_allowed' }, 405, { allow: 'POST, OPTIONS' });
    if (publicRequest) {
      if (!allowed) return reply({ error: 'origin_not_allowed' }, 403);
      if (!aiReady) return reply({ error: 'service_unavailable' }, 503);
    } else {
      if (!geminiConfigured || !probeConfigured) return reply({ error: 'not_configured' }, 503);
      if (!matchesToken(headers['x-probe-token'], env.PROBE_TOKEN)) return reply({ error: 'invalid_probe_token' }, 401);
    }
    if (region !== 'sgp') return reply({ error: 'wrong_region', region }, 503);
    if (String(headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') {
      return reply({ error: 'json_required' }, 415);
    }
    const raw = req.bodyText;
    if (publicRequest) {
      const result = await interpret(raw, headers['x-appwrite-client-ip']);
      return reply(result.data, result.status, result.headers);
    }
    if (typeof raw !== 'string') return reply({ error: 'invalid_body' }, 400);
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return reply({ error: 'body_too_large' }, 413);
    try {
      const body = JSON.parse(raw);
      if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).length) throw new Error();
    } catch { return reply({ error: 'invalid_body' }, 400); }

    if (path === '/api/interpret-test') {
      // Test the full canonical reading without transmitting a visitor's question.
      const result = await interpret(JSON.stringify(TEST_INPUT), 'private-interpretation-test');
      return reply({ ...result.data, service: 'iching-ai', region, countryCode }, result.status, result.headers);
    }

    // Best-effort per-instance guard only, NOT a distributed quota. The private
    // high-entropy token is the pilot's actual access control. No public AI endpoint.
    if (busy || now() - lastProbeAt < 30_000) {
      return reply({ error: 'probe_cooldown' }, 429, { 'retry-after': '30' });
    }
    busy = true;
    lastProbeAt = now();
    const started = now();
    let signal;
    try {
      signal = timeoutSignal();
      const upstream = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST', redirect: 'manual', signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY.trim() },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: '这是一项网络连接测试。请只回复四个汉字：连接成功' }] }],
          generationConfig: { maxOutputTokens: 256, candidateCount: 1 } }),
      });
      if (!upstream.ok) {
        await upstream.body?.cancel().catch(() => {});
        return reply({ error: upstream.status === 429 ? 'provider_quota' : 'provider_unavailable',
          providerStatus: upstream.status, region }, upstream.status === 429 ? 429 : 502);
      }
      const data = await upstream.json();
      const candidate = data.candidates?.[0];
      const answer = candidate?.content?.parts?.filter(part => !part.thought && typeof part.text === 'string')
        .map(part => part.text).join('').trim();
      if (data.promptFeedback?.blockReason || candidate?.finishReason !== 'STOP' || !answer || answer.length > 1000) {
        return reply({ error: 'invalid_provider_response', region }, 502);
      }
      // The response never echoes provider content, request headers, prompts or secrets.
      return reply({ service: 'iching-appwrite-probe', version: VERSION, region, model: MODEL,
        geminiVerified: true, expectedReply: answer.replace(/[\s。.!！]/g, '') === '连接成功',
        elapsedMs: now() - started, checkedAt: new Date(now()).toISOString() });
    } catch {
      return reply({ error: signal?.aborted ? 'provider_timeout' : 'provider_unavailable', region }, signal?.aborted ? 504 : 502);
    } finally { busy = false; }
  };
}

export default createHandler();
