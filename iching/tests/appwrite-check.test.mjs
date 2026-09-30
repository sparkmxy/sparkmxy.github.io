import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProbeEndpoint, runProbeCheck, runInterpretationCheck } from '../appwrite-check-client.mjs';

const endpoint = 'https://example.sgp.appwrite.run';
const token = 't'.repeat(64);
const goodHealth = { service: 'iching-appwrite-probe', version: 'iching-appwrite-probe-v1',
  region: 'sgp', ready: true, geminiConfigured: true, probeConfigured: true };

test('full interpretation test submits no user input and whitelists the response', async () => {
  const result = await runInterpretationCheck(endpoint, { token, fetchImpl: async (url, options) => {
    assert.equal(url, `${endpoint}/api/interpret-test`); assert.equal(options.body, '{}');
    assert.equal(options.headers['X-Probe-Token'], token);
    return Response.json({ service: 'iching-ai', version: 'iching-appwrite-ai-v1', region: 'sgp',
      text: '完整解读', model: 'gemini-test', truncated: false, elapsedMs: 3000, token });
  } });
  assert.equal(result.text, '完整解读'); assert.equal(result.elapsedMs, 3000);
  assert.equal(result.token, undefined);
  await assert.rejects(runInterpretationCheck(endpoint, { token, fetchImpl: async () => Response.json(goodHealth) }));
});

test('diagnostic page accepts only a Singapore Appwrite HTTPS origin', () => {
  assert.equal(parseProbeEndpoint(`${endpoint}/`), endpoint);
  for (const bad of ['http://example.sgp.appwrite.run', 'https://example.sgp.appwrite.run.evil.test',
    'https://example.fra.appwrite.run', `${endpoint}/api/probe`, `${endpoint}?token=secret`, `${endpoint}#secret`,
    'https://user:pass@example.sgp.appwrite.run', 'https://example.sgp.appwrite.run:444']) {
    assert.throws(() => parseProbeEndpoint(bad));
  }
});

test('health sends no credential and does not count as Gemini verification', async () => {
  const result = await runProbeCheck(endpoint, { fetchImpl: async (url, options) => {
    assert.match(url, /\/health\?t=\d+$/);
    assert.equal(options.method, 'GET');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.headers, undefined);
    return Response.json({ ...goodHealth, unexpected: 'never-export' });
  } });
  assert.equal(result.ready, true);
  assert.equal(result.geminiVerified, undefined);
  assert.equal(result.unexpected, undefined);
});

test('Gemini test sends only a header token and fixed empty JSON to the validated host', async () => {
  const result = await runProbeCheck(endpoint, { token, fetchImpl: async (url, options) => {
    assert.equal(url, `${endpoint}/api/probe`);
    assert.equal(options.headers['X-Probe-Token'], token);
    assert.equal(options.body, '{}');
    assert.equal(options.redirect, 'error');
    return Response.json({ ...goodHealth, geminiVerified: true, expectedReply: true, secret: token });
  } });
  assert.equal(result.geminiVerified, true);
  assert.doesNotMatch(JSON.stringify(result), /tttttt/);
});

test('wrong deployments, non-JSON, provider errors and network failures remain failures', async () => {
  for (const makeResponse of [() => Response.json({}), () => Response.json({ ...goodHealth, region: 'fra' }),
    () => new Response('sign-in page'), () => Response.json({ error: 'provider_unavailable', providerStatus: 403 }, { status: 502 })]) {
    await assert.rejects(runProbeCheck(endpoint, { fetchImpl: async () => makeResponse() }));
  }
  await assert.rejects(runProbeCheck(endpoint, { fetchImpl: async () => { throw new Error('private internal message'); } }), error => !error.message.includes('private'));
  await assert.rejects(runProbeCheck(endpoint, { token, fetchImpl: async () => Response.json(goodHealth) }));
});
