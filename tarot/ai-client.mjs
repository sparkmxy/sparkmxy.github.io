import {prepareAIReading} from './reading-request.mjs';
import {selectAIRoute} from '../iching/ai-routing.mjs';
import {getAIEndpoint} from '../iching/ai-client.mjs';
import {AI_ROUTES} from '../iching/ai-config.mjs';
export class AIError extends Error { constructor(code) { super(String(code)); this.code=String(code); } }
export async function requestTarot(raw,{endpoint,signal,timeoutMs=65000,fetchImpl=fetch}={}) {
  let input,url;
  try { input=prepareAIReading(raw); } catch(error) { throw new AIError(error.message==='QUESTION_LENGTH'?'QUESTION_LENGTH':400); }
  try { url=getAIEndpoint(endpoint); } catch { throw new AIError('CONFIG'); }
  const timeout=AbortSignal.timeout(timeoutMs);
  try {
    const response=await fetchImpl(url,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',
      body:JSON.stringify(input),signal:AbortSignal.any([timeout,...(signal?[signal]:[])])});
    if(!response.ok) throw new AIError(response.status);
    let data; try { data=await response.json(); } catch { throw new AIError('RESPONSE'); }
    if(typeof data?.text!=='string'||!data.text.trim()||data.text.length>16000||typeof data.model!=='string'||data.model.length>100||typeof data.truncated!=='boolean') throw new AIError('RESPONSE');
    return {text:data.text.trim(),model:data.model,truncated:data.truncated};
  } catch(error) {
    if(signal?.aborted) throw signal.reason;
    if(timeout.aborted) throw new AIError(504);
    if(error instanceof AIError) throw error;
    throw new AIError('NETWORK');
  }
}
export async function interpretTarot(reading,{signal,onStatus,countryCode,routes=AI_ROUTES,fetchImpl=fetch,healthTimeoutMs=10000}={}) {
  try { prepareAIReading(reading); } catch(error) { throw new AIError(error.message==='QUESTION_LENGTH'?'QUESTION_LENGTH':400); }
  onStatus?.({phase:'selecting'});
  let route;
  try { route=await selectAIRoute(routes,{signal,fetchImpl,timeoutMs:healthTimeoutMs,capability:'tarot',countryCode}); }
  catch { if(signal?.aborted) throw signal.reason; throw new AIError('ROUTE'); }
  if(signal?.aborted) throw signal.reason;
  onStatus?.({phase:'generating',route:route.id});
  // One generation per click. A lost response must not generate again elsewhere.
  const answer=await requestTarot(reading,{endpoint:route.endpoint,signal,fetchImpl,timeoutMs:route.id==='appwrite'?35000:65000});
  return {...answer,route:route.id};
}
