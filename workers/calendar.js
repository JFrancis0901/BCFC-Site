/* ==========================================================
   calendar.js = month grid + selected-day panel, backed by Firestore.
   Collection "events": { date:"YYYY-MM-DD", title, module, time, preacher,
   notes, createdBy (uid), createdByName }.
   Everyone signed in sees every event (color-coded by module).
   Who can ADD/DELETE is set in CAN_MANAGE below (from the roles spec).
   ========================================================== */
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, getDocs, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const MODULE_COLORS = {
  sunday:     { label: 'Sunday Service',   dot: 'dot-sunday' },
  nurture:    { label: 'Family Nurture',   dot: 'dot-nurture' },
  prayer:     { label: 'Abound in Prayer', dot: 'dot-prayer' },
  childrens:  { label: "Children's Church", dot: 'dot-childrens' },
  ufy:        { label: 'UFY',              dot: 'dot-ufy' },
  ufw:        { label: 'UFW',              dot: 'dot-ufw' },
  ufm:        { label: 'UFM',              dot: 'dot-ufm' },
  production: { label: 'Production',       dot: 'dot-production' },
  creatives:  { label: 'Creatives',        dot: 'dot-creatives' },
  other:      { label: 'Other',            dot: 'dot-other' },
};
const PREACHING = ['sunday', 'nurture', 'prayer'];   // these get a "Preacher" field

// Which categories each role may create/delete (spec section III).
const ALL = Object.keys(MODULE_COLORS);
const CAN_MANAGE = {
  admin: ALL,
  pastor: [...PREACHING, 'other'],
  'childrens-lead': ['childrens'], 'ufy-lead': ['ufy'], 'ufw-lead': ['ufw'],
  'ufm-lead': ['ufm'], 'production-lead': ['production'], 'creatives-lead': ['creatives'],
};
const myModules = () => CAN_MANAGE[window.currentRole] || [];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const today = new Date();
let events = [];
let viewYear = today.getFullYear(), viewMonth = today.getMonth();
let selectedDate = iso(viewYear, viewMonth, today.getDate());

const grid = document.getElementById('calendar-grid');
const monthLabel = document.getElementById('month-label');
const panelTitle = document.getElementById('day-panel-title');
const panelList = document.getElementById('day-panel-list');
const addBtn = document.getElementById('add-event-btn');
const dialog = document.getElementById('event-dialog');
const form = document.getElementById('event-form');
const errBox = document.getElementById('event-error');
const modSel = document.getElementById('evt-module');
const preacherRow = document.getElementById('preacher-row');

const eventsOn = d => events.filter(e => e.date === d)
  .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

/* ---------- Live data from Firestore ---------- */
onSnapshot(collection(db, "events"),
  snap => { events = snap.docs.map(d => ({ id: d.id, ...d.data() })); refresh(); },
  err => { console.error(err); panelList.innerHTML = '<li class="day-panel-empty" style="border:0;background:none;padding:0">Couldn\'t load events. Check your Firestore rules.</li>'; });

/* ---------- Rendering ---------- */
function renderCalendar() {
  monthLabel.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
  grid.innerHTML = '';
  const startWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  const todayStr = iso(today.getFullYear(), today.getMonth(), today.getDate());

  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(viewYear, viewMonth, i - startWeekday + 1);
    const other = cellDate.getMonth() !== viewMonth;
    const dateStr = iso(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
    const dots = eventsOn(dateStr).map(e => `<i class="dot ${(MODULE_COLORS[e.module] || MODULE_COLORS.other).dot}"></i>`).join('');
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'day-cell' + (other ? ' other-month' : '') + (dateStr === todayStr ? ' today' : '') + (dateStr === selectedDate ? ' selected' : '');
    cell.innerHTML = `<span class="day-num">${cellDate.getDate()}</span><span class="day-dots">${dots}</span>`;
    cell.addEventListener('click', () => { selectedDate = dateStr; refresh(); });
    grid.appendChild(cell);
  }
}

function renderPanel() {
  const d = new Date(selectedDate + 'T00:00:00');
  panelTitle.textContent = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const list = eventsOn(selectedDate);
  const manage = myModules();
  panelList.innerHTML = list.length ? list.map(e => {
    const m = MODULE_COLORS[e.module] || MODULE_COLORS.other;
    const meta = [e.kind, e.time, e.assignee, e.preacher && `Preacher: ${e.preacher}`].filter(Boolean).map(esc).join(' · ');
    return `<li>
      <span class="evt-title">${esc(e.title)}</span>
      <span class="evt-module">${esc(m.label)}</span>
      ${meta ? `<span class="evt-meta">${meta}</span>` : ''}
      ${e.notes ? `<span class="evt-meta">${esc(e.notes)}</span>` : ''}
      ${manage.includes(e.module) ? `<button class="evt-del" data-id="${esc(e.id)}" aria-label="Delete activity">&times;</button>` : ''}
    </li>`;
  }).join('') : '<li class="day-panel-empty" style="border:0;background:none;padding:0">No activities scheduled.</li>';
  addBtn.hidden = manage.length === 0;
}

function refresh() { renderCalendar(); renderPanel(); }
window.addEventListener('rolechange', refresh);

/* ---------- Navigation ---------- */
document.getElementById('prev-month').addEventListener('click', () => { if (--viewMonth < 0) { viewMonth = 11; viewYear--; } renderCalendar(); });
document.getElementById('next-month').addEventListener('click', () => { if (++viewMonth > 11) { viewMonth = 0; viewYear++; } renderCalendar(); });
document.getElementById('today-btn').addEventListener('click', () => {
  viewYear = today.getFullYear(); viewMonth = today.getMonth();
  selectedDate = iso(viewYear, viewMonth, today.getDate()); refresh();
});

/* ---------- Delete ---------- */
panelList.addEventListener('click', async e => {
  const btn = e.target.closest('.evt-del');
  if (!btn || !confirm('Delete this activity?')) return;
  try { await deleteDoc(doc(db, "events", btn.dataset.id)); }
  catch (err) { console.error(err); alert("You don't have permission to delete that."); }
});

/* ---------- Add Activity dialog ---------- */
async function loadPreachers() {
  // Fills the preacher suggestions from users with role preaching/pastor.
  // If your Firestore rules block this, the field still works as free text.
  try {
    const snap = await getDocs(query(collection(db, "users"), where("role", "in", ["preaching", "pastor"])));
    document.getElementById('preacher-list').innerHTML =
      snap.docs.map(d => `<option value="${esc(d.data().name || '')}">`).join('');
  } catch (err) { console.warn('Preacher list unavailable:', err.code); }
}

addBtn.addEventListener('click', () => {
  form.reset(); errBox.hidden = true;
  modSel.innerHTML = myModules().map(k => `<option value="${k}">${esc(MODULE_COLORS[k].label)}</option>`).join('');
  document.getElementById('evt-date').value = selectedDate;
  preacherRow.hidden = !PREACHING.includes(modSel.value);
  loadPreachers();
  dialog.showModal();
});
modSel.addEventListener('change', () => { preacherRow.hidden = !PREACHING.includes(modSel.value); });
document.getElementById('evt-cancel').addEventListener('click', () => dialog.close());

form.addEventListener('submit', async e => {
  e.preventDefault();
  const module = modSel.value;
  if (!myModules().includes(module)) { errBox.textContent = "You can't add that type of activity."; errBox.hidden = false; return; }
  const saveBtn = document.getElementById('evt-save');
  saveBtn.disabled = true;
  try {
    await addDoc(collection(db, "events"), {
      title: document.getElementById('evt-title').value.trim(),
      module,
      date: document.getElementById('evt-date').value,
      time: document.getElementById('evt-time').value,
      preacher: PREACHING.includes(module) ? document.getElementById('evt-preacher').value.trim() : '',
      notes: document.getElementById('evt-notes').value.trim(),
      createdBy: auth.currentUser?.uid || '',
      createdByName: sessionStorage.getItem('bcfc-name') || '',
      createdAt: serverTimestamp(),
    });
    selectedDate = document.getElementById('evt-date').value;
    const [y, m] = selectedDate.split('-').map(Number);
    viewYear = y; viewMonth = m - 1;
    dialog.close();
  } catch (err) {
    console.error(err);
    errBox.textContent = "Couldn't save. You may not have permission, or the connection failed.";
    errBox.hidden = false;
  }
  saveBtn.disabled = false;
});

refresh();
