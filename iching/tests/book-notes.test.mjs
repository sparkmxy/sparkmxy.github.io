import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOK_NOTES, BOOK_SOURCE } from '../book-notes.mjs';
import { HEXAGRAMS } from '../hexagrams.mjs';

const keys = Object.keys(BOOK_NOTES).map(Number).sort((a, b) => a - b);
const upperPrintedStarts = [1,16,27,34,40,46,52,57,62,68,73,79,85,90,95,100,105,110,115,120,126,132,138,143,149,154,160,165,170,176,181,187,192,197,202,208,214,219];
const lowerPrintedStarts = [225,231,237,243,250,256,262,268,273,279,285,291,298,304,310,316,321,327,332,337,341,346,351,357,363,368];
const text = paragraphs => (Array.isArray(paragraphs) ? paragraphs.join('') : paragraphs || '').replace(/\s/g, '');

function passages(book) {
  const result = ['judgment', 'tuan', 'image'].map(field => [field, book[field]]);
  for (const field of ['lines', 'lineImages']) {
    assert.equal(book[field]?.length, 6, `${book.number}.${field}`);
    result.push(...book[field].map((passage, i) => [`${field}.${i}`, passage]));
  }
  if (book.number <= 2) result.push(['useAll', book.useAll], ['useAllImage', book.useAllImage]);
  return result;
}

function assertParagraphs(value, label, required = false) {
  assert.ok(Array.isArray(value), `${label} must be paragraph arrays`);
  assert.ok(value.every(p => typeof p === 'string' && p.trim()), `${label} contains empty/non-text paragraphs`);
  if (required) assert.ok(value.length, `${label} missing`);
}

function assertPages(pages, number, label) {
  assert.ok(Array.isArray(pages) && pages.length, `${label} source pages missing`);
  assert.deepEqual([...new Set(pages)].sort((a,b) => a-b), pages, `${label} pages should be unique and ordered`);
  const starts = number <= 38 ? upperPrintedStarts.map(p => p + 31) : lowerPrintedStarts.map(p => p - 217);
  const index = number <= 38 ? number - 1 : number - 39;
  const first = starts[index];
  const last = starts[index + 1] ? starts[index + 1] - 1 : number <= 38 ? 255 : 156;
  assert.ok(pages.every(page => Number.isInteger(page) && page >= first && page <= last), `${label}: pages ${pages} outside chapter ${first}–${last}`);
}

test('source metadata and coverage correspond to the supplied books', () => {
  assert.deepEqual(BOOK_SOURCE.authors, ['黄寿祺', '张善文']);
  assert.equal(BOOK_SOURCE.publisher, '上海古籍出版社');
  assert.match(BOOK_SOURCE.title, /周易译注/);
  assert.equal(BOOK_SOURCE.ocr, true);
  assert.deepEqual(BOOK_SOURCE.coverage, [1, 64]);
  assert.deepEqual(keys, Array.from({ length: 64 }, (_, i) => i + 1));
  const upper = BOOK_SOURCE.volumes.upper;
  assert.equal(upper.pdfPageOffset, 31);
  assert.equal(upper.pdfPages, 255);
  assert.equal(BOOK_SOURCE.volumes.lower.pdfPageOffset, -217);
  assert.equal(BOOK_SOURCE.volumes.lower.pdfPages, 269);
  assert.deepEqual(upper.coverage, [1, 38]);
  assert.deepEqual(BOOK_SOURCE.volumes.lower.coverage, [39, 64]);
});

test('every displayed classical passage has translations, typed notes and source pages', () => {
  let count = 0;
  for (const number of keys) {
    const book = BOOK_NOTES[number];
    assert.equal(book.number, number);
    assert.equal(book.name, HEXAGRAMS.find(hex => hex.number === number).name);
    if (BOOK_SOURCE.volumes) assert.equal(book.volume, number <= 38 ? 'upper' : 'lower');
    for (const [field, passage] of passages(book)) {
      const label = `${number}.${field}`;
      assert.ok(passage, `${label} missing`);
      assertParagraphs(passage.translation, `${label}.translation`, true);
      assertParagraphs(passage.notes, `${label}.notes`);
      assertParagraphs(passage.explanation, `${label}.explanation`);
      assertPages(passage.pages, number, label);
      count++;
    }
    assertParagraphs(book.overview, `${number}.overview`, true);
    assertPages(book.overviewPages, number, `${number}.overview`);
  }
  assert.equal(count, 964);
});

test('cross-page notes and overviews preserve the beginning and end of source paragraphs', () => {
  const qian = BOOK_NOTES[1], kun = BOOK_NOTES[2], kui = BOOK_NOTES[38];
  assert.deepEqual(qian.lines[0].pages, [32,33]);
  assert.match(text(qian.lines[0].notes), /气从下生/);
  // A three-character continuation on PDF33 used to be lost as OCR noise.
  assert.match(text(qian.lines[2].notes), /健而又健/);
  assert.deepEqual(kun.lines[2].pages, [50,51]);
  assert.match(text(kun.lines[2].translation), /谨守臣职至终/);
  assert.deepEqual(qian.overviewPages, [45,46]);
  assert.match(text(qian.overview), /六十四卦之首/);
  assert.match(text(qian.overview), /所具备的重要特色[。.]?$/);
  assert.deepEqual(kun.overviewPages, [56,57]);
  assert.match(text(kun.overview), /发展的源泉[。.]?$/);
  assert.deepEqual(kui.overviewPages, [255]);
  assert.match(text(kui.overview), /人情物理/);
  assert.match(text(kui.overview), /显露出应有的色彩[。.]?$/);
});

test('Qian grouped small-image commentary remains complete and explicitly shared', () => {
  const qian = BOOK_NOTES[1];
  const grouped = [...qian.lineImages, qian.useAllImage];
  for (const passage of grouped) {
    assert.match(passage.noteScope, /合释乾卦六爻及用九/);
    assert.equal(passage.notes.length, 5);
    assert.deepEqual(passage.notes, grouped[0].notes);
    assert.deepEqual(passage.pages, [37,38]);
    assert.match(text(passage.explanation), /一则[。.]?$/);
    assert.doesNotMatch(text(passage.explanation), /元者.{0,2}善之长也/);
  }
  assert.equal(new Set(grouped.map(p => text(p.translation))).size, 7);
});

test('late-volume source anchors distinguish translation, notes and explanation', () => {
  const kui = BOOK_NOTES[38];
  assert.match(text(kui.image.translation), /上为火下为泽/);
  assert.match(text(kui.image.translation), /存小异/);
  assert.match(text(kui.lines[4].translation), /前往有何咎害/);
  assert.match(text(kui.lineImages[5].translation), /种种猜疑都已经消失/);
  assert.equal(kui.lineImages[3].notes.length, 0, 'PDF254九四小象原书没有独立注释');
  assert.equal(kui.lineImages[4].notes.length, 0, 'PDF254六五小象原书没有独立注释');
  assert.ok(kui.lineImages[3].explanation.length);
  assert.ok(kui.lineImages[4].explanation.length);
  assert.doesNotMatch(text(kui.lineImages[2].translation), /遇刚[：:]/, 'a full-width annotation must not leak into the translation column');
});

test('lower-volume source anchors preserve difficult column layouts and short continuations', () => {
  assert.deepEqual(BOOK_NOTES[39].judgment.pages, [8]);
  assert.match(text(BOOK_NOTES[39].lineImages[4].translation), /保持阳刚中正的气节[。.]?$/);
  assert.doesNotMatch(text(BOOK_NOTES[39].lineImages[4].translation), /中节[：:]/);
  assert.deepEqual(BOOK_NOTES[55].lineImages[3].pages, [108]);
  assert.match(text(BOOK_NOTES[55].lineImages[3].translation), /幽暗而不见光亮/);
  assert.match(text(BOOK_NOTES[55].lineImages[3].translation), /宜于前行[。.]?$/);
  assert.match(text(BOOK_NOTES[54].lineImages[0].translation), /相与奉承夫君[。.]?$/);
  assert.match(text(BOOK_NOTES[56].lineImages[2].translation), /其理必致丧亡[。.]?$/);
  assert.equal(BOOK_NOTES[56].lineImages[2].notes.length, 0, 'PDF112 has explanation, no separate notes');
  assert.match(text(BOOK_NOTES[56].lineImages[2].explanation), /位愈高，刚愈亢，则祸愈深矣/);
  assert.match(text(BOOK_NOTES[60].lineImages[1].translation), /时机[。.]?$/);
  assert.deepEqual(BOOK_NOTES[64].judgment.pages, [151]);
});

test('reconstructed scan passages and corrected printed typo are explicitly identified', () => {
  const faint = [BOOK_NOTES[46].lines[5], BOOK_NOTES[46].lineImages[5], BOOK_NOTES[47].judgment, BOOK_NOTES[47].tuan];
  for (const passage of faint) {
    assert.equal(passage.translationNote, '原扫描页此段译文不清，以下依本段经文及书中注释整理。');
    assertParagraphs(passage.translation, 'editorial reconstruction', true);
  }
  assert.match(text(BOOK_NOTES[46].lines[5].notes), /冥升，利于不息之贞/);
  assert.match(text(BOOK_NOTES[47].tuan.notes), /刚揜也/);
  const corrected = BOOK_NOTES[50].lines[2];
  assert.match(text(corrected.translation), /^九三/);
  assert.match(corrected.translationNote, /原扫描作“九四”/);
});
