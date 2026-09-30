/* board.js = reusable "list + add form" block used by the department,
   project, worship and announcement pages. Data lives in Firestore. */
import "./portal.js";
import { collection, addDoc, deleteDoc, doc, onSnapshot, getDocs, query, where, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

// Fields/rendering for anything stored in the shared "events" collection (also shows on the Calendar).
export const eventFields = (kinds, personRoles) => [
  { k:'title', label:'Title', req:1 },
  { k:'kind', label:'Type', type:'select', options:kinds },
  ...(personRoles ? [{ k:'assignee', label:'Assigned to', type:'person', roles:personRoles }] : []),
  { k:'date', label:'Date', type:'date', req:1 },
  { k:'time', label:'Time', type:'time' },
  { k:'notes', label:'Notes / place', type:'textarea' },
];
export const eventItem = d => `<b>${esc(d.title)}</b><small>${esc(d.kind || '')} · ${esc(d.date)}${d.time ? ' · ' + esc(d.time) : ''}${d.assignee ? ' · ' + esc(d.assignee) : ''}</small>${d.notes ? `<p>${esc(d.notes)}</p>` : ''}`;
export const byDate = (a, b) => ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || ''));
const newest = (a, b) => (b.createdAt?.seconds ?? 9e9) - (a.createdAt?.seconds ?? 9e9);

export function board(parent, { title, col, filter = {}, defaults = {}, fields, canWrite, item, sort = newest }) {
  const uid = Math.random().toString(36).slice(2, 7);
  const sec = document.createElement('section');
  sec.className = 'bd';
  const control = f => {
    const n = `name="${f.k}"`;
    if (f.type === 'textarea') return `<textarea ${n} rows="3" maxlength="600"></textarea>`;
    if (f.type === 'select') return `<select ${n}>${f.options.map(o => `<option>${esc(o)}</option>`).join('')}</select>`;
    if (f.type === 'person') return `<input ${n} list="dl-${uid}-${f.k}" maxlength="60" placeholder="Name"><datalist id="dl-${uid}-${f.k}"></datalist>`;
    return `<input ${n} type="${f.type || 'text'}" ${f.type === 'number' ? 'min="0"' : ''} ${f.req ? 'required' : ''} maxlength="120">`;
  };
  sec.innerHTML = `<h2>${esc(title)}</h2>
    <details class="bd-add" hidden><summary>+ Add</summary>
      <form>${fields.map(f => `<label>${esc(f.label)}${control(f)}</label>`).join('')}
      <p class="bd-err" hidden></p><button class="bd-save">Save</button></form></details>
    <ul class="bd-list"></ul>`;
  parent.appendChild(sec);

  const add = sec.querySelector('.bd-add'), form = sec.querySelector('form');
  const err = sec.querySelector('.bd-err'), list = sec.querySelector('.bd-list');
  let items = [];

  // Suggest names for "person" fields from users who hold the given roles.
  fields.filter(f => f.type === 'person').forEach(async f => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('role', 'in', f.roles)));
      sec.querySelector(`#dl-${uid}-${f.k}`).innerHTML = snap.docs.map(d => `<option value="${esc(d.data().name || '')}">`).join('');
    } catch (e) { console.warn('People list unavailable', e.code); }
  });

  const render = () => {
    // Never expose management controls while the authenticated user's role is
    // still being loaded. This prevents a stale sessionStorage role from
    // briefly showing + Add / Delete controls to a worker.
    const w = window.roleReady === true && window.isApproved === true && canWrite(window.currentRole);
    add.hidden = !w;
    const shown = items.filter(d => Object.entries(filter).every(([k, v]) => d[k] === v)).sort(sort);
    list.innerHTML = shown.length
      ? shown.map(d => `<li>${item(d)}${w ? `<button class="bd-del" data-id="${esc(d.id)}" aria-label="Delete">&times;</button>` : ''}</li>`).join('')
      : '<li class="bd-empty">Nothing here yet.</li>';
  };
  auth.authStateReady().then(() => onSnapshot(collection(db, col),
    snap => { items = snap.docs.map(d => ({ id: d.id, ...d.data() })); render(); },
    e => { console.error(e); list.innerHTML = `<li class="bd-empty">Couldn't load (${esc(e.code || e.message)}). Check your Firestore rules.</li>`; }));
  window.addEventListener('rolechange', render);

  form.addEventListener('submit', async e => {
    e.preventDefault(); err.hidden = true;
    if (!(window.roleReady === true && window.isApproved === true && canWrite(window.currentRole))) {
      add.open = false;
      return;
    }
    const data = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, v.trim()]));
    fields.filter(f => f.type === 'number').forEach(f => data[f.k] = Number(data[f.k] || 0));
    try {
      await addDoc(collection(db, col), { ...data, ...defaults, createdBy: auth.currentUser?.uid || '', createdByName: sessionStorage.getItem('bcfc-name') || '', createdAt: serverTimestamp() });
      form.reset();
    } catch (ex) { console.error(ex); err.textContent = `Couldn't save (${ex.code || ex.message}). You may not have permission.`; err.hidden = false; }
  });
  list.addEventListener('click', async e => {
    const b = e.target.closest('.bd-del');
    if (!b || !confirm('Delete this item?')) return;
    try { await deleteDoc(doc(db, col, b.dataset.id)); } catch (ex) { alert("You don't have permission to delete that."); }
  });
}
