import test from 'node:test';
import assert from 'node:assert/strict';
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
