import {CARDS,SPREADS} from './cards.mjs';
import {validateReading} from './core.mjs';
import {cardImageURL} from './art.mjs';
import {getCardKnowledge,summariseAttributes,ATTRIBUTE_METHOD} from './knowledge.mjs';
import {translate} from './i18n.mjs';

function freeze(value){
  if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}
  return value;
}
export function makeExportSnapshot(raw,language,answer=null){
  const reading=validateReading({kind:raw.kind,language,question:raw.question,spread:raw.spread,cards:raw.cards});
  if(typeof raw.id!=='string'||!/^[a-f0-9-]{36}$/.test(raw.id)||typeof raw.createdAt!=='string'||!Number.isFinite(Date.parse(raw.createdAt)))throw new TypeError('INVALID_EXPORT');
  const matching=answer?.readingId===raw.id&&answer?.language===language;
  let ai=null;
  if(matching){
    if(typeof answer.text!=='string'||!answer.text.trim()||answer.text.length>16000||typeof answer.truncated!=='boolean'||typeof answer.model!=='string'||answer.model.length>100)throw new TypeError('INVALID_EXPORT');
    ai={text:answer.text,model:answer.model,truncated:answer.truncated};
  }
  return freeze({...reading,id:raw.id,createdAt:raw.createdAt,ai});
}

const graphemes=text=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(x=>x.segment):Array.from(text);
// Preserve paragraphs, emoji clusters and every non-whitespace character.
// Break words only when a word itself is wider than the available line.
export function wrapText(text,maxWidth,measure){
  if(!(maxWidth>0))throw new RangeError('Invalid text width');
  const lines=[];
  for(const paragraph of String(text).replace(/\r\n?/g,'\n').split('\n')){
    if(!paragraph){lines.push('');continue;}
    const units=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'word'}).segment(paragraph)].map(x=>x.segment):paragraph.split(/(\s+)/);
    let line='';
    for(const unit of units){
      if(measure(line+unit)<=maxWidth){line+=unit;continue;}
      if(line.trim()){lines.push(line.trimEnd());line='';}
      if(measure(unit)<=maxWidth){line=unit.trimStart();continue;}
      for(const character of graphemes(unit)){
        if(line&&measure(line+character)>maxWidth){lines.push(line);line='';}
        line+=character;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
export function reportBlocks(snapshot){
  const lang=snapshot.language,t=(key,values)=>translate(lang,key,values),spread=SPREADS[snapshot.spread];
  const overview=summariseAttributes(snapshot.cards,lang);
  const counts=overview.elements.map(e=>e.name+' × '+e.count).join('  ·  ');
  const blocks=[
    {type:'eyebrow',text:'TAROT JOURNAL · RIDER–WAITE–SMITH'},
    {type:'title',text:t('brand')+' · '+spread.name[lang]},
    {type:'meta',text:new Intl.DateTimeFormat(lang==='zh'?'zh-CN':'en',{dateStyle:'long',timeStyle:'short'}).format(new Date(snapshot.createdAt))},
    {type:'question',text:snapshot.question||t('noQuestion')},
    {type:'spread',cards:snapshot.cards,positions:spread.positions[lang]},
    {type:'heading',text:t('attributeOverview')},
    {type:'body',text:counts+(overview.planetary?'  ·  '+t('planetaryCount',{count:overview.planetary}):'')},
    {type:'note',text:t('overviewHelp')},
  ];
  if(overview.repeatedNumbers.length)blocks.push({type:'body',text:t('repeatedNumbers')+' '+overview.repeatedNumbers.map(([number,count])=>number+' × '+count).join(' · ')});
  snapshot.cards.forEach((draw,index)=>{
    const card=CARDS[draw.id],k=getCardKnowledge(draw.id),orientation=t(draw.reversed?'reversed':'upright');
    blocks.push({type:'heading',text:String(index+1).padStart(2,'0')+' / '+spread.positions[lang][index]+' · '+card.name[lang]+' · '+orientation},
      {type:'attributes',text:t('element')+': '+(k.element?t(k.element):t('planetary'))+'  |  '+t('numberRole')+': '+k.numberRole[lang]+'\n'+t('astrology')+': '+k.astrology[lang]},
      {type:'body',text:k.symbols[lang]},
      {type:'body',text:k[draw.reversed?'reversed':'upright'][lang]},
      {type:'note',text:t('reflection')+' · '+k.reflection[lang]});
  });
  blocks.push({type:'heading',text:t('aiTitle')});
  if(snapshot.ai){
    blocks.push({type:'meta',text:'Gemini · '+snapshot.ai.model},{type:'ai',text:snapshot.ai.text});
    if(snapshot.ai.truncated)blocks.push({type:'warning',text:t('partial')});
  }else blocks.push({type:'note',text:t('imageNoAI')});
  blocks.push({type:'divider'},{type:'note',text:t('aiNote')},{type:'note',text:ATTRIBUTE_METHOD[lang]},
    {type:'note',text:t('imageCredits')},{type:'footer',text:'sparkmxy.github.io/tarot'});
  return blocks;
}
export function canvasScale(height,width=1000){
  if(!Number.isFinite(height)||height<=0||!Number.isFinite(width)||width<=0)throw new RangeError('Invalid canvas size');
  // Keep very long answers inside mobile canvas dimension / memory budgets.
  return Math.min(1.5,16000/height,Math.sqrt(12000000/(width*height)));
}
const style={
  eyebrow:{font:'16px system-ui, "Microsoft YaHei", sans-serif',line:25,gap:16,color:'#a5895d'},
  title:{font:'38px Georgia, "Noto Serif SC", SimSun, serif',line:52,gap:14,color:'#293c40'},
  meta:{font:'18px system-ui, "Microsoft YaHei", sans-serif',line:29,gap:24,color:'#78837d'},
  question:{font:'28px Georgia, "Noto Serif SC", SimSun, serif',line:44,gap:34,color:'#293c40'},
  heading:{font:'27px Georgia, "Noto Serif SC", SimSun, serif',line:40,gap:16,color:'#293c40',before:26},
  attributes:{font:'20px system-ui, "Microsoft YaHei", sans-serif',line:33,gap:18,color:'#826b47'},
  body:{font:'23px system-ui, "Microsoft YaHei", sans-serif',line:38,gap:18,color:'#34494b'},
  ai:{font:'24px Georgia, "Noto Serif SC", SimSun, serif',line:41,gap:22,color:'#293c40'},
  note:{font:'18px system-ui, "Microsoft YaHei", sans-serif',line:31,gap:16,color:'#68766f'},
  warning:{font:'19px system-ui, "Microsoft YaHei", sans-serif',line:32,gap:18,color:'#9d5345'},
  footer:{font:'18px system-ui, "Microsoft YaHei", sans-serif',line:28,gap:0,color:'#a5895d'},
};
async function loadImage(id){
  const image=new Image();image.decoding='async';image.src=cardImageURL(id);
  await image.decode();return image;
}
function measurePlan(ctx,blocks,width){
  const margin=64,available=width-margin*2;let y=64;
  return {height:blocks.reduce((unused,block)=>{
    if(block.type==='spread'){
      block.y=y;block.width=available;block.x=margin;
      const slot=Math.min(176,(available-20*(block.cards.length-1))/block.cards.length);
      block.labels=block.cards.map((draw,index)=>{
        ctx.font='19px Georgia, "Noto Serif SC", SimSun, serif';
        const title=wrapText(CARDS[draw.id].name[block.language],slot,text=>ctx.measureText(text).width);
        ctx.font='17px system-ui, "Microsoft YaHei", sans-serif';
        const position=wrapText(block.positions[index],slot,text=>ctx.measureText(text).width);
        return {title,position};
      });
      block.height=343+Math.max(...block.labels.map(label=>label.title.length*25+6+label.position.length*24))+15;
      y+=block.height+26;
    }else if(block.type==='divider'){block.y=y+12;y+=38;}
    else {
      const s=style[block.type];ctx.font=s.font;
      block.lines=wrapText(block.text,available,text=>ctx.measureText(text).width);
      y+=s.before||0;block.y=y;block.x=margin;
      block.height=block.lines.length*s.line;y+=block.height+s.gap;
    }
    return y+60;
  },0),blocks};
}
function paintSpread(ctx,block,images,lang){
  const count=block.cards.length,gap=20,slot=Math.min(176,(block.width-gap*(count-1))/count);
  const groupWidth=count*slot+(count-1)*gap,start=block.x+(block.width-groupWidth)/2;
  block.cards.forEach((draw,index)=>{
    const image=images[index],left=start+index*(slot+gap),top=block.y;
    const imageWidth=Math.min(slot,172),imageHeight=298,scale=Math.min(imageWidth/image.naturalWidth,imageHeight/image.naturalHeight);
    const w=image.naturalWidth*scale,h=image.naturalHeight*scale,cx=left+slot/2,cy=top+imageHeight/2;
    ctx.save();ctx.translate(cx,cy);if(draw.reversed)ctx.rotate(Math.PI);
    ctx.shadowColor='#51442d25';ctx.shadowBlur=10;ctx.shadowOffsetY=4;ctx.drawImage(image,-w/2,-h/2,w,h);ctx.restore();
    ctx.textAlign='center';ctx.fillStyle='#826b47';ctx.font=style.meta.font;
    ctx.fillText(translate(lang,draw.reversed?'reversed':'upright'),cx,top+313);
    ctx.font='19px Georgia, "Noto Serif SC", SimSun, serif';ctx.fillStyle='#293c40';
    const title=block.labels[index].title;
    let y=top+343;for(const line of title){ctx.fillText(line,cx,y);y+=25;}
    ctx.font='17px system-ui, "Microsoft YaHei", sans-serif';ctx.fillStyle='#78837d';
    for(const line of block.labels[index].position){ctx.fillText(line,cx,y+6);y+=24;}
    ctx.textAlign='left';
  });
}
export async function renderReadingImage(snapshot){
  const blocks=reportBlocks(snapshot);
  blocks.find(block=>block.type==='spread').language=snapshot.language;
  await document.fonts?.ready;
  const images=await Promise.all(snapshot.cards.map(draw=>loadImage(draw.id)));
  const canvas=document.createElement('canvas'),width=1000;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('CANVAS_UNAVAILABLE');
  const plan=measurePlan(ctx,blocks,width),scale=canvasScale(plan.height,width);
  canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(plan.height*scale);
  ctx.scale(scale,scale);ctx.fillStyle='#f5f2ea';ctx.fillRect(0,0,width,plan.height);
  ctx.textBaseline='top';
  ctx.fillStyle='#a5895d';ctx.fillRect(64,38,44,2);
  for(const block of blocks){
    if(block.type==='spread'){paintSpread(ctx,block,images,snapshot.language);continue;}
    if(block.type==='divider'){ctx.fillStyle='#d7d9cd';ctx.fillRect(64,block.y,width-128,1);continue;}
    const s=style[block.type];ctx.font=s.font;ctx.fillStyle=s.color;
    for(let i=0;i<block.lines.length;i++)ctx.fillText(block.lines[i],block.x,block.y+i*s.line);
  }
  const dimensions={width:canvas.width,height:canvas.height};
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('PNG_FAILED')),'image/png'));
  canvas.width=1;canvas.height=1;
  const timestamp=new Date(snapshot.createdAt);
  const localDate=[timestamp.getFullYear(),String(timestamp.getMonth()+1).padStart(2,'0'),String(timestamp.getDate()).padStart(2,'0')].join('-');
  return {blob,...dimensions,filename:'tarot-'+localDate+'-'+snapshot.id.slice(0,8)+'.png'};
}
