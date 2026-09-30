import { requestInterpretation } from './ai-client.mjs';

export function createAIReadingUI(document, endpoint, request = requestInterpretation) {
  const $ = selector => document.querySelector(selector);
  const controls = $('#ai-controls'), button = $('#ai-interpret'), panel = $('#ai-panel');
  const status = $('#ai-status'), error = $('#ai-error'), answer = $('#ai-answer');
  const retry = $('#ai-retry'), cancel = $('#ai-cancel');
  let reading = null, controller = null, generation = 0, completed = false;

  function reset() {
    generation++;
    controller?.abort(); controller = null; reading = null; completed = false;
    controls.hidden = true; panel.hidden = true; error.hidden = true;
    answer.textContent = ''; status.textContent = ''; $('#ai-meta').textContent = '';
    $('#ai-partial').hidden = true; cancel.hidden = true; retry.hidden = true;
    button.disabled = false; button.textContent = 'AI 解卦';
    panel.setAttribute('aria-busy', 'false');
  }

  function showPanel() {
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'auto', block: 'start' });
    panel.focus({ preventScroll: true });
  }

  async function generate(force = false) {
    if (!reading || controller) return;
    showPanel();
    if (completed && !force) return;
    const id = ++generation;
    controller = new AbortController();
    const { signal } = controller;
    completed = false; button.disabled = true; retry.hidden = true; cancel.hidden = false;
    button.textContent = '正在解卦…'; status.textContent = '正在结合所问之事与卦象解读，请稍候…';
    panel.setAttribute('aria-busy', 'true');
    error.hidden = true; answer.textContent = ''; $('#ai-meta').textContent = ''; $('#ai-partial').hidden = true;
    try {
      const result = await request(reading, { endpoint, signal });
      if (id !== generation) return;
      // Model output is always text, never HTML (including model-supplied links).
      answer.textContent = result.text;
      $('#ai-meta').textContent = `由 Gemini 生成 · ${result.model}`;
      $('#ai-partial').hidden = !result.truncated;
      status.textContent = result.truncated ? '已收到部分解读。' : '解读已完成。';
      button.textContent = '查看 AI 解卦'; retry.hidden = false; completed = true;
    } catch (reason) {
      if (id !== generation) return;
      if (signal.aborted) status.textContent = '已停止等待，可以重新解卦。';
      else {
        error.textContent = reason?.message || '解卦暂时未能完成，请稍后重试。';
        error.hidden = false; status.textContent = '本次解读未完成。';
      }
      button.textContent = '重新 AI 解卦';
    } finally {
      if (id === generation) {
        controller = null; button.disabled = false; cancel.hidden = true;
        panel.setAttribute('aria-busy', 'false');
      }
    }
  }

  button.addEventListener('click', () => generate());
  retry.addEventListener('click', () => generate(true));
  cancel.addEventListener('click', () => controller?.abort());
  reset();
  return {
    reset,
    showReading(record) {
      reset();
      // Capture the question that was used for this cast, not later textarea edits.
      reading = { question: record.question, lines: record.lines.map(line => ({ value: line.value })) };
      controls.hidden = false;
      $('#ai-question-note').textContent = reading.question ? '结合本次所问之事与卦象解读。' : '未填写所问之事，将解读整体卦意。';
      $('#ai-question').textContent = reading.question || '未填写所问之事 · 解读整体卦意';
    },
  };
}
