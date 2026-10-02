// Download the original 1909 Roses & Lilies deck, not a modern recolouring.
// Uses Sharp only for web delivery resizing/encoding; no content/colour edits.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {CARDS} from '../../tarot/cards.mjs';

const {default:sharp}=await import(process.env.TAROT_SHARP_MODULE || 'sharp');
const root=fileURLToPath(new URL('../../',import.meta.url));
const cache=join(root,'tmp/tarot-art/originals'),output=join(root,'tarot/assets/rws-1909');
await mkdir(cache,{recursive:true});await mkdir(output,{recursive:true});
const majors=['Fool','Magician','High Priestess','Empress','Emperor','Hierophant','Lovers','Chariot','Strength','Hermit','Wheel of Fortune','Justice','Hanged Man','Death','Temperance','Devil','Tower','Star','Moon','Sun','Judgement','World'];
const pad=value=>String(value).padStart(2,'0');
const titleFor=card=>`File:RWS1909 - ${card.suit==='major'?`${pad(card.id)} ${majors[card.id]}`:`${card.suit[0].toUpperCase()+card.suit.slice(1)} ${pad(card.rank)}`}.jpeg`;
const entries=[...CARDS.map(card=>({id:card.id,name:card.name.en,title:titleFor(card)})),
  {id:'back',name:'Roses & Lilies card back',title:'File:Waite–Smith Tarot Roses and Lilies cropped.jpg'}];
const agent='ArcanaDeck/1.0 (https://sparkmxy.github.io/tarot/; original public-domain deck)';
async function get(url) {
  if(!['commons.wikimedia.org','upload.wikimedia.org'].includes(new URL(url).hostname))throw new Error('Unexpected source host');
  for(let attempt=0;attempt<5;attempt++) {
    const response=await fetch(url,{headers:{'User-Agent':agent},signal:AbortSignal.timeout(30000)});
    if(response.ok)return response;
    if(![429,503].includes(response.status)||attempt===4)throw new Error(`Download failed: ${response.status}`);
    const retryAfter=Number(response.headers.get('retry-after'));
    await response.body?.cancel();await new Promise(resolve=>setTimeout(resolve,Math.max(15000,Number.isFinite(retryAfter)?retryAfter*1000:0)));
  }
}
const pages={};
for(let offset=0;offset<entries.length;offset+=20) {
  const q=new URLSearchParams({action:'query',titles:entries.slice(offset,offset+20).map(entry=>entry.title).join('|'),
    prop:'imageinfo',iiprop:'url|size|sha1|extmetadata',format:'json',formatversion:'2'});
  const data=await (await get('https://commons.wikimedia.org/w/api.php?'+q)).json();
  if(data.error)throw new Error(data.error.code);
  for(const page of data.query.pages)pages[page.title]=page;
}
const records=[];let cursor=0,bytes=0;
async function processEntry(entry) {
  const source=pages[entry.title]?.imageinfo?.[0];
  const meta=source?.extmetadata;
  if(!source || meta?.LicenseShortName?.value!=='Public domain' || meta?.Copyrighted?.value!=='False'
    || meta?.DateTimeOriginal?.value!=='1909')throw new Error(`Unverified original: ${entry.title}`);
  const stem=entry.id==='back'?'back':pad(entry.id),cached=join(cache,stem+'.jpg');
  let original;try {original=await readFile(cached);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!original || createHash('sha1').update(original).digest('hex')!==source.sha1) {
    original=Buffer.from(await (await get(source.url)).arrayBuffer());
    if(original.length!==source.size||createHash('sha1').update(original).digest('hex')!==source.sha1)throw new Error(`Source checksum mismatch: ${entry.title}`);
    await writeFile(cached,original);
    // Respect Commons' shared-IP rate limits, including proxy exits.
    await new Promise(resolve=>setTimeout(resolve,1500));
  }
  const assets={};
  for(const [variant,width,quality] of [['full',720,88],['thumb',320,84]]) {
    const name=stem+(variant==='thumb'?'-thumb':'')+'.webp';
    const {data,info}=await sharp(original).resize({width,withoutEnlargement:true}).webp({quality,effort:5}).toBuffer({resolveWithObject:true});
    await writeFile(join(output,name),data);bytes+=data.length;
    assets[variant]={file:`assets/rws-1909/${name}`,width:info.width,height:info.height,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};
  }
  records.push({id:entry.id,name:entry.name,commonsTitle:entry.title,sourcePage:source.descriptionurl,originalURL:source.url,
    originalWidth:source.width,originalHeight:source.height,originalSHA1:source.sha1,date:'1909',license:'Public domain',
    author:entry.id==='back'?'Unknown; possibly Pamela Colman Smith':'Pamela Colman Smith',scanCredit:'Saskia Jansen',...assets});
  console.log(`Ready ${stem} · ${entry.name}`);
}
while(cursor<entries.length)await processEntry(entries[cursor++]);
records.sort((a,b)=>a.id==='back'?1:b.id==='back'?-1:a.id-b.id);
await writeFile(join(output,'sources.json'),JSON.stringify({deck:'Rider–Waite–Smith · 1909 Roses & Lilies',
  sourceCollection:'https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck_(Roses_%26_Lilies)',
  importedAt:new Date().toISOString(),processing:'Full uncropped scans, resized and encoded as WebP. No recolouring, retouching or generated content.',cards:records},null,2)+'\n');
console.log(JSON.stringify({cards:records.length,totalBytes:bytes}));
