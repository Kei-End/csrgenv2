export const byId = (id) => document.getElementById(id);
export function show(id, visible){ const el = byId(id); if (el) el.style.display = visible ? '' : 'none'; }
export function isFieldVisible(id){ const el = byId(id); return !!el && el.style.display !== 'none'; }
export function fillSelect(selectEl, options){
  selectEl.innerHTML = '';
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    selectEl.appendChild(o);
  });
}
export const normalise = (v) => String(v || '').trim();
export function parseNums(v){ const m = String(v || '').match(/\d+/g); return m ? m.map(n => parseInt(n, 10)) : null; }
export function compareVersions(a,b){ const x=parseNums(a), y=parseNums(b); if(!x||!y) return null; const len=Math.max(x.length,y.length); for(let i=0;i<len;i++){ const p=x[i]||0,q=y[i]||0; if(p>q) return 1; if(p<q) return -1; } return 0; }
export const extractWindowsYear = (text) => { const m=String(text||'').match(/(2008|2012|2016|2019|2022|2025)/); return m?parseInt(m[1],10):null; };
export const extractMajor = (text) => { const m=String(text||'').match(/(\d+)/); return m?parseInt(m[1],10):null; };
export const safeFileBase = (cn) => String(cn || 'server').trim().replace(/[^a-zA-Z0-9._-]/g, '_') || 'server';
export function sanitizeUiText(str){ return String(str || '').replace(/:contentReference\[.*?\]\{.*?\}/g, ''); }
export function isValidHostname(v){
  const value = String(v || '').trim();
  if (!value || value.length > 253) return false;
  if (value.startsWith('*.')) return false;
  const parts = value.split('.');
  if (parts.length < 2) return false;
  return parts.every(p => /^[A-Za-z0-9-]{1,63}$/.test(p) && !p.startsWith('-') && !p.endsWith('-'));
}
