import {CARDS} from './cards.mjs';
const star=(x,y,r=7)=>`<path d="M${x} ${y-r}l${r*.3} ${r*.7} ${r*.7} ${r*.3}-${r*.7} ${r*.3}-${r*.3} ${r*.7}-${r*.3}-${r*.7}-${r*.7}-${r*.3} ${r*.7}-${r*.3}Z"/>`;
const moon=`<path d="M100 48a25 25 0 1 0 23 35 25 25 0 0 1-23-35Z"/>`;
const sun=`<circle cx="100" cy="73" r="20"/><g fill="none"><path d="M100 42v-8m0 85v-8M68 73h-8m80 0h-8M77 50l-6-6m58 58-6-6m-46 0-6 6m58-58-6 6"/></g>`;
const person=(x=100,y=131)=>`<circle cx="${x}" cy="${y-27}" r="11"/><path d="M${x-16} ${y-12}Q${x} ${y-24} ${x+16} ${y-12}l12 62h-56Z"/>`;
const blossom=`<g transform="translate(100 116)"><circle r="26" fill="none"/><path d="M0-26Q34 0 0 26Q-34 0 0-26ZM-26 0Q0-34 26 0Q0 34-26 0Z" fill="none"/><circle r="5"/></g>`;
function majorArt(id) {
  const hill='<path d="M20 198l37-39 30 23 42-42 51 58" fill="none"/>';
  switch(id) {
    case 0:return `${sun}${hill}<g transform="translate(-17 8) rotate(-9 100 132)">${person()}<path d="M114 126l29-20m-57 23-16 16m31 33-15 28m18-29 16 24" fill="none"/></g>${star(150,126,5)}`;
    case 1:return `${star(100,53,15)}${person()}<path d="M67 131l-5-48m74 48 8 26M52 169h97m-86 0v35m76-35v35" fill="none"/>`;
    case 2:return `<path d="M38 61v131m-10-131h20M160 61v131m-10-131h20" fill="none"/>${moon}${person(100,146)}<path d="M78 158h44v14H78Z" fill="none"/>`;
    case 3:return `${blossom}<path d="M100 145v52m0-23q-37-38-38-8 19 19 38 8m0-12q35-32 37-9-14 24-37 9" fill="none"/>${star(53,58)}${star(148,63)}`;
    case 4:return `<path d="M64 82h72v107H64Zm-15 30h15v83m72-83h15v83" fill="none"/>${person(100,129)}<path d="M88 88l-5-12 17 7 17-7-5 12Z"/>`;
    case 5:return `${person(100,135)}<path d="M100 52v38m-13-22h26m-34 118 42-30m-42 0 42 30" fill="none"/><circle cx="70" cy="185" r="7" fill="none"/><circle cx="130" cy="185" r="7" fill="none"/>`;
    case 6:return `${sun}<g transform="translate(0 28)">${person(66,129)}${person(134,129)}</g><path d="M78 170q22-30 44 0" fill="none"/>`;
    case 7:return `${star(100,55,12)}${person(100,121)}<path d="M54 162h92v31H54Z" fill="none"/><circle cx="65" cy="197" r="9"/><circle cx="135" cy="197" r="9"/>`;
    case 8:return `${person(94,122)}<path d="M110 150q31-23 45 1l-9 26-39 1Z"/><circle cx="141" cy="146" r="14" fill="none"/><path d="M77 72q-10-13-17 0t17 0q10-13 17 0t-17 0" fill="none"/>`;
    case 9:return `${hill}${person(100,131)}<path d="M118 137l13-17m4-21v100M123 95h24v29h-24Z" fill="none"/>${star(135,109,6)}`;
    case 10:return `<g fill="none"><circle cx="100" cy="124" r="51"/><circle cx="100" cy="124" r="35"/><path d="M100 73v102m-51-51h102m-87-37 72 74m0-74-72 74"/></g>${star(44,64)}${star(153,192)}`;
    case 11:return `<path d="M100 63v138m-41-113h82m-68 0-22 50h44Zm56 0-22 50h44Z" fill="none"/><path d="M75 201h50"/>${star(100,54,8)}`;
    case 12:return `<path d="M38 62h124m-107 0v141m90-141v141" fill="none"/><g transform="rotate(180 100 137)">${person(100,141)}<path d="M98 174l-12 26m16-25 25 15 8-22" fill="none"/></g>`;
    case 13:return `${blossom}<path d="M100 145v56m0-39-25 16m25-4 24 13" fill="none"/>${hill}`;
    case 14:return `${person(100,137)}<path d="M64 121h22v19H64Zm50 37h22v19h-22m-50-18q25-2 39 10" fill="none"/>${star(100,70,8)}`;
    case 15:return `<path d="M100 59l26 18-11 24H85L74 77Z"/><circle cx="76" cy="137" r="18" fill="none"/><circle cx="124" cy="169" r="18" fill="none"/><path d="M86 150l26 9" fill="none"/>${hill}`;
    case 16:return `<path d="M73 93h54l9 106H64ZM66 93l4-18 12 9 17-16 17 16 14-9 4 18Z" fill="none"/><path d="M134 46l-40 58h26l-30 47" fill="none"/>${star(48,121,8)}${star(154,159,6)}`;
    case 17:return `${star(100,83,31)}${star(47,66)}${star(151,62)}${star(45,125)}${star(154,131)}<path d="M32 174q32-15 65 0t69 0m-128 16q27-12 57 0t59 0" fill="none"/>`;
    case 18:return `${moon}<path d="M36 122v65h24v-65Zm105 0v65h24v-65ZM75 206q48-45 20-75" fill="none"/><path d="M45 190q23-19 48 0t62 0" fill="none"/>${star(146,72,4)}`;
    case 19:return `${sun}<path d="M100 107v98m-21-28h42m-69 24 5-28m-14 2q15-21 24 0m77 26-5-28m-9 2q14-21 24 0" fill="none"/>${hill}`;
    case 20:return `${star(100,65,19)}<path d="M57 125l25-15 27 16-24 14Z"/><path d="M82 113l27 58m-22-40 32-17m-73 83q54-32 110 0" fill="none"/>`;
    default:return `<ellipse cx="100" cy="125" rx="54" ry="78" fill="none"/><ellipse cx="100" cy="125" rx="47" ry="69" fill="none"/>${person(100,139)}${star(34,64)}${star(166,64)}${star(34,193)}${star(166,193)}`;
  }
}
function pip(suit,x,y,size=1) {
  const symbols={
    wands:'<path d="M0-14v28m0-7q-10-12-11-2 6 6 11 2m0-10q10-12 11-2-6 6-11 2" fill="none"/>',
    cups:'<path d="M-11-10h22q1 20-11 20-12 0-11-20Zm11 20v8m-8 0h16" fill="none"/>',
    swords:'<path d="M0-17l5 8-5 21-5-21Zm-8 25h16m-8 4v8" fill="none"/>',
    pentacles:`<circle r="13" fill="none"/><path d="M0-10l6 18-15-11H9L-6 8Z" fill="none"/>`,
  };
  return `<g transform="translate(${x} ${y}) scale(${size})">${symbols[suit]}</g>`;
}
export function cardArt(id,lang='en') {
  const card=CARDS[id];if(!card)return '';
  let art;
  if(card.suit==='major')art=majorArt(id);
  else if(card.rank>10)art=`${person()}${pip(card.suit,100,72,.8)}<path d="M75 195h50" fill="none"/>`;
  else if(card.rank===1)art=`${pip(card.suit,100,125,2.5)}${star(50,65)}${star(150,183)}`;
  else art=Array.from({length:card.rank},(_,i)=>{const rows=Math.ceil(card.rank/2);return pip(card.suit,card.rank%2&&i===card.rank-1?100:i%2?133:67,65+Math.floor(i/2)*(125/Math.max(1,rows-1)),.85);}).join('');
  const fills=['#e9dbc2','#d3ddd2','#dfd6df','#d0dde4','#eedcc6'];
  const roman=['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];
  const name=card.name[lang]||card.name.en;
  const rank=card.suit==='major'?roman[id]:card.rank>10?(lang==='zh'?['侍从','骑士','王后','国王']:['PAGE','KNIGHT','QUEEN','KING'])[card.rank-11]:card.rank===1?(lang==='zh'?'王牌':'ACE'):card.rank;
  return `<svg viewBox="0 0 200 280" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="196" height="276" rx="9" fill="#f5f1e7" stroke="#bba984"/><rect x="13" y="34" width="174" height="195" rx="80" fill="${fills[card.suit==='major'?id%5:1+Math.floor((id-22)/14)]}"/><g stroke="#6c624f" fill="#b39a73" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${art}</g><path d="M23 245h154" stroke="#bba984"/><text x="100" y="24" text-anchor="middle" font-family="Georgia,serif" font-size="12" fill="#6c624f">${rank}</text><text x="100" y="264" text-anchor="middle" font-family="Georgia,serif" font-size="${lang==='zh'?13:name.length>19?9:11}" fill="#6c624f">${name.toUpperCase()}</text></svg>`;
}
export function cardBack() {
  return `<svg viewBox="0 0 200 280" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="196" height="276" rx="9" fill="#293c40" stroke="#c5b086"/><rect x="13" y="13" width="174" height="254" rx="5" fill="none" stroke="#b8a47e" stroke-opacity=".6"/><g stroke="#b8a47e" fill="none" stroke-width="1"><circle cx="100" cy="140" r="54"/><circle cx="100" cy="140" r="45"/><path d="M100 49v182M34 140h132M58 97l84 86m0-86-84 86"/><path d="M100 83l17 39 40 18-40 18-17 39-17-39-40-18 40-18Z"/></g><g fill="#c5b086">${star(100,140,24)}${star(32,32,4)}${star(168,32,4)}${star(32,248,4)}${star(168,248,4)}</g></svg>`;
}
