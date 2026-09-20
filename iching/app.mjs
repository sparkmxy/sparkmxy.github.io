import { createCast, YARROW_MODEL } from './core.mjs';
import { getEntropy } from './random.mjs';
import { HEXAGRAMS, getHexagram, TRIGRAMS } from './hexagrams.mjs';

const $ = (selector) => document.querySelector(selector);
const positions = ['初', '二', '三', '四', '五', '上'];
const numerals = ['一', '二', '三'];
const lineNames = { 6: '老阴', 7: '少阳', 8: '少阴', 9: '老阳' };
const storageKey = 'jingguan.readings.v1';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let current = null;
let revealed = 0;
let running = false;
let playing = false;
let toastTimer;
let exportUrl = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function moving(value) { return value === 6 || value === 9; }
function bitsOf(values, changed = false) {
  return values.map(value => changed && moving(value) ? String(1 - value % 2) : String(value % 2)).join('');
}
function hexOf(record, changed = false) { return getHexagram(bitsOf(record.lines.map(line => line.value), changed)); }
function sourceLink(hex, className = 'source-citation') {
  const a = el('a', className, '《周易》原文 ↗');
  a.href = hex.source; a.target = '_blank'; a.rel = 'noopener noreferrer';
  return a;
}
function dateText(value) { return new Date(value).toLocaleString('zh-CN', { hour12: false }); }
function drawLines(container, values, count = 6, showMoving = true, animate = false) {
  container.replaceChildren();
  values.forEach((value, i) => {
    const shown = i < count;
    const row = el('div', `yao-row${shown ? '' : ' placeholder'}${shown && showMoving && moving(value) ? ' moving' : ''}${animate && i === count - 1 ? ' fresh' : ''}`);
    row.setAttribute('aria-label', shown ? `${positions[i]}爻：${lineNames[value]}${moving(value) && showMoving ? '，动爻' : ''}` : `${positions[i]}爻：待生成`);
    const bars = el('span', 'yao-bars'); bars.setAttribute('aria-hidden', 'true'); bars.append(el('span'));
    if (value % 2 === 0) bars.append(el('span'));
    row.append(bars, el('span', 'yao-position', positions[i])); container.append(row);
  });
}
drawLines($('#stage-lines'), Array(6).fill(7), 0);

function showToast(message) {
  clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3500);
}
function setLocked(locked) {
  running = locked;
  $('#question').disabled = locked;
  $('#cast-form').querySelectorAll('button, input').forEach(node => { node.disabled = locked; });
  $('#ritual-stage').setAttribute('aria-busy', String(locked));
  if ($('#history-dialog').open) renderHistory();
}
function resetStage() {
  revealed = 0; drawLines($('#stage-lines'), Array(6).fill(7), 0);
  $('#stage-title').textContent = '静候随机';
  $('#stage-description').textContent = '正在取得本次占筮所用的随机数…';
  $('#stage-counter').textContent = '0 / 18 变';
  $('#stage-controls').hidden = true;
}
async function startCast(manual) {
  if (running) return;
  setLocked(true); $('#cast-error').hidden = true; resetStage();
  $('#result').hidden = true;
  const source = $('input[name="source"]:checked').value;
  try {
    const entropy = await getEntropy(source, { apiKey: $('#api-key').value.trim() });
    const cast = createCast(entropy.drawInt);
    current = {
      version: 1, createdAt: new Date().toISOString(), question: $('#question').value.trim(),
      model: YARROW_MODEL, lines: cast.lines, entropy: structuredClone(entropy.audit),
    };
    $('#stage-title').textContent = '四十九蓍';
    $('#stage-description').textContent = '从初爻开始，分二、挂一、揲四、归奇。';
    if (manual) {
      $('#stage-controls').hidden = false;
      $('#next-step').textContent = '行第一变';
      $('#next-step').focus({ preventScroll: true });
    } else await playRemaining();
  } catch (error) {
    current = null; setLocked(false);
    $('#stage-title').textContent = '尚未起卦';
    $('#stage-description').textContent = '随机源未就绪，本次没有生成卦象。';
    $('#cast-error').textContent = error.message || '随机数获取失败，请稍后重试，或自行选择另一随机来源。';
    $('#cast-error').hidden = false;
  }
}
function advanceStep() {
  if (!current || revealed >= 18) return;
  const lineIndex = Math.floor(revealed / 3), stepIndex = revealed % 3;
  const line = current.lines[lineIndex], step = line.steps[stepIndex];
  revealed++;
  const completeLines = Math.floor(revealed / 3);
  drawLines($('#stage-lines'), current.lines.map(l => l.value), completeLines, true, revealed % 3 === 0);
  $('#stage-counter').textContent = `${revealed} / 18 变`;
  $('#stage-title').textContent = `${positions[lineIndex]}爻 · 第${numerals[stepIndex]}变`;
  $('#stage-description').textContent = `左 ${step.left} · 右 ${step.right}，挂一；余 ${step.leftRemainder} 与 ${step.rightRemainder}，归奇 ${step.removed}，余蓍 ${step.remaining}。${stepIndex === 2 ? `得 ${line.value}，为${lineNames[line.value]}。` : ''}`;
  $('#next-step').textContent = revealed % 3 === 0 ? '起下一爻' : `行第${numerals[revealed % 3]}变`;
  if (revealed === 18) finishReading();
}
async function playRemaining() {
  if (playing) return;
  playing = true; $('#stage-controls').hidden = true;
  while (current && revealed < 18) {
    if (!reducedMotion) await new Promise(resolve => setTimeout(resolve, 280));
    advanceStep();
  }
  playing = false;
}
function finishReading() {
  $('#stage-controls').hidden = true; setLocked(false);
  const original = hexOf(current), changed = hexOf(current, true);
  const count = current.lines.filter(l => moving(l.value)).length;
  $('#stage-title').textContent = `${original.name}${count ? ` 之 ${changed.name}` : ' · 六爻皆静'}`;
  $('#stage-description').textContent = `十八变毕，${count ? `${count} 爻动` : '无动爻'}。向下观象，静读卦辞。`;
  renderReading(current);
}
function trigramText(hex) {
  const lower = TRIGRAMS.find(t => t.bits === hex.bits.slice(0, 3));
  const upper = TRIGRAMS.find(t => t.bits === hex.bits.slice(3));
  return upper && lower ? `${upper.name}上 · ${lower.name}下` : hex.title;
}
function hexCard(hex, label, values, isChanged) {
  const card = el('article', 'hex-card');
  const diagram = el('div', 'stage-lines');
  drawLines(diagram, values, 6, !isChanged);
  const text = el('div');
  text.append(el('span', 'small-label', `${label} / 第 ${hex.number} 卦`), el('h3', '', hex.name), el('p', 'hex-title', `${hex.title} · ${trigramText(hex)}`), el('p', 'judgment', hex.judgment), sourceLink(hex));
  card.append(diagram, text); return card;
}
function renderReading(record) {
  $('#result-date').textContent = dateText(record.createdAt);
  $('#result-question').textContent = record.question;
  $('#result-question').hidden = !record.question;
  const values = record.lines.map(l => l.value), original = hexOf(record), changed = hexOf(record, true);
  const changedValues = values.map(value => moving(value) ? (value === 6 ? 7 : 8) : value);
  const movingIndices = values.map((value, i) => moving(value) ? i : -1).filter(i => i >= 0);
  $('#hexagram-pair').replaceChildren(hexCard(original, '本卦', values, false), hexCard(changed, movingIndices.length ? '之卦' : '之卦 · 不变', changedValues, true));
  const reading = $('#reading-text'); reading.replaceChildren();
  reading.append(el('h3', '', movingIndices.length ? `${movingIndices.length} 爻动 · 参读爻辞` : '六爻皆静 · 参读卦辞'));
  reading.append(el('p', 'reading-intro', movingIndices.length ? '朱色为动爻，老阴变阳，老阳变阴。以下列出本卦动爻，结合两卦卦辞参读。' : '本卦与之卦相同。此时可从本卦卦辞出发，观照所问之事。'));
  movingIndices.forEach(i => {
    const p = el('p', 'moving-text');
    p.append(el('strong', '', `${positions[i]}爻 · ${lineNames[values[i]]}  `), document.createTextNode(original.lines[i])); reading.append(p);
  });
  if (movingIndices.length === 6 && original.useAll) reading.append(el('p', 'moving-text', original.useAll));
  const all = el('details', 'all-lines');
  all.append(el('summary', '', '展开本卦六爻经文 ＋'));
  original.lines.forEach(line => all.append(el('p', '', line)));
  if (original.useAll) all.append(el('p', '', original.useAll));
  reading.append(all);
  const body = $('#audit-body'); body.replaceChildren();
  record.lines.forEach((line, i) => line.steps.forEach((step, j) => {
    const row = el('tr');
    [`${positions[i]}爻 / ${numerals[j]}变`, step.before, `${step.left} / ${step.right}`, step.hanging, `${step.leftRemainder} / ${step.rightRemainder}`, step.removed, step.remaining].forEach(value => row.append(el('td', '', String(value)))); body.append(row);
  }));
  $('#audit-source').textContent = `随机来源：${record.entropy.label}。取得时间：${dateText(record.entropy.fetchedAt)}。完整原始随机数及抽样记录可通过「导出完整卦记」保存。`;
  $('#save-status').textContent = '';
  $('#save-reading').disabled = false;
  $('#result').hidden = false;
}

function openHexagram(hex) {
  const content = $('#hexagram-dialog-content'); content.replaceChildren();
  const head = el('div', 'dialog-hex-header');
  const symbol = el('span', 'hex-symbol', String.fromCodePoint(0x4dc0 + hex.number - 1)); symbol.setAttribute('aria-hidden', 'true');
  const title = el('div'); const heading = el('h2', '', hex.title); heading.id = 'dialog-hex-title';
  title.append(el('span', 'small-label', `第 ${hex.number} 卦 · ${trigramText(hex)}`), heading);
  head.append(symbol, title); content.append(head, el('p', 'dialog-judgment', hex.judgment));
  hex.lines.forEach(line => content.append(el('p', 'dialog-yao', line)));
  if (hex.useAll) content.append(el('p', 'dialog-yao', hex.useAll));
  content.append(sourceLink(hex, 'dialog-source'));
  $('#hexagram-dialog').showModal();
}
function renderLibrary(query = '') {
  const search = query.trim().toLowerCase(); const library = $('#hexagram-library'); library.replaceChildren();
  const matches = HEXAGRAMS.filter(hex => !search || `${hex.name} ${hex.title}`.toLowerCase().includes(search) || String(hex.number) === search);
  matches.forEach(hex => {
    const button = el('button', 'library-item'); button.type = 'button';
    button.setAttribute('aria-label', `第${hex.number}卦 ${hex.title}，查看经文`);
    const symbol = el('span', 'hex-symbol', String.fromCodePoint(0x4dc0 + hex.number - 1)); symbol.setAttribute('aria-hidden', 'true');
    button.append(el('span', 'hex-number', String(hex.number).padStart(2, '0')), symbol, el('span', 'hex-name', hex.name));
    button.addEventListener('click', () => openHexagram(hex)); library.append(button);
  });
  $('#library-empty').hidden = matches.length > 0;
}
function validateRecord(record) {
  return record && record.version === 1 && typeof record.createdAt === 'string' && Number.isFinite(Date.parse(record.createdAt)) && typeof record.question === 'string' && record.question.length <= 200 && record.entropy && typeof record.entropy.label === 'string' && typeof record.entropy.fetchedAt === 'string' && Array.isArray(record.lines) && record.lines.length === 6 && record.lines.every(line => line && [6,7,8,9].includes(line.value) && Array.isArray(line.steps) && line.steps.length === 3 && line.steps.every(step => step && ['before','left','right','hanging','leftRemainder','rightRemainder','removed','remaining'].every(key => Number.isInteger(step[key]))));
}
function loadHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(data) ? data.filter(validateRecord).slice(0, 30) : [];
  } catch { return []; }
}
function persistHistory(records) {
  try { localStorage.setItem(storageKey, JSON.stringify(records)); return true; }
  catch { showToast('浏览器未允许保存或空间已满，请改用导出卦记。'); return false; }
}
function saveCurrent() {
  if (!current || revealed !== 18) return;
  const history = loadHistory();
  if (!history.some(record => record.createdAt === current.createdAt)) history.unshift(current);
  if (persistHistory(history.slice(0, 30))) {
    $('#save-status').textContent = '已保存在此浏览器（最多 30 卦）'; $('#save-reading').disabled = true;
  }
}
function renderHistory() {
  const list = $('#history-list'); list.replaceChildren();
  const records = loadHistory();
  if (!records.length) { list.append(el('p', 'field-note', '尚无卦记。起卦后，点击「收藏此卦」将它留存。')); return; }
  records.forEach(record => {
    const original = hexOf(record), changed = hexOf(record, true);
    const item = el('article', 'history-item'); const head = el('div', 'history-item-top');
    head.append(el('h3', '', original.number === changed.number ? original.title : `${original.name} 之 ${changed.name}`), el('span', 'muted', dateText(record.createdAt)));
    item.append(head, el('p', '', record.question || '未记所问之事'));
    const controls = el('div', 'history-controls'); const open = el('button', 'text-button', '重读此卦 →'); open.type = 'button';
    open.disabled = running;
    open.addEventListener('click', () => {
      if (running) return;
      current = record; revealed = 18; finishReading();
      drawLines($('#stage-lines'), current.lines.map(l => l.value)); $('#stage-counter').textContent = '18 / 18 变';
      $('#history-dialog').close(); $('#result').scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' }); $('#result').focus({ preventScroll: true });
    });
    const remove = el('button', 'text-button', '删除'); remove.type = 'button';
    remove.addEventListener('click', () => {
      if (persistHistory(loadHistory().filter(entry => entry.createdAt !== record.createdAt))) renderHistory();
    });
    controls.append(open, remove); item.append(controls); list.append(item);
  });
}
function exportCurrent() {
  if (!current || revealed !== 18) return;
  const record = { ...current, original: { number: hexOf(current).number, name: hexOf(current).name }, transformed: { number: hexOf(current, true).number, name: hexOf(current, true).name }, note: '六爻按自下而上顺序。原始随机数用于复算，不是第三方签名证明。' };
  const json = JSON.stringify(record, null, 2);
  if (exportUrl) URL.revokeObjectURL(exportUrl);
  exportUrl = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }));
  $('#download-json').href = exportUrl;
  $('#download-json').download = `静观-${current.createdAt.replace(/[:.]/g, '-')}.json`;
  $('#export-json').value = json;
  $('#export-status').textContent = '';
  $('#export-dialog').showModal();
}

$('#cast-form').addEventListener('submit', event => { event.preventDefault(); startCast(false); });
$('#manual-button').addEventListener('click', () => startCast(true));
$('#next-step').addEventListener('click', advanceStep);
$('#finish-cast').addEventListener('click', playRemaining);
$('#question').addEventListener('input', () => { $('#question-count').textContent = `${$('#question').value.length} / 200`; });
document.querySelectorAll('input[name="source"]').forEach(input => input.addEventListener('change', () => {
  const needsKey = $('input[name="source"]:checked').value === 'random-org-api';
  $('#api-key-field').hidden = !needsKey; $('#api-key').required = needsKey; $('#cast-error').hidden = true;
}));
$('#hexagram-search').addEventListener('input', event => renderLibrary(event.target.value));
$('#history-button').addEventListener('click', () => { renderHistory(); $('#history-dialog').showModal(); });
$('#save-reading').addEventListener('click', saveCurrent);
$('#export-reading').addEventListener('click', exportCurrent);
$('#copy-json').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#export-json').value);
    $('#export-status').textContent = '完整记录已复制。';
  } catch {
    $('#export-json').focus(); $('#export-json').select();
    $('#export-status').textContent = '已选中完整记录，请按 Ctrl+C（Mac 按 ⌘C）复制。';
  }
});
$('#export-dialog').addEventListener('close', () => {
  if (exportUrl) URL.revokeObjectURL(exportUrl);
  exportUrl = null;
});
document.querySelectorAll('.close-dialog').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }
}));
renderLibrary();
