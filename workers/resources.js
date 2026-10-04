/* ==========================================================
   resources.js = Resources page.
   The list of files comes from  workers/Files/resources.json.
   Admins can add / remove files here; it saves straight to GitHub
   (through /api/resources) and the site redeploys by itself.

   for: ['all']       -> every approved role
   for: ['ufy']       -> UFY leads + UFY workers (admin always sees everything)
   ========================================================== */
import "./portal.js";
import { auth } from "./firebase-config.js";

const LABELS = { childrens:"Children's Church", ufy:'UFY', ufw:'UFW', ufm:'UFM', production:'Production', creatives:'Creatives', pastor:'Pastor', preaching:'Preaching Staff' };
const MAX_BYTES = 3 * 1000 * 1000;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const $ = id => document.getElementById(id);
const list = $('resource-list'), status = $('resource-status');
let RESOURCES = [], loaded = false, loadError = false;

const canView = (r, role) => role === 'admin' || !r.for || r.for.includes('all') || r.for.some(x => role === x || role === x + '-lead');
const ext = f => (String(f).split('.').pop() || 'file').toUpperCase();
const isAdminView = () => window.roleReady === true && window.isApproved === true && window.currentRole === 'admin';
const audience = r => (!r.for || r.for.includes('all')) ? 'Everyone' : r.for.map(x => LABELS[x] || x).join(', ');

async function load() {
  try {
    const r = await fetch('Files/resources.json?t=' + Date.now(), { cache: 'no-store' });
    RESOURCES = r.ok ? await r.json() : [];
    if (!Array.isArray(RESOURCES)) RESOURCES = [];
  } catch (e) { console.error(e); loadError = true; RESOURCES = []; }
  loaded = true; render();
}

function render() {
  const admin = isAdminView();
  $('admin-panel').hidden = !admin;
  if (window.roleReady !== true || window.isApproved !== true || !loaded) {
    status.textContent = 'Loading resources…'; list.innerHTML = ''; return;
  }
  if (loadError) { status.textContent = 'Resources could not be loaded. Please try again later.'; list.innerHTML = ''; return; }
  const mine = RESOURCES.filter(r => canView(r, window.currentRole));
  if (!mine.length) { status.textContent = 'There are no resources available for your role yet.'; list.innerHTML = ''; return; }
  status.textContent = '';
  const groups = {};
  mine.forEach(r => (groups[r.category || 'General'] ||= []).push(r));
  const cats = [...new Set(RESOURCES.map(r => r.category).filter(Boolean))];
  $('res-cats').innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');
  list.innerHTML = Object.entries(groups).map(([cat, items]) => `
    <h2 class="res-cat">${esc(cat)}</h2>
    <div class="res-grid">${items.map(r => `
      <article class="res-card">
        <span class="res-type res-${esc(ext(r.file).toLowerCase())}">${esc(ext(r.file))}</span>
        <h3>${esc(r.title)}</h3>
        <p>${esc(r.description || '')}</p>
        ${admin ? `<small class="res-aud">Visible to: ${esc(audience(r))}</small>` : ''}
        <div class="res-foot">
          <small>${esc(r.size || '')}</small>
          <span>
            ${admin ? `<button type="button" class="res-del" data-file="${esc(r.file)}" data-title="${esc(r.title)}">Remove</button>` : ''}
            ${r.pending ? '<span class="res-pending">Publishing…</span>' : `<a class="res-btn" href="${esc(encodeURI(r.file))}" download>Download</a>`}
          </span>
        </div>
      </article>`).join('')}
    </div>`).join('');
}

/* ---------- Admin: save to GitHub through /api/resources ---------- */
async function callApi(payload) {
  const user = auth.currentUser;
  if (!user) throw new Error('Please log in again.');
  const token = await user.getIdToken();
  const r = await fetch('/api/resources', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(payload) });
  let data = {}; try { data = await r.json(); } catch {}
  if (!r.ok || !data.ok) throw new Error(data.error || `Request failed (${r.status}).`);
  return data;
}
const readB64 = file => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = () => rej(new Error('Could not read the file.')); fr.readAsDataURL(file); });
const msg = (text, bad) => { const m = $('admin-msg'); m.textContent = text; m.className = 'res-msg ' + (bad ? 'bad' : 'ok'); m.hidden = !text; };

$('upload-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (!isAdminView()) return;
  const f = $('up-file').files[0];
  if (!f) return msg('Please choose a file.', true);
  if (f.size > MAX_BYTES) return msg('That file is over 3 MB. Upload larger files directly on GitHub.', true);
  const everyone = $('for-all').checked;
  const roles = everyone ? ['all'] : [...document.querySelectorAll('.for-role:checked')].map(c => c.value);
  if (!roles.length) return msg('Choose who can see this file.', true);
  const btn = $('up-btn'); btn.disabled = true; btn.textContent = 'Saving to GitHub…'; msg('', false);
  try {
    const title = $('up-title').value.trim() || f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    const entry = (await callApi({ title, description: $('up-desc').value, category: $('up-cat').value, for: roles, fileName: f.name, content: await readB64(f) }));
    RESOURCES.push({ title, description: $('up-desc').value.trim(), category: $('up-cat').value.trim() || 'General', file: entry.file, size: entry.size, for: entry.for, pending: true });
    $('upload-form').reset(); $('for-all').checked = true; syncFor(); render();
    msg('Saved to GitHub ✓ It will be downloadable here after the site redeploys (about a minute). Refresh then.', false);
  } catch (ex) { msg(ex.message, true); }
  finally { btn.disabled = false; btn.textContent = 'Upload & save to GitHub'; }
});

list.addEventListener('click', async e => {
  const b = e.target.closest('.res-del'); if (!b || !isAdminView()) return;
  if (!confirm(`Remove "${b.dataset.title}"? The file will be deleted from GitHub.`)) return;
  b.disabled = true; msg('Removing…', false);
  try {
    await callApi({ action: 'delete', file: b.dataset.file });
    RESOURCES = RESOURCES.filter(r => r.file !== b.dataset.file); render();
    msg('Removed ✓ The site will redeploy in about a minute.', false);
  } catch (ex) { b.disabled = false; msg(ex.message, true); }
});

function syncFor() { document.querySelectorAll('.for-role').forEach(c => { c.disabled = $('for-all').checked; if ($('for-all').checked) c.checked = false; }); }
$('for-all').addEventListener('change', syncFor); syncFor();

window.addEventListener('rolechange', render);
render(); load();
