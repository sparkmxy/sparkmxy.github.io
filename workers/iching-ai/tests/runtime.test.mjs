import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Use the same workerd build as the pinned Wrangler, rather than Node's Fetch
// implementation: their supported Request options are not identical.
const require = createRequire(import.meta.url);
const wranglerRequire = createRequire(require.resolve('wrangler/package.json'));
const { Miniflare, convertV4MiniflareOptions } = wranglerRequire('miniflare');
const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));

test('bundled Worker runs in workerd, sends the canonical prompt and refuses redirects', async () => {
  let calls = 0;
  let providerStatus = 200;
  const mf = new Miniflare(convertV4MiniflareOptions({
    name: config.name, modules: true,
    scriptPath: fileURLToPath(new URL('../dist/worker.js', import.meta.url)),
    compatibilityDate: config.compatibility_date,
    bindings: { ...config.vars, GEMINI_API_KEY: 'runtime-test-placeholder' },
    ratelimits: Object.fromEntries(config.ratelimits.map(({ name, ...settings }) => [name, settings])),
    // Every outbound fetch is intercepted; this test never calls Google.
    outboundService: async request => {
      calls++;
      assert.equal(new URL(request.url).hostname, 'generativelanguage.googleapis.com');
      assert.equal(request.headers.get('x-goog-api-key'), 'runtime-test-placeholder');
      const body=await request.json();
      assert.match(body.contents[0].parts[0].text, calls===3 ? /The Magician/ : /水泽节/);
      if(calls===3)assert.match(body.systemInstruction.parts[0].text,/natural English/);
      if (providerStatus === 302) return new Response(null, { status: 302, headers: { Location: 'https://example.com/must-not-follow' } });
      return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '测试解读，仅用于运行时验证。' }] } }] });
    },
  }));
  try {
    assert.equal((await mf.dispatchFetch('http://localhost/health')).status, 200);
    const request = () => mf.dispatchFetch('http://localhost/api/interpret', {
      method: 'POST', headers: { Origin: 'https://sparkmxy.github.io', 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '测试问题', values: [9, 7, 8, 8, 7, 8] }),
    });
    const success = await request();
    const data = await success.json();
    assert.equal(success.status, 200, JSON.stringify(data));
    assert.equal(data.text, '测试解读，仅用于运行时验证。');
    assert.equal(data.truncated, false);
    providerStatus = 302;
    const redirect = await request();
    assert.equal(redirect.status, 502);
    assert.equal((await redirect.json()).providerStatus, 302);
    assert.equal(calls, 2);
    providerStatus=200;
    const tarot=await mf.dispatchFetch('http://localhost/api/interpret',{
      method:'POST',headers:{Origin:'https://sparkmxy.github.io','Content-Type':'application/json'},
      body:JSON.stringify({kind:'tarot',language:'en',question:'A new beginning?',spread:'single',cards:[{id:1,reversed:false}]}),
    });
    const tarotData=await tarot.json();assert.equal(tarot.status,200,JSON.stringify(tarotData));assert.equal(tarotData.promptVersion,'tarot-v1');assert.equal(calls,3);
  } finally { await mf.dispose(); }
});
