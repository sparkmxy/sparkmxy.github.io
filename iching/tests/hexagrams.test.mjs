import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { HEXAGRAMS, TRIGRAMS, getHexagram } from '../hexagrams.mjs';

// Independent King Wen order, expressed from 初爻 to 上爻.
const expectedBits = `
111111 000000 100010 010001 111010 010111 010000 000010
111011 110111 111000 000111 101111 111101 001000 000100
100110 011001 110000 000011 100101 101001 000001 100000
100111 111001 100001 011110 010010 101101 001110 011100
001111 111100 000101 101000 101011 110101 001010 010100
110001 100011 111110 011111 000110 011000 010110 011010
101110 011101 100100 001001 001011 110100 101100 001101
011011 110110 010011 110010 110011 001100 101010 010101
`.trim().split(/\s+/);

test('all 64 hexagrams match the King Wen order without collisions', () => {
  assert.equal(HEXAGRAMS.length, 64);
  assert.equal(new Set(HEXAGRAMS.map(h => h.bits)).size, 64);
  assert.deepEqual(HEXAGRAMS.map(h => h.bits), expectedBits);
  for (const [index, hexagram] of HEXAGRAMS.entries()) {
    assert.equal(hexagram.number, index + 1);
    assert.equal(getHexagram(hexagram.bits), hexagram);
    assert.ok(hexagram.judgment.length > 0);
    assert.ok(hexagram.title.endsWith(hexagram.name) || hexagram.title.includes('为'));
    assert.match(hexagram.source, /^https:\/\/zh\.wikisource\.org\/zh-hans\/周易\//);
  }
});

test('all 384 yao texts are ordered correctly and agree with the drawn yin/yang lines', () => {
  const positions = ['初', '二', '三', '四', '五', '上'];
  for (const hexagram of HEXAGRAMS) {
    assert.equal(hexagram.lines.length, 6);
    for (const [index, text] of hexagram.lines.entries()) {
      const label = text.slice(0, 2);
      assert.ok(label.includes(positions[index]), `${hexagram.name}: ${text}`);
      assert.equal(label.includes('九') ? '1' : '0', hexagram.bits[index]);
      assert.ok(text.length > 3);
      assert.doesNotMatch(text, /<[^>]*>|&#|undefined/);
    }
  }
});

test('乾坤 special use texts and asymmetric orientation anchors are present', () => {
  assert.equal(getHexagram('111111').useAll, '用九：见群龙无首，吉。');
  assert.equal(getHexagram('000000').useAll, '用六：利永贞。');
  assert.equal(HEXAGRAMS.filter(h => h.useAll).length, 2);
  assert.equal(getHexagram('111000').name, '泰');
  assert.equal(getHexagram('000111').name, '否');
  assert.equal(getHexagram('000001').judgment, '不利有攸往。');
  assert.equal(getHexagram('101010').name, '既济');
  assert.equal(getHexagram('010101').name, '未济');
  assert.equal(getHexagram('invalid'), undefined);
});

test('all eight bottom-to-top trigrams are complete', () => {
  assert.equal(TRIGRAMS.length, 8);
  assert.equal(new Set(TRIGRAMS.map(t => t.bits)).size, 8);
  assert.equal(TRIGRAMS.find(t => t.name === '震').bits, '100');
  assert.equal(TRIGRAMS.find(t => t.name === '艮').bits, '001');
});

test('adding the commentaries preserves all existing hexagram data', () => {
  const originalFields = HEXAGRAMS.map(({ tuan, image, lineImages, useAllImage, ...original }) => original);
  const digest = createHash('sha256').update(JSON.stringify(originalFields)).digest('hex');
  assert.equal(digest, '9da1d75f252931b997861faea791786bbe732a3ae38ecadb023beefca6658541');
});

test('all 64 彖传 and 大象 and all 384 小象 are complete, plain text, and immutable', () => {
  for (const hexagram of HEXAGRAMS) {
    assert.ok(hexagram.tuan.length > 20, `${hexagram.name} 彖传`);
    assert.ok(hexagram.image.length > 5, `${hexagram.name} 大象`);
    assert.equal(hexagram.lineImages.length, 6, `${hexagram.name} 小象`);
    assert.ok(Object.isFrozen(hexagram.lineImages));
    const texts = [hexagram.tuan, hexagram.image, ...hexagram.lineImages];
    if (hexagram.useAllImage) texts.push(hexagram.useAllImage);
    for (const text of texts) {
      assert.equal(typeof text, 'string');
      assert.ok(text.length > 2);
      assert.doesNotMatch(text, /<[^>]*>|&(?:#\d+|\w+);|undefined|文言曰|彖曰|象曰|\uFFFD/);
    }
  }
  assert.equal(HEXAGRAMS.filter(h => h.useAllImage).length, 2);
  assert.deepEqual(HEXAGRAMS.filter(h => h.useAllImage).map(h => h.number), [1, 2]);
});

// Exact source fixtures: https://zh.wikisource.org/zh-hans/周易/乾 and /坤.
// These include all nested 彖 paragraphs and keep 用九/用六 outside the six 小象.
test('乾坤 commentaries preserve full source text without including 文言', () => {
  const qian = getHexagram('111111');
  assert.equal(qian.tuan, '大哉乾元，万物资始，乃统天。云行雨施，品物流形，大明终始，六位时成。时乘六龙以御天，乾道变化，各正性命，保合大和〈一作太和〉，乃利贞。首出庶物，万国咸宁。');
  assert.equal(qian.image, '天行健，君子以自强不息。');
  assert.deepEqual(qian.lineImages, [
    '潜龙勿用，阳在下也。',
    '见龙在田，德施普也。',
    '终日乾乾，反复道也。',
    '或跃在渊，进无咎也。',
    '飞龙在天，大人造也。',
    '亢龙有悔，盈不可久也。',
  ]);
  assert.equal(qian.useAllImage, '用九，天德不可为首也。');

  const kun = getHexagram('000000');
  assert.equal(kun.tuan, '至哉坤元，万物资生，乃顺承天。坤厚载物，德合无疆；含弘光大，品物咸亨。牝马地类，行地无疆，柔顺利贞。君子攸行，先迷失道，后顺得常。西南得朋，乃与类行，东北丧朋，乃终有庆。安贞之吉，应地无疆。');
  assert.equal(kun.image, '地势坤，君子以厚德载物。');
  assert.deepEqual(kun.lineImages, [
    '履霜坚冰，阴始凝也。驯致其道，至坚冰也。',
    '六二之动，直以方也。不习无不利，地道光也。',
    '含章可贞，以时发也。或从王事，知光大也。',
    '括囊无咎，慎不害也。',
    '黄裳元吉，文在中也。',
    '龙战于野，其道穷也。',
  ]);
  assert.equal(kun.useAllImage, '用六永贞，以大终也。');
});

// Asymmetric source anchors catch accidental 上卦/下卦 or 爻序 reversal.
test('commentaries remain attached to the correct hexagrams and yao positions', () => {
  assert.equal(getHexagram('111010').image, '云上于天，需；君子以饮食宴乐。');
  assert.equal(getHexagram('010111').image, '天与水违行，讼；君子以作事谋始。');
  assert.equal(getHexagram('111000').image, '天地交，泰；后以财成天地之道，辅相天地之宜，以左右民。');
  assert.equal(getHexagram('000111').image, '天地不交，否；君子以俭德辟难，不可荣以禄。');
  const jiji = getHexagram('101010');
  assert.equal(jiji.tuan, '既济，亨，小者亨也。利贞，刚柔正而位当也。初吉，柔得中也。终止则乱，其道穷也。');
  assert.equal(jiji.image, '水在火上，既济；君子以思患而豫防之。');
  assert.deepEqual(jiji.lineImages, [
    '曳其轮，义无咎也。', '七日得，以中道也。', '三年克之，惫也。',
    '终日戒，有所疑也。', '东邻杀牛，不如西邻之时也；实受其福，吉大来也。', '濡其首厉，何可久也。',
  ]);
  const weiji = getHexagram('010101');
  assert.equal(weiji.tuan, '未济，亨；柔得中也。小狐汔济，未出中也。濡其尾，无攸利；不续终也。虽不当位，刚柔应也。');
  assert.equal(weiji.image, '火在水上，未济；君子以慎辨物居方。');
  assert.deepEqual(weiji.lineImages, [
    '濡其尾，亦不知极也。', '九二贞吉，中以行正也。', '未济征凶，位不当也。',
    '贞吉悔亡，志行也。', '君子之光，其晖吉也。', '饮酒濡首，亦不知节也。',
  ]);
});
