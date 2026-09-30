export function parseProbeEndpoint(value) {
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('请填写完整的 Appwrite HTTPS 地址。'); }
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.sgp\.appwrite\.run$/.test(url.hostname)
      || url.username || url.password || url.port || !['', '/'].includes(url.pathname) || url.search || url.hash) {
    throw new Error('请使用 Domains 中的 https://你的函数.sgp.appwrite.run 地址，不带路径、参数或口令。');
  }
  return url.origin;
}

const errors = {
  not_configured: '请先在 Appwrite 设置 GEMINI_API_KEY 和 PROBE_TOKEN，然后重新部署。',
  invalid_probe_token: '测试口令不匹配，请核对 PROBE_TOKEN；修改变量后需要重新部署。',
  wrong_region: '函数没有确认运行在 sgp。请核对项目地区为 Singapore。',
  origin_not_allowed: '当前检查页面的地址不在允许列表，请从本地预览页或正式网站打开。',
  preflight_not_allowed: '浏览器跨域检查未通过。',
  probe_cooldown: '刚刚运行过检查，请等 30 秒再试。',
  provider_quota: 'Gemini 返回了额度或频率限制。',
  provider_timeout: 'Appwrite 已连接，但 Gemini 未能在 20 秒内完成响应。',
  provider_unavailable: 'Appwrite 已连接，但 Gemini 调用失败，请检查密钥、模型权限或上游网络。',
  invalid_provider_response: 'Gemini 已响应，但没有返回完整的测试结果。',
};

export async function runProbeCheck(endpoint, { token, fetchImpl = fetch } = {}) {
  const base = parseProbeEndpoint(endpoint);
  const isGemini = token !== undefined;
  if (isGemini && !/^[A-Za-z0-9_-]{32,128}$/.test(token)) throw new Error('测试口令应为 32–128 位字母、数字、短横线或下划线。');
  const signal = AbortSignal.timeout(isGemini ? 35_000 : 20_000);
  let response;
  try {
    response = await fetchImpl(`${base}${isGemini ? '/api/probe' : `/health?t=${Date.now()}`}`, {
      method: isGemini ? 'POST' : 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store',
      redirect: 'error', referrerPolicy: 'no-referrer', signal,
      ...(isGemini ? { headers: { 'Content-Type': 'application/json', 'X-Probe-Token': token }, body: '{}' } : {}),
    });
  } catch {
    throw new Error(signal.aborted ? '连接超时。请检查网络，或稍后重试。' : '未能读取接口响应。可能是网络、跨域配置或函数尚未部署；这还不能单独证明被屏蔽。');
  }
  let data;
  try { data = await response.json(); } catch { throw new Error(`接口返回了非 JSON 内容（HTTP ${response.status}），请检查函数是否已激活。`); }
  if (!response.ok) {
    const message = errors[data?.error] || `接口检查失败（HTTP ${response.status}）。`;
    throw new Error(message + (Number.isInteger(data?.providerStatus) ? ` Gemini HTTP ${data.providerStatus}。` : ''));
  }
  if (data?.service !== 'iching-appwrite-probe' || data.version !== 'iching-appwrite-probe-v1') {
    throw new Error('返回内容不是这次部署的验证接口。');
  }
  if (data.region !== 'sgp') throw new Error('入口已连通，但函数未确认处于 Singapore（sgp）。');
  if (isGemini && data.geminiVerified !== true) throw new Error('接口未确认 Gemini 调用成功。');
  // Whitelist diagnostic fields. Neither arbitrary provider text nor a token is exported.
  return isGemini ? { region: data.region, geminiVerified: true, model: data.model,
    expectedReply: data.expectedReply === true, elapsedMs: data.elapsedMs, checkedAt: data.checkedAt }
    : { region: data.region, ready: data.ready === true, geminiConfigured: data.geminiConfigured === true,
      probeConfigured: data.probeConfigured === true, checkedAt: data.checkedAt,
      interpretationAvailable: data.interpretationAvailable === true,
      interpretationReady: data.interpretationReady === true, countryCode: data.countryCode || null };
}

export async function runInterpretationCheck(endpoint, { token, fetchImpl = fetch } = {}) {
  const base = parseProbeEndpoint(endpoint);
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token || '')) throw new Error('请填写与 Appwrite 一致的测试口令。');
  let response;
  try {
    response = await fetchImpl(`${base}/api/interpret-test`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Probe-Token': token }, body: '{}',
      mode: 'cors', credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(35_000),
    });
  } catch { throw new Error('完整解卦连接失败或超时，请检查网络。'); }
  let data;
  try { data = await response.json(); } catch { throw new Error('接口没有返回有效结果，请确认已上传新版部署包。'); }
  if (!response.ok) {
    if (data?.error === 'provider_timeout') throw new Error('完整解卦超过 23 秒，请暂勿开启公开线路；需要进一步调整。');
    throw new Error(errors[data?.error] || `完整解卦测试失败（HTTP ${response.status}）。`);
  }
  if (data?.service !== 'iching-ai' || data.version !== 'iching-appwrite-ai-v1' || data.region !== 'sgp'
      || typeof data.text !== 'string' || !data.text.trim() || data.text.length > 16_000
      || typeof data.truncated !== 'boolean' || typeof data.model !== 'string'
      || !Number.isFinite(data.elapsedMs) || data.elapsedMs < 0) throw new Error('完整解卦返回内容异常。');
  return { text: data.text, model: data.model, truncated: data.truncated, elapsedMs: data.elapsedMs,
    version: data.version, countryCode: data.countryCode || null };
}
