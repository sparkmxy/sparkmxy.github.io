import { validateAIInput } from './ai-prompt.mjs';

const errors = {
  400: '本次卦象资料不完整，请重新起卦后再试。',
  403: '当前网站尚未获准使用解卦服务，请联系站点维护者。',
  404: 'AI 解卦接口地址有误，请联系站点维护者。',
  413: '提问内容过长，请缩短后再试。',
  422: 'Gemini 未能生成本次解读，请稍后再试或调整提问。',
  429: '请求较多或 Gemini 额度暂时不足，请稍后再试。',
  502: 'Gemini 暂时无法完成解读，请稍后再试。',
  503: 'AI 解卦服务尚未就绪，请稍后再试。',
  504: '本次解读等待超时，请稍后重试。',
};

export function getAIEndpoint(endpoint) {
  if (!endpoint) throw new Error('AI 解卦尚未开放，待站点完成服务配置后即可使用。');
  let url;
  try { url = new URL(endpoint); } catch { throw new Error('AI 解卦接口配置有误。'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash) {
    throw new Error('AI 解卦接口配置有误。');
  }
  return url.href;
}

export async function requestInterpretation(record, { endpoint, signal, timeoutMs = 65_000 } = {}) {
  const url = getAIEndpoint(endpoint);
  const input = validateAIInput({ question: record.question, values: record.lines.map(line => line.value) });
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const response = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
      body: JSON.stringify(input), signal: combined,
    });
    if (!response.ok) throw new Error(errors[response.status] || '解卦服务暂时不可用，请稍后再试。');
    let result;
    try { result = await response.json(); } catch { throw new Error('解卦服务返回内容异常，请稍后再试。'); }
    if (typeof result?.text !== 'string' || !result.text.trim() || result.text.length > 16_000
        || typeof result.model !== 'string' || result.model.length > 100 || typeof result.truncated !== 'boolean') {
      throw new Error('解卦服务返回内容异常，请稍后再试。');
    }
    return { text: result.text.trim(), model: result.model, truncated: result.truncated };
  } catch (error) {
    if (signal?.aborted) throw signal.reason;
    if (timeout.aborted) throw new Error(errors[504]);
    if (error instanceof TypeError) throw new Error('无法连接 AI 解卦服务，请检查网络后重试。');
    throw error;
  }
}
