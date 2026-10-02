import {CARDS,SPREADS} from './cards.mjs';
import {shuffleDeck,validateReading} from './core.mjs';
import {cardArt,cardBack,cardImageURL} from './art.mjs';
import {TEXT,translate} from './i18n.mjs';
import {browserLanguage,storedLanguage,lookupCountry,languageForCountry} from './locale.mjs';
import {interpretTarot} from './ai-client.mjs';
import {getCardKnowledge,summariseAttributes,KNOWLEDGE_SOURCES} from './knowledge.mjs';
import {QUESTION_LIMIT} from './reading-request.mjs';
import {makeExportSnapshot,renderReadingImage} from './image-export.mjs';

const $=id=>document.getElementById(id);
document.querySelector('.hero-copy .eyebrow').dataset.i18n='heroEyebrow';
document.querySelector('#result .section-no').dataset.i18n='resultEyebrow';
document.querySelector('.ai-top .eyebrow').dataset.i18n='aiEyebrow';
document.querySelector('.language-switch').dataset.i18nAria='language';
let storage; try { storage=localStorage; } catch { /* Private browsers may block storage. */ }
const manual=storedLanguage(storage);
const state={lang:manual||browserLanguage(),manual:!!manual,source:manual?'manual':'browser',country:null,
  spread:'three',filter:'all',deck:[],draws:[],pending:null,reading:null,dialogCard:null,
  ai:null,aiPhase:null,aiRoute:null,aiError:null,aiResult:null,saved:false};
const t=(key,values)=>translate(state.lang,key,values);
function el(tag,className,text) { const node=document.createElement(tag); if(className)node.className=className; if(text!==undefined)node.textContent=text; return node; }
function artFrame(id,reversed=false,className='card-frame') {
  const node=el('div',`${className}${reversed?' reversed':''}`);
  node.innerHTML=cardArt(id,state.lang,className==='dialog-art'?{loading:'eager',sizes:'(max-width: 740px) 220px, 270px'}:undefined);return node;
}
function formatDate(value) { return new Intl.DateTimeFormat(state.lang==='zh'?'zh-CN':'en',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)); }
let toastTimer;
function toast(key) { $('toast').textContent=t(key); $('toast').hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').hidden=true,2800); }
function applyLanguage() {
  document.documentElement.lang=state.lang==='zh'?'zh-CN':'en'; document.title=t('title');
  document.querySelector('meta[name=description]').content=t('description');
  document.querySelectorAll('[data-i18n]').forEach(node=>node.textContent=t(node.dataset.i18n));
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node=>node.placeholder=t(node.dataset.i18nPlaceholder));
  document.querySelectorAll('[data-i18n-aria]').forEach(node=>node.setAttribute('aria-label',t(node.dataset.i18nAria)));
  for(const lang of ['zh','en']) $(`lang-${lang}`).setAttribute('aria-pressed',String(lang===state.lang));
  $('language-source').textContent=t(`source${state.source==='ip'?'IP':state.source==='manual'?'Manual':'Browser'}`,{country:state.country});
  $('hero-card-left').innerHTML=cardArt(17,state.lang,{loading:'eager',sizes:'145px'});
  $('hero-card-right').innerHTML=cardArt(21,state.lang,{loading:'eager',sizes:'145px'});
  $('hero-card-center').innerHTML=cardArt(2,state.lang,{loading:'eager',sizes:'155px',priority:'high'});
  renderOptions(); renderTable(); renderReading(); renderLibrary(); renderAI();
  if($('card-dialog').open && state.dialogCard!==null) renderCardDialog(state.dialogCard);
  if($('history-dialog').open) renderHistory();
  $('form-error').textContent=$('form-error').hidden?'':t('randomError');
  $('save-status').textContent=state.saved?t('saved'):'';
  $('toast').hidden=true;
}
function setLanguage(lang) {
  if(!['zh','en'].includes(lang))return;
  state.manual=true; state.source='manual'; try { storage?.setItem('tarot-language',lang); } catch { /* Choice still applies for this page. */ }
  if(state.lang!==lang) { clearAI(); state.lang=lang; }
  applyLanguage();
}
function renderOptions() {
  $('spread-options').replaceChildren();
  for(const [key,spread] of Object.entries(SPREADS)) {
    const label=el('label','spread-option');
    const radio=el('input'); radio.type='radio';radio.name='spread';radio.value=key;radio.checked=state.spread===key;
    const copy=el('span');copy.append(el('strong','',spread.name[state.lang]),el('small','',spread.hint[state.lang]));
    label.append(radio,copy);$('spread-options').append(label);
  }
}
function renderTable() {
  const active=!!state.pending,complete=!!state.reading,spread=SPREADS[state.pending?.spread||state.reading?.spread||state.spread];
  const draws=complete?state.reading.cards:state.draws;
  $('empty-table').hidden=active||complete;
  $('spread-slots').hidden=!(active||complete);$('pick-area').hidden=!active;$('reading-actions').hidden=!complete;
  $('draw-count').textContent=active||complete?t('drawProgress',{drawn:draws.length,total:spread.count}):'—';
  $('draw-status').textContent=active?t('chooseNext',{number:draws.length+1,position:spread.positions[state.lang][draws.length]}):complete?t('drawComplete'):'';
  $('spread-slots').replaceChildren();
  if(active||complete) for(let i=0;i<spread.count;i++) {
    const slot=el('div','spread-slot');slot.append(el('span','slot-number',String(i+1)));
    const draw=draws[i];
    if(draw) {
      const button=el('button','drawn-card');button.type='button';button.setAttribute('aria-label',`${CARDS[draw.id].name[state.lang]} · ${t(draw.reversed?'reversed':'upright')}`);
      button.append(artFrame(draw.id,draw.reversed));button.addEventListener('click',()=>openCard(draw.id));slot.append(button);
      slot.append(el('small','orientation',t(draw.reversed?'reversed':'upright')));
      slot.append(el('span','name',CARDS[draw.id].name[state.lang]));
    } else { const frame=el('div','card-frame slot-empty');frame.innerHTML=cardBack();slot.append(frame); }
    slot.append(el('span','slot-label',spread.positions[state.lang][i]));$('spread-slots').append(slot);
  }
  $('deck-fan').replaceChildren();
  if(active) {
    const count=Math.min(13,state.deck.length);
    for(let i=0;i<count;i++) {
      const card=el('button','deck-pick');card.type='button';card.style.setProperty('--rotation',`${(i-(count-1)/2)*2}deg`);
      card.setAttribute('aria-label',t('pickCard',{number:i+1}));card.innerHTML=cardBack();card.addEventListener('click',()=>pickCard(i));$('deck-fan').append(card);
    }
  }
}
function clearAI() {
  state.ai?.abort();state.ai=null;state.aiPhase=null;state.aiRoute=null;state.aiError=null;state.aiResult=null;
  $('ai-answer').textContent='';$('ai-panel').hidden=true;$('ai-partial').hidden=true;$('ai-start').disabled=false;
}
function begin(event) {
  event?.preventDefault();clearAI();$('form-error').hidden=true;
  try { state.deck=shuffleDeck({reversals:$('reversals').checked}); }
  catch { $('form-error').textContent=t('randomError');$('form-error').hidden=false;return; }
  state.pending={question:$('question').value.trim(),spread:state.spread,createdAt:new Date().toISOString(),id:crypto.randomUUID()};
  state.draws=[];state.reading=null;state.saved=false;$('save-status').textContent='';renderTable();renderReading();
}
function pickCard(index) {
  if(!state.pending||index<0||index>=state.deck.length)return;
  state.draws.push(state.deck.splice(index,1)[0]);
  if(state.draws.length===SPREADS[state.pending.spread].count) {
    const input=validateReading({kind:'tarot',language:state.lang,question:state.pending.question,spread:state.pending.spread,cards:state.draws});
    state.reading={...input,id:state.pending.id,createdAt:state.pending.createdAt};state.pending=null;state.deck=[];
  }
  renderTable();renderReading();
}
function bothNotes(card) {
  const knowledge=getCardKnowledge(card.id);
  const details=el('details','card-meanings');details.append(el('summary','',t('bothMeanings')));
  details.append(el('strong','',t('symbols')),el('p','',knowledge.symbols[state.lang]));
  for(const key of ['upright','reversed']) { details.append(el('strong','',t(key)),el('p','',knowledge[key][state.lang])); }
  details.append(el('strong','',t('reflection')),el('p','',knowledge.reflection[state.lang]));
  return details;
}
function cardAttributes(id){
  const k=getCardKnowledge(id),list=el('dl','card-attributes');
  for(const [key,value] of [['element',k.element?t(k.element):t('planetary')],['numberRole',k.numberRole[state.lang]],['astrology',k.astrology[state.lang]]]){
    const row=el('div');row.append(el('dt','',t(key)),el('dd','',value));list.append(row);
  }
  return list;
}
function renderAttributeOverview(reading){
  const overview=summariseAttributes(reading.cards,state.lang),section=$('attribute-overview');section.replaceChildren();
  section.append(el('h3','',t('attributeOverview')));
  const chips=el('div','element-chips');
  for(const element of overview.elements)chips.append(el('span','element-chip '+element.key,element.name+' × '+element.count));
  if(overview.planetary)chips.append(el('span','element-chip',t('planetaryCount',{count:overview.planetary})));
  section.append(chips,el('p','small-note',t('overviewHelp')));
  if(overview.repeatedNumbers.length)section.append(el('p','repeated-numbers',t('repeatedNumbers')+' '+overview.repeatedNumbers.map(([number,count])=>number+' × '+count).join(' · ')));
}
function renderReading() {
  const reading=state.reading;$('result').hidden=!reading;if(!reading)return;
  const spread=SPREADS[reading.spread];
  $('result-question').textContent=reading.question||t('noQuestion');$('result-date').textContent=formatDate(reading.createdAt);
  renderAttributeOverview(reading);
  $('reading-cards').replaceChildren();
  reading.cards.forEach((draw,i)=>{
    const card=CARDS[draw.id],article=el('article','reading-card'),copy=el('div','reading-card-copy');
    article.append(artFrame(draw.id,draw.reversed));copy.append(el('p','card-position',`${String(i+1).padStart(2,'0')} / ${spread.positions[state.lang][i]}`));
    const heading=el('div','card-title-row');heading.append(el('h3','',card.name[state.lang]),el('span','orientation',t(draw.reversed?'reversed':'upright')));copy.append(heading);
    copy.append(el('p','card-keywords',card.keywords[state.lang]),cardAttributes(draw.id),el('p','card-note',getCardKnowledge(draw.id)[draw.reversed?'reversed':'upright'][state.lang]),bothNotes(card));
    article.append(copy);$('reading-cards').append(article);
  });
}
function renderLibrary() {
  const query=$('card-search').value.trim().toLocaleLowerCase();
  const cards=CARDS.filter(card=>(state.filter==='all'||card.suit===state.filter)&&(!query||`${card.name.zh} ${card.name.en}`.toLocaleLowerCase().includes(query)));
  $('library-count').textContent=t('cardsCount',{count:cards.length});$('library-empty').hidden=cards.length!==0;
  $('suit-filters').replaceChildren();
  for(const key of ['all','major','wands','cups','swords','pentacles']) {
    const button=el('button','suit-filter',t(key));button.type='button';button.setAttribute('aria-pressed',String(state.filter===key));
    button.addEventListener('click',()=>{state.filter=key;renderLibrary();});$('suit-filters').append(button);
  }
  $('card-library').replaceChildren();
  cards.forEach(card=>{const button=el('button','library-card');button.type='button';button.setAttribute('aria-label',card.name[state.lang]);
    button.append(artFrame(card.id),el('span','',card.name[state.lang]));button.addEventListener('click',()=>openCard(card.id));$('card-library').append(button);
  });
}
function renderCardDialog(id) {
  const card=CARDS[id],knowledge=getCardKnowledge(id),content=$('card-dialog-content');content.replaceChildren();
  const art=artFrame(id,false,'dialog-art'),copy=el('div','dialog-content');
  const title=el('h2','',card.name[state.lang]);title.id='card-dialog-title';copy.append(el('p','eyebrow',t(card.suit)),title,el('p','card-keywords',card.keywords[state.lang]));
  copy.append(cardAttributes(id),el('h3','',t('symbols')),el('p','',knowledge.symbols[state.lang]),el('h3','',t('attributeLens')),el('p','',knowledge.lens[state.lang]));
  for(const key of ['upright','reversed'])copy.append(el('h3','',t(key)),el('p','',knowledge[key==='upright'?'application':key][state.lang]));
  copy.append(el('h3','',t('reflection')),el('p','',knowledge.reflection[state.lang]));
  const view=el('a','card-image-link',t('viewImage'));view.href=cardImageURL(id);view.target='_blank';view.rel='noopener noreferrer';copy.append(view);
  content.append(art,copy);
}
function openCard(id) { state.dialogCard=id;renderCardDialog(id);if(!$('card-dialog').open)$('card-dialog').showModal(); }
function readHistory() {
  try {
    const raw=JSON.parse(storage?.getItem('tarot-journal')||'[]');if(!Array.isArray(raw))return [];
    return raw.slice(0,30).flatMap(item=>{
      try {
        if(typeof item.id!=='string'||!/^[a-f0-9-]{36}$/.test(item.id)||typeof item.createdAt!=='string'||!Number.isFinite(Date.parse(item.createdAt)))return [];
        const reading=validateReading({kind:item.kind,language:item.language,question:item.question,spread:item.spread,cards:item.cards});
        return [{...reading,id:item.id,createdAt:item.createdAt}];
      } catch { return []; }
    });
  } catch {return [];}
}
function writeHistory(history) { if(!storage)throw new Error('No storage');storage.setItem('tarot-journal',JSON.stringify(history)); }
function saveReading() {
  if(!state.reading)return;
  const history=readHistory();if(history.some(item=>item.id===state.reading.id)){toast('alreadySaved');return;}
  try {writeHistory([{...state.reading,language:state.lang},...history].slice(0,30));state.saved=true;$('save-status').textContent=t('saved');toast('saved');}
  catch {toast('saveFailed');}
}
function renderHistory() {
  const list=$('history-list');list.replaceChildren();const history=readHistory();
  if(!history.length)list.append(el('p','history-empty',t('historyEmpty')));
  for(const reading of history) {
    const article=el('article','history-item');article.append(el('small','',formatDate(reading.createdAt)),el('h3','',reading.question||t('noQuestion')),
      el('p','',`${SPREADS[reading.spread].name[state.lang]} · ${reading.cards.map(draw=>`${CARDS[draw.id].name[state.lang]} (${t(draw.reversed?'reversed':'upright')})`).join(' / ')}`));
    const actions=el('div','history-controls'),open=el('button','text-button',t('openReading')),remove=el('button','text-button',t('deleteReading'));
    open.addEventListener('click',()=>{
      clearAI();state.reading=reading;state.pending=null;state.draws=[];state.deck=[];state.spread=reading.spread;state.saved=true;
      $('question').value=reading.question;updateCount();renderOptions();renderTable();renderReading();$('save-status').textContent=t('saved');$('history-dialog').close();$('result').scrollIntoView({behavior:'smooth',block:'start'});toast('returnToReading');
    });
    remove.addEventListener('click',()=>{try{writeHistory(readHistory().filter(item=>item.id!==reading.id));if(state.reading?.id===reading.id){state.saved=false;$('save-status').textContent='';}renderHistory();toast('deleted');}catch{toast('saveFailed');}});
    actions.append(open,remove);article.append(actions);list.append(article);
  }
}
function exportReading() {
  if(!state.reading)return;
  const reading={...state.reading,language:state.lang};
  const data={version:'tarot-journal-v1',randomSource:'Web Crypto · Fisher–Yates with rejection sampling',...reading};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=el('a');link.href=url;link.download=`tarot-${reading.createdAt.slice(0,10)}-${reading.id.slice(0,8)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('exported');
}
let imageURL=null,imageRun=0;
function releaseImage(){
  if(imageURL)URL.revokeObjectURL(imageURL);imageURL=null;
  $('image-preview').removeAttribute('src');$('image-download').removeAttribute('href');
}
function imageBusy(busy){
  document.querySelectorAll('[data-export-image]').forEach(button=>{button.disabled=busy;button.setAttribute('aria-busy',String(busy));});
}
async function exportImage(){
  if(!state.reading)return;
  const run=++imageRun;
  const snapshot=makeExportSnapshot(state.reading,state.lang,state.aiResult);
  releaseImage();imageBusy(true);$('image-preview').hidden=true;$('image-download').hidden=true;
  $('image-zoom').hidden=true;$('image-preview-scroll').classList.remove('zoomed');$('image-zoom').textContent=t('imageZoom');
  $('image-status').textContent=t('imageBusy');
  if(!$('image-dialog').open)$('image-dialog').showModal();
  try{
    const result=await renderReadingImage(snapshot);
    if(run!==imageRun)return;
    imageURL=URL.createObjectURL(result.blob);$('image-preview').src=imageURL;$('image-preview').hidden=false;
    $('image-download').href=imageURL;$('image-download').download=result.filename;$('image-download').hidden=false;
    $('image-zoom').hidden=false;
    $('image-status').textContent=t('imageReady',{width:result.width,height:result.height})+' · '+(snapshot.ai?t('imageHasAI'):t('imageNoAI'));
  }catch{if(run===imageRun)$('image-status').textContent=t('imageFailed');}
  finally{if(run===imageRun)imageBusy(false);}
}
function renderAI() {
  if(!state.aiPhase)return;
  $('ai-question').textContent=state.reading?.question||t('noQuestion');
  const key={selecting:'aiSelecting',generating:'aiGenerating',complete:'aiComplete',cancelled:'aiCancelled'}[state.aiPhase];
  $('ai-status').textContent=key?t(key):'';$('ai-route').textContent=state.aiRoute?t(state.aiRoute):'';
  $('ai-error').hidden=!state.aiError;
  if(state.aiError)$('ai-error').textContent=t(TEXT[state.lang][`error${state.aiError}`]?`error${state.aiError}`:'errorUNKNOWN');
}
async function startAI() {
  if(!state.reading||state.ai)return;
  clearAI();const controller=new AbortController();state.ai=controller;state.aiPhase='selecting';
  $('ai-panel').hidden=false;$('ai-start').disabled=true;$('ai-cancel').hidden=false;$('ai-retry').hidden=true;renderAI();
  $('ai-panel').scrollIntoView({behavior:'smooth',block:'start'});
  const reading=validateReading({kind:'tarot',language:state.lang,question:state.reading.question,spread:state.reading.spread,cards:state.reading.cards});
  try {
    const answer=await interpretTarot(reading,{signal:controller.signal,countryCode:state.country,onStatus:status=>{
      if(state.ai!==controller)return;state.aiPhase=status.phase;state.aiRoute=status.route||null;renderAI();
    }});
    if(state.ai!==controller||controller.signal.aborted)return;
    state.aiResult={...answer,readingId:state.reading.id,language:state.lang};
    $('ai-answer').textContent=answer.text;$('ai-partial').hidden=!answer.truncated;state.aiPhase='complete';state.aiRoute=answer.route;
  } catch(error) {
    if(state.ai!==controller)return;
    if(controller.signal.aborted)state.aiPhase='cancelled';else {state.aiPhase='error';state.aiError=error.code||'UNKNOWN';}
  } finally {
    if(state.ai===controller) {state.ai=null;$('ai-start').disabled=false;$('ai-cancel').hidden=true;$('ai-retry').hidden=false;renderAI();}
  }
}
function updateCount() { $('question-count').textContent=`${$('question').value.length} / ${QUESTION_LIMIT}`; }
$('reading-form').addEventListener('submit',begin);
$('spread-options').addEventListener('change',event=>{if(Object.hasOwn(SPREADS,event.target.value))state.spread=event.target.value;});
$('auto-draw').addEventListener('click',()=>{while(state.pending)pickCard(0);});
$('reset').addEventListener('click',()=>{clearAI();state.pending=null;state.reading=null;state.draws=[];state.deck=[];state.saved=false;$('form-error').hidden=true;renderTable();renderReading();$('question').focus();});
$('question').addEventListener('input',updateCount);$('card-search').addEventListener('input',renderLibrary);
$('save').addEventListener('click',saveReading);$('export').addEventListener('click',exportReading);
document.querySelectorAll('[data-export-image]').forEach(button=>button.addEventListener('click',exportImage));
$('image-dialog').addEventListener('close',()=>{imageRun++;releaseImage();imageBusy(false);});
$('image-zoom').addEventListener('click',()=>{const zoomed=$('image-preview-scroll').classList.toggle('zoomed');$('image-zoom').textContent=t(zoomed?'imageFit':'imageZoom');});
$('ai-start').addEventListener('click',startAI);$('ai-retry').addEventListener('click',startAI);$('ai-cancel').addEventListener('click',()=>state.ai?.abort());
$('history-open').addEventListener('click',()=>{renderHistory();$('history-dialog').showModal();});
for(const lang of ['zh','en'])$(`lang-${lang}`).addEventListener('click',()=>setLanguage(lang));
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.close).close()));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
}));
const artCredits=el('p');artCredits.dataset.i18n='artCredits';
const artSource=el('a');artSource.dataset.i18n='artSource';artSource.href='https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck_(Roses_%26_Lilies)';artSource.target='_blank';artSource.rel='noopener noreferrer';
document.querySelector('.method-note').append(artCredits,artSource);
const attributeMethod=el('p');attributeMethod.dataset.i18n='attributeMethod';document.querySelector('.method-note').append(attributeMethod);
for(const source of KNOWLEDGE_SOURCES){const link=el('a','knowledge-source',source.title+' ↗');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';document.querySelector('.method-note').append(link);}
$('question').maxLength=QUESTION_LIMIT;updateCount();
$('table-back').innerHTML=cardBack();applyLanguage();
// A late IP response can never overwrite a manual choice. Never retain the IP.
lookupCountry().then(country=>{
  state.country=country;
  if(country&&!state.manual) { const lang=languageForCountry(country);if(state.lang!==lang)clearAI();state.lang=lang;state.source='ip';applyLanguage(); }
});
