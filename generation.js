import { byId, fillSelect, show } from './utils.js';
import { OS_OPTIONS, SERVER_OPTIONS, ENVIRONMENT_FIELD_RULES, ALL_ENVIRONMENT_FIELDS } from './rules.js';

export function showTab(tabId, btn){
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  byId(tabId).classList.add('active');
  if (btn) btn.classList.add('active');
}

export function showSubtab(id, btn){
  document.querySelectorAll('.subtab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
  byId(id).classList.add('active');
  if (btn) btn.classList.add('active');
}

export function toggleAcc(btn){
  const item = btn.closest('.acc-item');
  item.classList.toggle('open');
  btn.querySelector('span').textContent = item.classList.contains('open') ? '−' : '+';
}

export function toggleCollapse(btn){
  const item = btn.closest('.collapsible');
  item.classList.toggle('open');
  btn.querySelector('span:last-child').textContent = item.classList.contains('open') ? '−' : '+';
}

export function applyEnvironmentRules(){
  const platform = byId('platform').value;
  const server = byId('server').value;
  ALL_ENVIRONMENT_FIELDS.forEach(id => show(id, false));
  const rules = ENVIRONMENT_FIELD_RULES[platform] || { default: [] };
  (rules.default || []).forEach(id => show(id, true));
  (rules[server] || []).forEach(id => show(id, true));
}

export function syncOutputTabs(){
  const platform = byId('platform').value;
  const server = byId('server').value;
  const iisMethod = byId('iisMethod') ? byId('iisMethod').value : 'powershell';
  const btnLinux = byId('btnOutLinux');
  const btnPS = byId('btnOutPS');
  const btnGUI = byId('btnOutGUI');
  const panelLinux = byId('out-linux');
  const panelPS = byId('out-ps');
  const panelGUI = byId('out-gui');

  [btnLinux, btnPS, btnGUI].forEach(el => el.style.display = 'none');
  [panelLinux, panelPS, panelGUI].forEach(el => { el.classList.remove('active'); el.style.display = 'none'; });
  document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));

  if (platform === 'Linux') {
    btnLinux.style.display = '';
    panelLinux.style.display = 'block';
    showSubtab('out-linux', btnLinux);
    return;
  }

  if (server === 'IIS') {
    if (iisMethod === 'powershell') {
      btnPS.style.display = '';
      panelPS.style.display = 'block';
      showSubtab('out-ps', btnPS);
    } else if (iisMethod === 'gui') {
      btnGUI.style.display = '';
      panelGUI.style.display = 'block';
      showSubtab('out-gui', btnGUI);
    } else {
      btnPS.style.display = '';
      btnGUI.style.display = '';
      panelPS.style.display = 'block';
      panelGUI.style.display = 'block';
      showSubtab('out-ps', btnPS);
    }
    return;
  }

  btnPS.style.display = '';
  panelPS.style.display = 'block';
  showSubtab('out-ps', btnPS);
}

export function onPlatformChange(){
  const platform = byId('platform').value;
  fillSelect(byId('osName'), OS_OPTIONS[platform]);
  fillSelect(byId('server'), SERVER_OPTIONS[platform]);
  applyEnvironmentRules();
  syncOutputTabs();
}

export function onServerChange(){
  applyEnvironmentRules();
  syncOutputTabs();
}

export function showOutputTabExplicitly(){
  const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => (b.getAttribute('onclick') || '').includes('tab-output'));
  showTab('tab-output', btn || null);
}
