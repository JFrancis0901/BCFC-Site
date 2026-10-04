/* ==========================================================
   resources.js = the list of downloadable files for BCFC Workers.

   HOW TO ADD A FILE
   1. Put the file in the  workers/Files  folder (same capital F).
   2. Add one block to RESOURCES below, copying the example.
   3. Commit + push. Done.

   for: ['all']              -> every approved role can see it
   for: ['ufy']              -> UFY leads + UFY workers (admin always sees everything)
   for: ['ufy','ufw']        -> UFY and UFW
   for: ['pastor']           -> exact role names also work
   ========================================================== */
import "./portal.js";

export const RESOURCES = [
  {
    title: 'Presentation Template',
    description: 'BCFC PowerPoint template for slides, announcements and presentations.',
    file: 'Files/Presentation_title.pptx',
    category: 'Presentations',
    size: '1.0 MB',
    for: ['all']
  },
  // { title:'Example PDF', description:'What this file is for.', file:'Files/example.pdf', category:'Forms', size:'250 KB', for:['all'] },
];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const list = document.getElementById('resource-list');
const status = document.getElementById('resource-status');

const canView = (r, role) =>
  role === 'admin' ||
  !r.for || r.for.includes('all') ||
  r.for.some(x => role === x || role === x + '-lead');

const ext = f => (f.split('.').pop() || 'file').toUpperCase();

function render() {
  if (window.roleReady !== true || window.isApproved !== true) {
    status.textContent = 'Loading resources…';
    list.innerHTML = '';
    return;
  }
  const mine = RESOURCES.filter(r => canView(r, window.currentRole));
  if (!mine.length) {
    status.textContent = 'There are no resources available for your role yet.';
    list.innerHTML = '';
    return;
  }
  status.textContent = '';
  const groups = {};
  mine.forEach(r => (groups[r.category || 'General'] ||= []).push(r));
  list.innerHTML = Object.entries(groups).map(([cat, items]) => `
    <h2 class="res-cat">${esc(cat)}</h2>
    <div class="res-grid">${items.map(r => `
      <article class="res-card">
        <span class="res-type res-${esc(ext(r.file).toLowerCase())}">${esc(ext(r.file))}</span>
        <h3>${esc(r.title)}</h3>
        <p>${esc(r.description || '')}</p>
        <div class="res-foot">
          <small>${esc(r.size || '')}</small>
          <a class="res-btn" href="${esc(encodeURI(r.file))}" download>Download</a>
        </div>
      </article>`).join('')}
    </div>`).join('');
}

window.addEventListener('rolechange', render);
render();
