import { buildInterpretationPrompt, validateAIInput, CAPABILITIES } from '../../divination/prompt.mjs';

const MAX_BODY_BYTES = 4096;
const UPSTREAM_TIMEOUT_MS = 55_000;

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(value => {
    try { return ['http:', 'https:'].includes(new URL(value).protocol) && new URL(value).origin === value; }
    catch { return false; }
  });
}

function ready(env) {
  return Boolean(env.GEMINI_API_KEY?.trim() && /^gemini-[a-z0-9.-]+$/.test(env.GEMINI_MODEL || '')
    && allowedOrigins(env).length && env.AI_RATE_LIMITER?.limit && env.AI_GLOBAL_LIMITER?.limit);
}

function json(data, status, origin, extra = {}) {
  return new Response(data === null ? null : JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', Vary: 'Origin',
      ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}), ...extra,
    },
  });
}

async function readLimitedJSON(request) {
  if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES) throw new RangeError();
  if (!request.body) throw new SyntaxError();
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0, text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new RangeError(); }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}

async function interpret(request, env, origin) {
  if (!ready(env)) return json({ error: 'service_unavailable' }, 503, origin);
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'json_required' }, 415, origin);
  }
  let input;
  try { input = validateAIInput(await readLimitedJSON(request)); }
  catch (error) { return json({ error: error instanceof RangeError ? 'body_too_large' : 'invalid_input' }, error instanceof RangeError ? 413 : 400, origin); }

  // Cloudflare supplies this header. Never use a browser-provided user ID as a
  // rate-limit key. Shared IPs share this small anonymous site's allowance.
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const perIP = await env.AI_RATE_LIMITER.limit({ key: `interpret:${ip}` });
  if (!perIP.success) return json({ error: 'rate_limited' }, 429, origin, { 'Retry-After': '60' });
  const global = await env.AI_GLOBAL_LIMITER.limit({ key: 'interpret:all' });
  if (!global.success) return json({ error: 'rate_limited' }, 429, origin, { 'Retry-After': '60' });

  const { system, prompt, version } = buildInterpretationPrompt(input);
  const timeout = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  let upstream;
  let phase = 'request';
  try {
    upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`, {
      // Workers supports follow/manual only. Refuse all 3xx via the !ok check
      // below, so the Gemini key is never forwarded to a redirect destination.
      method: 'POST', redirect: 'manual', signal: AbortSignal.any([request.signal, timeout]),
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY.trim() },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096, candidateCount: 1 },
      }),
    });
    phase = 'response';
    if (!upstream.ok) {
      await upstream.body?.cancel().catch(() => {});
      const status = upstream.status === 429 ? 429 : [400, 401, 403, 404].includes(upstream.status) ? 503 : 502;
      return json({ error: status === 429 ? 'provider_quota' : 'provider_unavailable', providerStatus: upstream.status }, status, origin);
    }
    const data = await upstream.json();
    const candidate = data.candidates?.[0];
    if (data.promptFeedback?.blockReason || !['STOP', 'MAX_TOKENS'].includes(candidate?.finishReason)) {
      return json({ error: 'no_interpretation' }, 422, origin);
    }
    const text = candidate.content?.parts?.filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('\n').trim();
    if (!text || text.length > 16_000) return json({ error: 'invalid_provider_response' }, 502, origin);
    return json({ text, model: env.GEMINI_MODEL, truncated: candidate.finishReason === 'MAX_TOKENS', promptVersion: version }, 200, origin);
  } catch (error) {
    // No prompts, API keys, raw provider responses or exceptions in logs/results.
    // Only fixed diagnostic categories, never the exception message itself.
    const category = ['TypeError', 'SyntaxError', 'AbortError'].includes(error?.name) ? error.name : 'Error';
    return json({ error: timeout.aborted ? 'provider_timeout' : 'provider_unavailable', phase, category }, timeout.aborted ? 504 : 502, origin);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowed = allowedOrigins(env).includes(origin);
    if (url.pathname === '/health' && request.method === 'GET') {
      const configured = ready(env);
      const country = request.cf?.country;
      const countryCode = typeof country === 'string' && /^[A-Z]{2}$/.test(country) && country !== 'XX' ? country : null;
      return json({ service: 'iching-ai', ready: configured, capabilities: CAPABILITIES, countryCode }, configured ? 200 : 503, allowed ? origin : null);
    }
    if (url.pathname !== '/api/interpret') return json({ error: 'not_found' }, 404, allowed ? origin : null);
    if (!allowed) return json({ error: 'origin_not_allowed' }, 403, null);
    if (request.method === 'OPTIONS') {
      const headers = (request.headers.get('Access-Control-Request-Headers') || '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
      if (request.headers.get('Access-Control-Request-Method') !== 'POST' || headers.some(value => value !== 'content-type')) {
        return json({ error: 'preflight_not_allowed' }, 403, origin);
      }
      return json(null, 204, origin, { 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' });
    }
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin, { Allow: 'POST, OPTIONS' });
    try { return await interpret(request, env, origin); }
    catch { return json({ error: 'service_unavailable' }, 503, origin); }
  },
};
