import { getAIEndpoint, requestInterpretation } from './ai-client.mjs';

// Health checks contain no question/hexagram and do not call Gemini. The Appwrite
// country hint reflects the network's exit point, not the user's actual location.
export async function selectAIRoute(routes, { signal, fetchImpl = fetch, timeoutMs = 10_000, capability, countryCode } = {}) {
  if (signal?.aborted) throw signal.reason;
  for (const route of Object.values(routes)) {
    if (!route?.endpoint || !route?.health) continue;
    if (new URL(getAIEndpoint(route.endpoint)).origin !== new URL(getAIEndpoint(route.health)).origin) {
      throw new Error('AI 线路配置有误。');
    }
  }
  const controllers = [];
  async function check(route) {
    if (!route?.endpoint || !route?.health) return null;
    const endpoint = getAIEndpoint(route.endpoint);
    const health = getAIEndpoint(route.health);
    const controller = new AbortController(); controllers.push(controller);
    try {
      const response = await fetchImpl(health, { method: 'GET', credentials: 'omit', cache: 'no-store',
        redirect: 'error', referrerPolicy: 'no-referrer',
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])]) });
      if (!response.ok) return null;
      const data = await response.json();
      if (data?.service !== 'iching-ai' || data.ready !== true) return null;
      if (capability && (!Array.isArray(data.capabilities) || !data.capabilities.includes(capability))) return null;
      if (route.id === 'appwrite' && (data.region !== 'sgp' || data.version !== 'iching-appwrite-ai-v1')) return null;
      return { ...route, endpoint, countryCode: data.countryCode };
    } catch { return null; }
  }
  try {
    // Catch both eagerly; a losing check must never leave an unhandled rejection.
    let aw = null, cf = null;
    const cloudflare = check(routes.cloudflare).then(result => { cf = result; return 'cloudflare'; });
    const appwrite = check(routes.appwrite).then(result => { aw = result; return 'appwrite'; });
    const first = await Promise.race([cloudflare, appwrite]);
    if (countryCode === 'CN') await appwrite;
    const knownOutsideChina = aw && /^[A-Z]{2}$/.test(aw.countryCode || '') && !['CN', 'XX'].includes(aw.countryCode);
    // Missing country metadata is common on generated Appwrite domains. In that
    // case a reachable route is usable immediately; do not wait for a blocked peer.
    if (!cf && !(aw && !knownOutsideChina)) {
      await (first === 'appwrite' ? cloudflare : appwrite);
    }
    if (signal?.aborted) throw signal.reason;
    const chosen = (countryCode === 'CN' || aw?.countryCode === 'CN') && aw ? aw : cf || aw;
    if (!chosen) throw new Error('暂时无法连接 AI 解卦线路，请检查网络后重试。');
    return chosen;
  } finally { controllers.forEach(controller => controller.abort()); }
}

export function createRoutedInterpretation(routes, { fetchImpl = fetch, request = requestInterpretation,
  healthTimeoutMs = 10_000 } = {}) {
  return async function routedInterpretation(record, { signal, onStatus } = {}) {
    onStatus?.('正在选择可用的解卦线路…');
    const route = await selectAIRoute(routes, { signal, fetchImpl, timeoutMs: healthTimeoutMs });
    if (signal?.aborted) throw signal.reason;
    onStatus?.(`正在结合所问之事与卦象解读 · ${route.label}`);
    // Exactly one generation per click. Retrying a failed POST on another provider
    // can duplicate a generation whose response was lost, or bypass quota limits.
    const answer = await request(record, { endpoint: route.endpoint, signal,
      timeoutMs: route.id === 'appwrite' ? 35_000 : 65_000 });
    return { ...answer, route: route.label };
  };
}
