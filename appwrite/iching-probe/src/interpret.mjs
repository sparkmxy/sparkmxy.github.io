import { createHash } from 'node:crypto';
import { buildInterpretationPrompt, validateAIInput } from '../../../divination/prompt.mjs';

export const AI_VERSION = 'iching-appwrite-ai-v1';
export const MODEL = 'gemini-3.5-flash-lite';
export const TEST_INPUT = Object.freeze({ question: '面对新的合作机会，我应如何稳妥推进？', values: [9, 7, 8, 8, 7, 8] });

// Secondary, per-instance protection. Appwrite Firewall supplies the public
// per-IP limit across instances. Neither is a hard global billing cap.
export function createInstanceLimiter(now = Date.now) {
  const clients = new Map();
  let window = -1, total = 0, active = 0;
  return function acquire(ip) {
    const current = Math.floor(now() / 60_000);
    if (current !== window) { window = current; total = 0; clients.clear(); }
    const key = createHash('sha256').update(String(ip || 'unknown')).digest('hex');
    const count = clients.get(key) || 0;
    if (count >= 3 || total >= 20 || active >= 2) return null;
    clients.set(key, count + 1); total++; active++;
    return () => { active--; };
  };
}

export function createInterpreter({ env = process.env, fetchImpl = fetch, now = Date.now,
  timeoutSignal = () => AbortSignal.timeout(23_000) } = {}) {
  const acquire = createInstanceLimiter(now);
  return async function interpret(raw, ip) {
    let input;
    if (typeof raw !== 'string') return { status: 400, data: { error: 'invalid_input' } };
    if (Buffer.byteLength(raw, 'utf8') > 4096) return { status: 413, data: { error: 'body_too_large' } };
    try { input = validateAIInput(JSON.parse(raw)); }
    catch { return { status: 400, data: { error: 'invalid_input' } }; }
    const release = acquire(ip);
    if (!release) return { status: 429, data: { error: 'rate_limited' }, headers: { 'retry-after': '60' } };
    const started = now();
    let signal;
    try {
      signal = timeoutSignal();
      const { system, prompt, version } = buildInterpretationPrompt(input);
      const upstream = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST', redirect: 'manual', signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY.trim() },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4096, candidateCount: 1 } }),
      });
      if (!upstream.ok) {
        await upstream.body?.cancel().catch(() => {});
        const status = upstream.status === 429 ? 429 : [400, 401, 403, 404].includes(upstream.status) ? 503 : 502;
        return { status, data: { error: status === 429 ? 'provider_quota' : 'provider_unavailable', providerStatus: upstream.status } };
      }
      const data = await upstream.json();
      const candidate = data.candidates?.[0];
      if (data.promptFeedback?.blockReason || !['STOP', 'MAX_TOKENS'].includes(candidate?.finishReason)) {
        return { status: 422, data: { error: 'no_interpretation' } };
      }
      const text = candidate.content?.parts?.filter(part => !part.thought && typeof part.text === 'string')
        .map(part => part.text).join('\n').trim();
      if (!text || text.length > 16_000) return { status: 502, data: { error: 'invalid_provider_response' } };
      return { status: 200, data: { text, model: MODEL, truncated: candidate.finishReason === 'MAX_TOKENS',
        promptVersion: version, elapsedMs: now() - started, version: AI_VERSION } };
    } catch {
      return { status: signal?.aborted ? 504 : 502,
        data: { error: signal?.aborted ? 'provider_timeout' : 'provider_unavailable' } };
    } finally { release(); }
  };
}
