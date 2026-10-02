import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../cards.mjs';
import {CARD_KNOWLEDGE,getCardKnowledge,summariseAttributes} from '../knowledge.mjs';
import {prepareAIReading,QUESTION_LIMIT} from '../reading-request.mjs';
import {makeExportSnapshot,wrapText,reportBlocks,canvasScale} from '../image-export.mjs';
const reading={kind:'tarot',language:'zh',question:'怎样推进长期学习？',spread:'three',cards:[{id:1,reversed:false},{id:67,reversed:true},{id:17,reversed:false}],
  id:'00000000-0000-4000-8000-000000000001',createdAt:'2026-10-03T00:00:00.000Z'};
test('all 78 cards have bilingual imagery, attributes, fuller readings and reflection',()=>{
  assert.equal(CARD_KNOWLEDGE.length,78);
  for(const card of CARDS){
    const k=getCardKnowledge(card.id);assert.equal(k.id,card.id);assert.ok(Object.isFrozen(k));
    for(const key of ['elementTheme','astrology','numberRole','symbols','lens','reflection','upright','reversed'])for(const lang of ['zh','en'])assert.ok(k[key][lang].trim(),card.name.en+' '+key);
    for(const lang of ['zh','en'])for(const key of ['upright','reversed'])assert.ok(k[key][lang].length>card[key][lang].length*2);
  }
  assert.throws(()=>getCardKnowledge(78),RangeError);
});
test('RWS order, planetary trumps, decans, aces and courts retain distinct correspondence rules',()=>{
  assert.equal(getCardKnowledge(8).astrology.en,'Leo');assert.equal(getCardKnowledge(11).astrology.en,'Libra');
  assert.equal(getCardKnowledge(1).element,null);assert.equal(getCardKnowledge(1).astrology.en,'Mercury');
  assert.equal(getCardKnowledge(12).element,'water');assert.equal(getCardKnowledge(20).element,'fire');
  assert.equal(getCardKnowledge(23).astrology.en,'Mars in Aries');
  assert.equal(getCardKnowledge(44).astrology.en,'Jupiter in Pisces');
  assert.equal(getCardKnowledge(58).astrology.en,'Mars in Gemini');
  assert.equal(getCardKnowledge(72).astrology.en,'Venus in Virgo');
  assert.equal(getCardKnowledge(67).astrology.en,'Sun in Capricorn');
  for(const id of [22,36,50,64])assert.match(getCardKnowledge(id).astrology.en,/Elemental root/);
  assert.match(getCardKnowledge(77).numberRole.en,/King/);assert.match(getCardKnowledge(77).astrology.en,/No single zodiac sign/);
  const a=summariseAttributes(reading.cards),b=summariseAttributes(reading.cards.map(c=>({...c,reversed:!c.reversed})));
  assert.deepEqual(a,b);assert.deepEqual(a.counts,{fire:0,water:0,air:1,earth:1});assert.equal(a.planetary,1);
  const repeated=summariseAttributes([{id:23},{id:37},{id:6}]);assert.deepEqual(repeated.repeatedNumbers,[[2,2]]);
});
test('frontend focus preserves the entire question and fits the existing 200-character schema',()=>{
  for(const language of ['zh','en']){
    const raw={...reading,language,question:'字'.repeat(QUESTION_LIMIT)};
    const {id,createdAt,...input}=raw;const prepared=prepareAIReading(input);
    assert.ok(prepared.question.startsWith(input.question));assert.ok(prepared.question.length<=200);
    assert.deepEqual(Object.keys(prepared).sort(),['kind','language','question','spread','cards'].sort());
    assert.equal(input.question.length,QUESTION_LIMIT);assert.equal(prepared.cards.length,3);
    assert.throws(()=>prepareAIReading({...input,question:'字'.repeat(QUESTION_LIMIT+1)}),/QUESTION_LENGTH/);
  }
});
test('export freezes the current reading and includes only its completed answer in the selected language',()=>{
  const answer={readingId:reading.id,language:'zh',text:'完整解读。\n\n最后一个问题？',model:'gemini-test',truncated:true};
  const snapshot=makeExportSnapshot(reading,'zh',answer);
  assert.equal(snapshot.ai.text,answer.text);assert.equal(snapshot.ai.truncated,true);assert.ok(Object.isFrozen(snapshot.cards[0]));
  assert.equal(makeExportSnapshot(reading,'en',answer).ai,null);
  assert.equal(makeExportSnapshot(reading,'zh',{...answer,readingId:'other'}).ai,null);
  const blocks=reportBlocks(snapshot);assert.equal(blocks.find(b=>b.type==='question').text,reading.question);
  assert.equal(blocks.find(b=>b.type==='ai').text,answer.text);assert.ok(blocks.some(b=>b.type==='warning'));
  assert.ok(blocks.some(b=>b.type==='attributes'&&b.text.includes('太阳／摩羯座')));
  assert.ok(blocks.some(b=>b.type==='heading'&&b.text.includes('星币四')&&b.text.includes('逆位')));
  const cardHeadings=blocks.filter(b=>b.type==='heading'&&/^\d\d \/ /.test(b.text));
  assert.equal(cardHeadings.length,3);
  assert.ok(cardHeadings[0].text.includes('来处与背景'));assert.ok(!cardHeadings[0].text.includes('可能的方向'));
  assert.ok(cardHeadings[1].text.includes('当下的状态'));assert.ok(!cardHeadings[1].text.includes('来处与背景'));
  assert.ok(cardHeadings[2].text.includes('可能的方向'));
  assert.ok(reportBlocks(makeExportSnapshot(reading,'zh')).some(b=>b.text?.includes('尚无已完成')));
  assert.throws(()=>makeExportSnapshot({...reading,createdAt:'not-a-date'},'zh'),/INVALID_EXPORT/);
  assert.throws(()=>makeExportSnapshot(reading,'zh',{...answer,text:'x'.repeat(16001)}),/INVALID_EXPORT/);
});
test('long-image wrapping preserves Chinese, English, paragraph breaks, long words and emoji clusters',()=>{
  const segment=text=>[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(s=>s.segment);
  const measure=text=>segment(text).length;
  const text='中文标点，与English words 混排。\n\n'+'longword'.repeat(7)+' 👩‍👩‍👧‍👦 é';
  const lines=wrapText(text,20,measure);
  assert.ok(lines.every(line=>measure(line)<=20));assert.ok(lines.includes(''));
  assert.equal(lines.join('').replace(/\s/g,''),text.replace(/\s/g,''));
  assert.ok(lines.some(line=>line.includes('👩‍👩‍👧‍👦')));assert.ok(lines.some(line=>line.includes('é')));
  const long='最后一段也应完整保留。'.repeat(1200);
  assert.equal(wrapText(long,37,measure).join(''),long);
});
test('PNG sizing keeps long answers within mobile canvas memory and dimension limits',()=>{
  for(const height of [600,4000,12000,24000,60000]){
    const scale=canvasScale(height);
    assert.ok(scale>0&&scale<=1.5);assert.ok(height*scale<=16000.0001);
    assert.ok(1000*height*scale*scale<=12000000.001);
  }
});
