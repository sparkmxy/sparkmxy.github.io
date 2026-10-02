import {CARDS} from './cards.mjs';
// Local copies of the public-domain 1909 Roses & Lilies scans.
// Preserve the complete printed card; surrounding UI supplies bilingual names.
const imageRoot=new URL('./assets/rws-1909/',import.meta.url);
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function cardImageURL(id,variant='full') {
  if(id!=='back'&&(!Number.isInteger(id)||!CARDS[id]))throw new RangeError('Unknown card');
  if(!['full','thumb'].includes(variant))throw new RangeError('Unknown image variant');
  const stem=id==='back'?'back':String(id).padStart(2,'0');
  return new URL(`${stem}${variant==='thumb'?'-thumb':''}.webp`,imageRoot).href;
}
function image(id,title,{loading='lazy',sizes='(max-width: 740px) 26vw, 140px',priority='auto'}={}) {
  const full=cardImageURL(id),thumb=cardImageURL(id,'thumb');
  return `<img class="rws-card" data-card-id="${id}" src="${full}" srcset="${thumb} 320w, ${full} 720w" sizes="${escape(sizes)}" width="720" height="1247" alt="" aria-hidden="true" title="${escape(title)}" loading="${loading==='eager'?'eager':'lazy'}" decoding="async" fetchpriority="${priority==='high'?'high':'auto'}">`;
}
export function cardArt(id,lang='en',options) {
  const card=Number.isInteger(id)?CARDS[id]:null;
  return card?image(id,card.name[lang]||card.name.en,options):'';
}
export function cardBack() { return image('back','',{loading:'eager',sizes:'(max-width: 740px) 100px, 116px'}); }
