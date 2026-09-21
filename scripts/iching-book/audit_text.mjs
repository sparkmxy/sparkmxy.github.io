// Candidate discovery only. Every finding requires comparison with the source PDF.
import { BOOK_NOTES } from '../../iching/book-notes.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const candidates = [];
const trigrams = Object.fromEntries([... '乾兑离震巽坎艮坤'].map((name, i) => [name, [...'☰☱☲☳☴☵☶☷'][i]]));
let paragraphs = 0;
function examine(number, field, values, pages) {
  values.forEach((text, index) => {
    paragraphs++;
    const reasons = [];
    const letters = [...text.matchAll(/[A-Za-z\u00c0-\u024f\u1e00-\u1eff]+/gu)].map(match => ({
      token: match[0], context: text.slice(Math.max(0, match.index - 15), match.index + match[0].length + 15),
    }));
    if (letters.length) reasons.push('latin');
    const symbols = [...text.matchAll(/[乾兑离震巽坎艮坤][（(][^）)]{0,12}[）)]/gu)].map(match => match[0]);
    // “震（指互震）” explains a trigram; it is not a damaged symbol.
    if (symbols.some(value => !value.includes('指') && !value.includes(trigrams[value[0]]))) reasons.push('trigram');
    if (/[\u2630-\u2637]/u.test(text) && symbols.some(value => [...value].some(char => /[\u2630-\u2637]/u.test(char) && char !== trigrams[value[0]]))) reasons.push('wrong-trigram');
    if (/[�□■]|\(cid:|[\[\]【】]/u.test(text)) reasons.push('garbled-mark');
    if (/[0-9]/u.test(text)) reasons.push('arabic-digit');
    if (/[<>=|¬°｛｝{}]/u.test(text)) reasons.push('stray-symbol');
    if (!/[。！？!?）)》”’]$/u.test(text)) reasons.push('abrupt-ending');
    if (/[，、；：,;:][”’）)]*$/u.test(text)) reasons.push('unfinished-clause');
    const opened = [...text].filter(char => char === '《').length;
    const closed = [...text].filter(char => char === '》').length;
    if (opened !== closed) reasons.push('unbalanced-title');
    for (const [left, right] of [['“', '”'], ['‘', '’']]) {
      if ([...text].filter(char => char === left).length !== [...text].filter(char => char === right).length) reasons.push('unbalanced-quote');
    }
    if (/[「」『』]/u.test(text)) reasons.push('quote-ocr');
    if ([...text].filter(char => char === '（' || char === '(').length !== [...text].filter(char => char === '）' || char === ')').length) reasons.push('unbalanced-parenthesis');
    if (reasons.length) candidates.push({ number, field, index, pages, reasons, letters, symbols, text });
  });
}
for (const book of Object.values(BOOK_NOTES)) {
  examine(book.number, 'overview', book.overview, book.overviewPages);
  for (const key of ['judgment', 'tuan', 'image', 'lines', 'lineImages', 'useAll', 'useAllImage']) {
    if (!book[key]) continue;
    const entries = Array.isArray(book[key]) ? book[key].map((entry, i) => [`${key}.${i}`, entry]) : [[key, book[key]]];
    for (const [field, entry] of entries) {
      for (const part of ['translation', 'notes', 'explanation']) examine(book.number, `${field}.${part}`, entry[part] || [], entry.pages);
    }
  }
}
const summary = { paragraphs, candidates: candidates.length, reasons: Object.fromEntries([...new Set(candidates.flatMap(item => item.reasons))].map(reason => [reason, candidates.filter(item => item.reasons.includes(reason)).length])) };
if (process.argv[2]) {
  await mkdir(path.dirname(process.argv[2]), { recursive: true });
  await writeFile(process.argv[2], JSON.stringify(candidates, null, 2));
}
console.log(JSON.stringify(summary, null, 2));
