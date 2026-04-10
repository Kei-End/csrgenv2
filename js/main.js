import { byId } from './utils.js';
import { showTab, showSubtab, toggleAcc, toggleCollapse, onPlatformChange, onServerChange, syncOutputTabs, showOutputTabExplicitly } from './ui.js';
import { readForm, validate, buildLinuxScript, buildWindowsPowerShell, buildWindowsGUIGuidance, buildDownloads, assess, renderReadinessSummary, renderOperatorChecklist, renderPostDeploymentChecklist, renderAssessment, updateScore, renderCertificateWarnings } from './generation.js';
import { initDecoder } from './decoder.js';

let lastDownloads = [];

function generateAll(){
  const data = readForm();
  const { missing, errors } = validate(data);
  renderCertificateWarnings();
  if (missing.length || errors.length) {
    const parts = [];
    if (missing.length) parts.push(`Please complete these required fields: ${missing.join(', ')}`);
    if (errors.length) parts.push(errors.join(' '));
    alert(parts.join('\n\n'));
    showTab('tab-cert', Array.from(document.querySelectorAll('.tab-btn')).find(b => (b.getAttribute('onclick') || '').includes('tab-cert')) || null);
    return;
  }
  byId('outputLinux').value = buildLinuxScript(data);
  byId('outputPS').value = buildWindowsPowerShell(data);
  byId('outputGUI').value = buildWindowsGUIGuidance(data);
  const result = assess(data);
  renderReadinessSummary(data, result);
  renderOperatorChecklist(data);
  renderPostDeploymentChecklist(data);
  renderAssessment(result);
  updateScore(result);
  lastDownloads = buildDownloads(data);
  syncOutputTabs();
  showOutputTabExplicitly();
  byId('tab-output').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getActiveOutputArea(){
  if (byId('out-linux').classList.contains('active')) return byId('outputLinux');
  if (byId('out-ps').classList.contains('active')) return byId('outputPS');
  return byId('outputGUI');
}
function copyActiveOutput(){
  const area = getActiveOutputArea();
  if (!area.value.trim()) return alert('Nothing to copy yet. Generate first.');
  area.select();
  area.setSelectionRange(0, 99999);
  try { document.execCommand('copy'); alert('Active output copied.'); } catch { alert('Copy failed. Please copy manually.'); }
}
function downloadText(filename, content){ const blob=new Blob([content], {type:'text/plain;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
function downloadFiles(){ if (!lastDownloads.length) return alert('Nothing to download yet. Generate first.'); lastDownloads.forEach(file => downloadText(file.filename, file.content)); }
function resetAll(){ location.reload(); }

window.showTab = showTab;
window.showSubtab = showSubtab;
window.toggleAcc = toggleAcc;
window.toggleCollapse = toggleCollapse;
window.onPlatformChange = onPlatformChange;
window.onServerChange = onServerChange;
window.syncOutputTabs = syncOutputTabs;
window.generateAll = generateAll;
window.copyActiveOutput = copyActiveOutput;
window.downloadFiles = downloadFiles;
window.resetAll = resetAll;

['cn','san'].forEach(id => byId(id).addEventListener('input', renderCertificateWarnings));
onPlatformChange();
syncOutputTabs();
initDecoder();
renderCertificateWarnings();
['colReadiness', 'colDetails', 'colPostDeploy'].forEach(id => {
  const el = byId(id);
  if (el) {
    el.classList.add('open');
    const marker = el.querySelector('.collapsible-head span:last-child');
    if (marker) marker.textContent = '−';
  }
});
