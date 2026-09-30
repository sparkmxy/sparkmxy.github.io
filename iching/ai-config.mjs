// Public addresses only. Keys remain in each backend's Secret variables.
export const AI_ENDPOINT = 'https://iching-ai.iching-ai-worker.workers.dev/api/interpret';
export const AI_ROUTES = Object.freeze({
  cloudflare: { id: 'cloudflare', label: 'Cloudflare', endpoint: AI_ENDPOINT,
    health: 'https://iching-ai.iching-ai-worker.workers.dev/health' },
  appwrite: { id: 'appwrite', label: '新加坡线路',
    endpoint: 'https://iching-probe.sgp.appwrite.run/api/interpret',
    health: 'https://iching-probe.sgp.appwrite.run/ai/health' },
});
