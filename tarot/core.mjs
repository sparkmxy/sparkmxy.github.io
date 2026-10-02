import { SPREADS } from './cards.mjs';

export function secureInt(max, cryptoImpl=globalThis.crypto) {
  if (!Number.isInteger(max)||max<1||max>2**32) throw new RangeError('Invalid random bound');
  if (!cryptoImpl?.getRandomValues) throw new Error('RANDOM_UNAVAILABLE');
  const limit=Math.floor(2**32/max)*max, buffer=new Uint32Array(1);
  for(let i=0;i<1024;i++) { cryptoImpl.getRandomValues(buffer); if(buffer[0]<limit) return buffer[0]%max; }
  throw new Error('RANDOM_UNAVAILABLE');
}
export function shuffleDeck({reversals=true,drawInt=secureInt}={}) {
  const pick=max=>{const value=drawInt(max);if(!Number.isInteger(value)||value<0||value>=max)throw new Error('RANDOM_UNAVAILABLE');return value;};
  const ids=Array.from({length:78},(_,i)=>i);
  for(let i=ids.length-1;i>0;i--) { const j=pick(i+1); [ids[i],ids[j]]=[ids[j],ids[i]]; }
  return ids.map(id=>({id,reversed:reversals?pick(2)===1:false}));
}
export function validateReading(input) {
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['kind','language','question','spread','cards'].includes(key))
    ||input.kind!=='tarot'||!['zh','en'].includes(input.language)||typeof input.question!=='string'||input.question.length>200
    ||typeof input.spread!=='string'||!Object.hasOwn(SPREADS,input.spread)||!Array.isArray(input.cards)||input.cards.length!==SPREADS[input.spread].count
    ||input.cards.some(card=>!card||typeof card!=='object'||Array.isArray(card)||Object.keys(card).sort().join(',')!=='id,reversed'
      ||!Number.isInteger(card.id)||card.id<0||card.id>77||typeof card.reversed!=='boolean')
    ||new Set(input.cards.map(card=>card.id)).size!==input.cards.length) throw new TypeError('INVALID_READING');
  return {kind:'tarot',language:input.language,question:input.question.trim(),spread:input.spread,cards:input.cards.map(card=>({...card}))};
}
