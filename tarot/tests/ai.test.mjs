import test from 'node:test';
import assert from 'node:assert/strict';
import {requestTarot,interpretTarot} from '../ai-client.mjs';
import {AI_ROUTES} from '../../iching/ai-config.mjs';
import {prepareAIReading} from '../reading-request.mjs';
import worker from '../../workers/iching-ai/worker.mjs';
import {createHandler} from '../../appwrite/iching-probe/src/main.js';
const input={kind:'tarot',language:'en',question:'How can I learn?',spread:'single',cards:[{id:1,reversed:false}]};
const origin='https://sparkmxy.github.io';
const result={text:'A reflective reading.',model:'gemini-test',truncated:false};
const provider=()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:result.text}]}}]});
test('Cloudflare and Appwrite share canonical tarot prompts and retain server-only keys',async t=>{
  const upstream=async(_url,options)=>{
    assert.equal(options.headers['x-goog-api-key'],'test-only-secret');assert.equal(options.redirect,'manual');
    const body=JSON.parse(options.body),data=JSON.parse(body.contents[0].parts[0].text);
    assert.equal(data.cards[0].card,'The Magician');assert.match(body.systemInstruction.parts[0].text,/natural English/);return provider();
  };
  t.mock.method(globalThis,'fetch',upstream);
  const cf=await worker.fetch(new Request('https://test/api/interpret',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(input)}),
    {GEMINI_API_KEY:'test-only-secret',GEMINI_MODEL:'gemini-test',ALLOWED_ORIGINS:origin,AI_RATE_LIMITER:{limit:async()=>({success:true})},AI_GLOBAL_LIMITER:{limit:async()=>({success:true})}});
  assert.equal(cf.status,200);assert.equal((await cf.json()).promptVersion,'tarot-v1');
  const handler=createHandler({env:{APPWRITE_REGION:'sgp',PUBLIC_AI_ENABLED:'true',GEMINI_API_KEY:'test-only-secret'},fetchImpl:upstream});
  const call=req=>handler({req,res:{text:(body,status)=>({data:JSON.parse(body),status})}});
  const aw=await call({method:'POST',path:'/api/interpret',headers:{origin,'content-type':'application/json'},bodyText:JSON.stringify(input)});
  assert.equal(aw.status,200);assert.equal(aw.data.promptVersion,'tarot-v1');assert.doesNotMatch(JSON.stringify(aw),/test-only-secret/);
  const health=await call({method:'GET',path:'/ai/health',headers:{origin}});assert.deepEqual(health.data.capabilities,['iching','tarot']);
});
test('tarot skips an older Appwrite deployment and sends exactly one canonical POST',async()=>{
  let posts=0;const answer=await interpretTarot(input,{routes:AI_ROUTES,fetchImpl:async(url,options)=>{
    if(options.method==='GET')return Response.json(url.includes('appwrite')?{service:'iching-ai',ready:true,region:'sgp',version:'iching-appwrite-ai-v1'}:{service:'iching-ai',ready:true,capabilities:['iching','tarot']});
    posts++;assert.ok(url.includes('workers.dev'));assert.deepEqual(JSON.parse(options.body),prepareAIReading(input));return Response.json(result);
  }});assert.equal(posts,1);assert.equal(answer.route,'cloudflare');
});
test('attribute focus reaches the existing canonical server without a new schema or edited question',async t=>{
  let generated=0;
  const originalQuestion=input.question;
  t.mock.method(globalThis,'fetch',async(_url,options)=>{
    generated++;
    const data=JSON.parse(JSON.parse(options.body).contents[0].parts[0].text);
    assert.ok(data.question.startsWith(originalQuestion));assert.match(data.question,/elements.*numbers\/courts.*Golden Dawn astrology/);
    assert.equal(data.cards[0].card,'The Magician');return provider();
  });
  const env={GEMINI_API_KEY:'test-only-secret',GEMINI_MODEL:'gemini-test',ALLOWED_ORIGINS:origin,AI_RATE_LIMITER:{limit:async()=>({success:true})},AI_GLOBAL_LIMITER:{limit:async()=>({success:true})}};
  const answer=await requestTarot(input,{endpoint:AI_ROUTES.cloudflare.endpoint,fetchImpl:(url,options)=>worker.fetch(new Request(url,{...options,headers:{...options.headers,Origin:origin}}),env)});
  assert.equal(answer.text,result.text);assert.equal(generated,1);assert.equal(input.question,originalQuestion);
});
test('known mainland IP selects upgraded Appwrite; quota failure never triggers another generation',async()=>{
  let posts=0;
  await assert.rejects(interpretTarot(input,{routes:AI_ROUTES,countryCode:'CN',fetchImpl:async(url,options)=>{
    if(options.method==='GET')return Response.json({service:'iching-ai',ready:true,region:'sgp',version:'iching-appwrite-ai-v1',capabilities:['iching','tarot']});
    posts++;assert.ok(url.includes('appwrite'));return Response.json({error:'quota'},{status:429});
  }}),error=>error.code==='429');assert.equal(posts,1);
});
test('unsupported routes never call Gemini; invalid responses and cancellation are recognised',async()=>{
  await assert.rejects(interpretTarot(input,{fetchImpl:async(_url,options)=>{assert.equal(options.method,'GET');return Response.json({service:'iching-ai',ready:true,region:'sgp',version:'iching-appwrite-ai-v1'});}}),error=>error.code==='ROUTE');
  await assert.rejects(requestTarot(input,{endpoint:AI_ROUTES.cloudflare.endpoint,fetchImpl:async()=>Response.json({...result,text:''})}),error=>error.code==='RESPONSE');
  const controller=new AbortController();controller.abort();
  await assert.rejects(interpretTarot(input,{signal:controller.signal,fetchImpl:()=>assert.fail('already aborted')}),error=>error.name==='AbortError');
});
