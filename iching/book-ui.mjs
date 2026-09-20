import { BOOK_NOTES, BOOK_SOURCE } from './book-notes.mjs';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function paragraphs(parent, text, className = '') {
  const items = Array.isArray(text) ? text : text ? [text] : [];
  items.filter(value => typeof value === 'string' && value.trim()).forEach(value => {
    parent.append(element('p', className, value));
  });
}

function sourceReference(pages, volume = 'upper') {
  const pdfPages = [...new Set(pages || [])].filter(Number.isInteger).sort((a, b) => a - b);
  const edition = BOOK_SOURCE.volumes?.[volume];
  const offset = edition?.pdfPageOffset ?? BOOK_SOURCE.pdfPageOffset ?? 31;
  const printed = pdfPages.map(page => page - offset).filter(page => page > 0);
  const spans = [];
  for (const page of printed) {
    const last = spans.at(-1);
    if (last && page === last[1] + 1) last[1] = page;
    else spans.push([page, page]);
  }
  const pageText = spans.map(([start, end]) => start === end ? String(start) : `${start}–${end}`).join('、');
  return `黄寿祺、张善文《周易译注》${volume === 'lower' ? '下册' : '上册'}${pageText ? ` · 书页 ${pageText}` : ''}`;
}

export function bookPassage(number, field, index) {
  const entry = BOOK_NOTES[number]?.[field];
  return index === undefined ? entry : entry?.[index];
}

/** Native details stays closed on every new render, including saved readings. */
export function bookDisclosure(number, field, index) {
  const passage = bookPassage(number, field, index);
  if (!passage) return null;
  const details = element('details', 'book-notes');
  const summary = element('summary');
  summary.append(element('span', '', '注释与白话译文'), element('span', 'book-toggle', '＋'));
  const body = element('div', 'book-notes-body');
  if (passage.noteScope) body.append(element('p', 'book-note-scope', passage.noteScope));
  for (const [key, title] of [['translation', '白话译文'], ['notes', '注释'], ['explanation', '说明']]) {
    const content = passage[key];
    if (!content || (Array.isArray(content) && content.length === 0)) continue;
    const section = element('section', `book-${key === 'notes' ? 'annotations' : key}`);
    section.append(element('p', 'book-subheading', title));
    if (key === 'translation' && passage.translationNote) {
      section.append(element('p', 'book-note-scope', passage.translationNote));
    }
    paragraphs(section, content);
    body.append(section);
  }
  body.append(element('p', 'book-citation', sourceReference(passage.pages, BOOK_NOTES[number].volume)));
  details.append(summary, body);
  return details;
}

export function appendBookDisclosure(parent, number, field, index) {
  const disclosure = bookDisclosure(number, field, index);
  if (disclosure) parent.append(disclosure);
}

export function bookOverview(hex, headingTag = 'h4') {
  const book = BOOK_NOTES[hex.number];
  const section = element('section', 'book-overview');
  section.setAttribute('aria-label', `${hex.name}卦总论`);
  section.append(element(headingTag, 'book-overview-heading', '总论'));
  if (!book) {
    section.append(element('p', 'book-unavailable', '此卦译注暂不可用。'));
    return section;
  }
  paragraphs(section, book.overview);
  section.append(element('p', 'book-citation', sourceReference(book.overviewPages, book.volume)));
  return section;
}
