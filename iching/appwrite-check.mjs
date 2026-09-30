import { parseProbeEndpoint, runProbeCheck, runInterpretationCheck } from './appwrite-check-client.mjs';

const $ = id => document.getElementById(id);
let report = {};
let running = false;
let checkedEndpoint = '';
const networkLabel = () => $('network').selectedOptions[0].textContent;
function result(id, message, state = '') { $(id).textContent = message; $(id).dataset.state = state; }
function updateButtons() {
  $('health').disabled = running;
  $('probe').disabled = running || !report.health?.ready || !checkedEndpoint;
  $('reading').disabled = running || !report.health?.ready || !report.health?.interpretationAvailable || !checkedEndpoint;
  $('generate').disabled = running; $('copy-token').disabled = running; $('token').disabled = running;
  $('endpoint').disabled = running;
  $('network').disabled = running;
}
function reset() {
  report = {}; checkedEndpoint = '';
  result('health-result', '尚未检查。');
  result('probe-result', '先完成入口检查，再测试 Gemini。');
  result('reading-result', '上传新版部署包并检查入口后可用。');
  $('reading-details').hidden = true; $('reading-answer').textContent = '';
  $('summary').textContent = '等待检查。仅入口连通，不代表 Gemini 已可用。';
  $('copy-status').textContent = '';
  updateButtons();
}
$('endpoint').addEventListener('input', reset);
$('network').addEventListener('change', reset);
$('token').addEventListener('input', () => { $('token-status').textContent = ''; });

$('generate').addEventListener('click', () => {
  $('token').value = [...crypto.getRandomValues(new Uint8Array(32))].map(value => value.toString(16).padStart(2, '0')).join('');
  $('token-status').textContent = '已生成；复制到 Appwrite 的 PROBE_TOKEN 后重新部署。';
});
$('copy-token').addEventListener('click', async () => {
  if (!$('token').value) { $('token-status').textContent = '请先生成或填写测试口令。'; return; }
  try { await navigator.clipboard.writeText($('token').value); $('token-status').textContent = '已复制测试口令。'; }
  catch { $('token-status').textContent = '无法自动复制，可选中输入框内容后手动复制。'; }
});

$('health').addEventListener('click', async () => {
  if (running) return;
  reset(); running = true; updateButtons();
  result('health-result', '正在检查 Appwrite 入口……');
  try {
    const endpoint = parseProbeEndpoint($('endpoint').value);
    report = { endpoint, network: networkLabel(), networkIsSelfReported: true, checkedAt: new Date().toISOString() };
    const health = await runProbeCheck(endpoint);
    checkedEndpoint = endpoint;
    report.health = health;
    result('health-result', health.ready ? 'Appwrite 入口已连通，运行地区：Singapore（sgp）。可以继续验证 Gemini。'
      : 'Appwrite 入口已连通，运行地区：Singapore（sgp）。请先补齐 GEMINI_API_KEY / PROBE_TOKEN 并重新部署。', 'ok');
    $('summary').textContent = '已确认 Appwrite 入口连通；尚未验证 Gemini。网络状态：' + report.network;
  } catch (error) {
    report.healthError = error.message;
    result('health-result', error.message, 'error');
    $('summary').textContent = '入口检查未通过，尚不能启用第二条线路。';
  } finally { running = false; updateButtons(); }
});

$('probe').addEventListener('click', async () => {
  if (running || !report.health?.ready || !checkedEndpoint) return;
  running = true; updateButtons();
  delete report.gemini; delete report.geminiError;
  $('summary').textContent = '正在验证 Gemini……';
  result('probe-result', '正在让 Appwrite 发送固定测试语句……');
  try {
    const gemini = await runProbeCheck(checkedEndpoint, { token: $('token').value });
    report.gemini = gemini;
    result('probe-result', `Gemini 调用成功，用时 ${Math.round(gemini.elapsedMs / 100) / 10} 秒。`
      + (gemini.expectedReply ? '\n固定测试回复符合预期。' : '\n已收到完整回复，但措辞与预期不同，建议复核。'), 'ok');
    $('summary').textContent = $('network').value === 'direct'
      ? '本次两段连接均通过。网络条件由你记录为“中国大陆直连”；还需在其他目标网络复测，不能据此保证所有地区可达。'
      : '本次两段连接均通过；尚不能记为大陆直连成功。请关闭 VPN / 代理，选择对应网络状态后重新检查。';
  } catch (error) {
    report.geminiError = error.message;
    result('probe-result', error.message, 'error');
    $('summary').textContent = 'Appwrite 入口连通，但 Gemini 检查未通过。';
  } finally { running = false; updateButtons(); }
});

$('copy-report').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(JSON.stringify(report, null, 2)); $('copy-status').textContent = '已复制。记录不包含 API key 或测试口令，可发回聊天。'; }
  catch { $('copy-status').textContent = '无法自动复制，请直接把上面的检查结果告诉我。'; }
});

$('reading').addEventListener('click', async () => {
  if (running || !report.health?.interpretationAvailable || !checkedEndpoint) return;
  running = true; updateButtons();
  delete report.interpretation; delete report.interpretationError;
  $('reading-details').hidden = true; $('reading-answer').textContent = '';
  result('reading-result', '正在生成完整解卦，最长等待约 30 秒……');
  try {
    const reading = await runInterpretationCheck(checkedEndpoint, { token: $('token').value });
    const { text, ...metadata } = reading;
    report.interpretation = { ...metadata, characters: text.length, checkedAt: new Date().toISOString() };
    $('reading-answer').textContent = text; $('reading-details').hidden = false;
    result('reading-result', `已返回 ${text.length} 字，用时 ${(reading.elapsedMs / 1000).toFixed(1)} 秒。`
      + (reading.truncated ? '\n回答被截断，请暂勿开启公开线路。' : '\n回答完整，可以复核解读内容。'), reading.truncated ? 'error' : 'ok');
    $('summary').textContent = reading.truncated ? '完整解卦尚未通过：回答被截断。'
      : '完整解卦已通过。请复制检查记录；开启 PUBLIC_AI_ENABLED 并重新部署后，自动选线才会使用这条线路。';
  } catch (error) {
    report.interpretationError = error.message;
    result('reading-result', error.message, 'error');
    $('summary').textContent = '完整解卦未通过，暂不启用公开线路。';
  } finally { running = false; updateButtons(); }
});
