/* ==========================================================
   portal.js = shared logic for EVERY workers page.
   - Builds the header + navbar (so links are defined in ONE place: NAV).
   - Requires a real Firebase session, else sends you to login.
   - Blocks pages your role isn't allowed to open.
   - ADMINS get a "Viewing as" dropdown to act as any role (debugging).
   ========================================================== */
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const LEADS = 'childrens-lead,ufy-lead,ufw-lead,ufm-lead,production-lead,creatives-lead';
// EDIT: [label, page, roles allowed]. "all" = every logged-in role.
const NAV = [
  ['Calendar', 'calendar.html', 'all'],
  ['Announcements', 'announcements.html', `admin,pastor,${LEADS}`],
  ["Children's Church", 'dept.html?m=childrens', 'admin,childrens-lead,childrens'],
  ['UFY', 'dept.html?m=ufy', 'admin,ufy-lead,ufy'],
  ['UFW', 'dept.html?m=ufw', 'admin,ufw-lead,ufw'],
  ['UFM', 'dept.html?m=ufm', 'admin,ufm-lead,ufm'],
  ['Praise & Worship', 'worship.html', 'admin,pastor,preaching'],
  ['Production', 'projects.html?m=production', 'admin,production-lead,production'],
  ['Creatives', 'projects.html?m=creatives', 'admin,creatives-lead,creatives'],
  ['Chat', 'chat.html', 'all'],
];
const NAMES = {
  admin: 'Admin', pastor: 'Pastor', preaching: 'Preaching Staff',
  'childrens-lead': "Children's Church Lead", childrens: "Children's Church Worker",
  'ufy-lead': 'UFY Lead', ufy: 'UFY Worker', 'ufw-lead': 'UFW Lead', ufw: 'UFW Worker',
  'ufm-lead': 'UFM Lead', ufm: 'UFM Worker',
  'production-lead': 'Production Lead', production: 'Production Worker',
  'creatives-lead': 'Creatives Lead', creatives: 'Creatives Worker', guest: 'Guest'
};

const realRole = sessionStorage.getItem('bcfc-role');
const userName = sessionStorage.getItem('bcfc-name') || '';
function leaveToLogin() {
  ['bcfc-role', 'bcfc-name', 'bcfc-email', 'bcfc-view-role'].forEach(k => sessionStorage.removeItem(k));
  window.location.href = "login.html";
}
if (!realRole) leaveToLogin();
onAuthStateChanged(auth, async user => {
  if (!user) return leaveToLogin();
  // Sanity check: the role the rules use (users/{uid} in Firestore) must match the role this page thinks you have.
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) return warn(`No document at users/${user.uid} in Firestore. Create it with a "role" field, or the database will reject everything you do.`);
    const dbRole = snap.data().role;
    if (dbRole !== realRole) {
      sessionStorage.setItem('bcfc-role', dbRole || 'guest');
      sessionStorage.setItem('bcfc-name', snap.data().name || '');
      location.reload();
    }
  } catch (e) { warn(`Could not read your users document (${e.code || e.message}). Publish the latest firestore.rules.`); }
});
function warn(msg) {
  console.warn(msg);
  const b = document.createElement('div');
  b.style.cssText = 'background:#fdeceb;color:#b3122a;padding:.6rem 1rem;font:600 .85rem sans-serif;text-align:center';
  b.textContent = msg;
  document.body.prepend(b);
}

window.realRole = realRole;
window.currentRole = (realRole === 'admin' && sessionStorage.getItem('bcfc-view-role')) || realRole;

const here = (location.pathname.split('/').pop() || 'calendar.html') + location.search;
const header = document.getElementById('portal-header');
header.innerHTML = `
  <a href="calendar.html" class="portal-logo">BCFC <span>Workers</span></a>
  <nav class="portal-nav">${NAV.map(([t, h, r]) => `<a href="${h}" data-roles="${r}"${h === here ? ' class="active"' : ''}>${t.replace('&', '&amp;')}</a>`).join('')}</nav>
  <div class="portal-user">
    <span class="role-label" id="role-label"></span>
    <select id="role-switch" hidden aria-label="Admin: view site as another role">${Object.entries(NAMES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
    <a href="login.html" class="btn-logout">Log Out</a>
  </div>`;

const roleSwitch = document.getElementById('role-switch');
const roleLabel = document.getElementById('role-label');
const navLinks = [...document.querySelectorAll('.portal-nav a')];
const canSee = a => a.dataset.roles.split(',').some(r => r === 'all' || r === window.currentRole);

function refresh() {
  const viewing = window.currentRole !== realRole ? ` — viewing as ${NAMES[window.currentRole]}` : '';
  roleLabel.textContent = `${userName ? userName + ' ' : ''}(${NAMES[realRole] || realRole})${viewing}`;
  navLinks.forEach(a => { a.classList.toggle('locked', !canSee(a)); a.setAttribute('aria-disabled', String(!canSee(a))); });
  const current = navLinks.find(a => a.getAttribute('href') === here);
  if (current && !canSee(current)) window.location.replace('calendar.html');   // page guard
}

if (realRole === 'admin') {
  roleSwitch.hidden = false;
  roleSwitch.value = window.currentRole;
  roleSwitch.addEventListener('change', () => {
    window.currentRole = roleSwitch.value;
    sessionStorage.setItem('bcfc-view-role', window.currentRole);
    refresh();
    window.dispatchEvent(new Event('rolechange'));
  });
}
refresh();

document.querySelector('.btn-logout').addEventListener('click', async e => {
  e.preventDefault();
  try { await signOut(auth); } catch (err) { console.error(err); }
  leaveToLogin();
});
