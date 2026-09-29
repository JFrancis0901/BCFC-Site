/* ==========================================================
   portal.js
   Shared logic for every BCFC Workers page.

   IMPORTANT:
   - Users cannot change their role after login.
   - The role comes from Firebase users/{uid}.
   - Admin no longer has a "Viewing as" dropdown.
   - Admin can access the Members page.
   ========================================================== */

import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const LEADS =
  'childrens-lead,ufy-lead,ufw-lead,ufm-lead,production-lead,creatives-lead';

/* ----------------------------------------------------------
   NAVIGATION
   ---------------------------------------------------------- */

const NAV = [
  ['Calendar', 'calendar.html', 'all'],

  ['Announcements', 'announcements.html', `admin,pastor,${LEADS}`],

  ["Children's Church", 'dept.html?m=childrens',
    'admin,childrens-lead,childrens'],

  ['UFY', 'dept.html?m=ufy',
    'admin,ufy-lead,ufy'],

  ['UFW', 'dept.html?m=ufw',
    'admin,ufw-lead,ufw'],

  ['UFM', 'dept.html?m=ufm',
    'admin,ufm-lead,ufm'],

  ['Praise & Worship', 'worship.html',
    'admin,pastor,preaching'],

  ['Production', 'projects.html?m=production',
    'admin,production-lead,production'],

  ['Creatives', 'projects.html?m=creatives',
    'admin,creatives-lead,creatives'],

  ['Members', 'members.html',
    'admin'],

  ['Chat', 'chat.html', 'all'],
];

/* ----------------------------------------------------------
   ROLE NAMES
   ---------------------------------------------------------- */

const NAMES = {
  admin: 'Admin',
  pastor: 'Pastor',
  preaching: 'Preaching Staff',

  'childrens-lead': "Children's Church Lead",
  childrens: "Children's Church Worker",

  'ufy-lead': 'UFY Lead',
  ufy: 'UFY Worker',

  'ufw-lead': 'UFW Lead',
  ufw: 'UFW Worker',

  'ufm-lead': 'UFM Lead',
  ufm: 'UFM Worker',

  'production-lead': 'Production Lead',
  production: 'Production Worker',

  'creatives-lead': 'Creatives Lead',
  creatives: 'Creatives Worker',

  guest: 'Guest'
};

/* ----------------------------------------------------------
   REAL ROLE
   ---------------------------------------------------------- */

let realRole = sessionStorage.getItem('bcfc-role');
let userName = sessionStorage.getItem('bcfc-name') || '';

/*
   Remove old role-switching information.
   This makes sure an old "Viewing as" role cannot remain.
*/
sessionStorage.removeItem('bcfc-view-role');
sessionStorage.removeItem('bcfc-test-role');

function leaveToLogin() {
  [
    'bcfc-role',
    'bcfc-name',
    'bcfc-email',
    'bcfc-view-role',
    'bcfc-test-role'
  ].forEach(k => sessionStorage.removeItem(k));

  window.location.href = "login.html";
}

if (!realRole) {
  leaveToLogin();
}

/* ----------------------------------------------------------
   CHECK FIREBASE LOGIN + REAL ROLE
   ---------------------------------------------------------- */

onAuthStateChanged(auth, async user => {
  if (!user) {
    leaveToLogin();
    return;
  }

  try {
    const snap = await getDoc(doc(db, 'users', user.uid));

    if (!snap.exists()) {
      warn(
        `No document at users/${user.uid} in Firestore. ` +
        `Create the user profile first.`
      );
      return;
    }

    const data = snap.data();
    const dbRole = data.role;

    /*
       Firebase is the source of truth.
       The role saved in Firebase is the role the user gets.
    */
    if (dbRole && dbRole !== realRole) {
      realRole = dbRole;

      sessionStorage.setItem('bcfc-role', dbRole);
      sessionStorage.setItem('bcfc-name', data.name || '');

      userName = data.name || '';

      refresh();
    }

  } catch (e) {
    warn(
      `Could not read your users document ` +
      `(${e.code || e.message}).`
    );
  }
});

/* ----------------------------------------------------------
   WARNING
   ---------------------------------------------------------- */

function warn(msg) {
  console.warn(msg);

  const b = document.createElement('div');

  b.style.cssText =
    'background:#fdeceb;color:#b3122a;padding:.6rem 1rem;' +
    'font:600 .85rem sans-serif;text-align:center';

  b.textContent = msg;

  document.body.prepend(b);
}

/* ----------------------------------------------------------
   GLOBAL ROLE
   ---------------------------------------------------------- */

/*
   IMPORTANT:
   currentRole is ALWAYS the real Firebase role.
   There is no role switching anymore.
*/
window.realRole = realRole;
window.currentRole = realRole;

/* ----------------------------------------------------------
   BUILD HEADER
   ---------------------------------------------------------- */

const here =
  (location.pathname.split('/').pop() || 'calendar.html') +
  location.search;

const header = document.getElementById('portal-header');

if (header) {

  header.innerHTML = `
    <a href="calendar.html" class="portal-logo">
      BCFC <span>Workers</span>
    </a>

    <nav class="portal-nav">
      ${NAV.map(([t, h, r]) => `
        <a
          href="${h}"
          data-roles="${r}"
          ${h === here ? 'class="active"' : ''}
        >
          ${t.replace('&', '&amp;')}
        </a>
      `).join('')}
    </nav>

    <div class="portal-user">
      <span class="role-label" id="role-label"></span>

      <a href="login.html" class="btn-logout">
        Log Out
      </a>
    </div>
  `;
}

/* ----------------------------------------------------------
   NAVIGATION PERMISSIONS
   ---------------------------------------------------------- */

const roleLabel =
  document.getElementById('role-label');

const navLinks =
  [...document.querySelectorAll('.portal-nav a')];

const canSee = a => {
  return a.dataset.roles
    .split(',')
    .some(r => r === 'all' || r === window.currentRole);
};

/* ----------------------------------------------------------
   REFRESH HEADER
   ---------------------------------------------------------- */

function refresh() {

  window.currentRole = realRole;

  if (roleLabel) {
    roleLabel.textContent =
      `${userName ? userName + ' ' : ''}` +
      `(${NAMES[realRole] || realRole})`;
  }

  navLinks.forEach(a => {

    const allowed = canSee(a);

    a.classList.toggle('locked', !allowed);

    a.setAttribute(
      'aria-disabled',
      String(!allowed)
    );

    /*
       Hide navigation links the role cannot use.
    */
    a.style.display = allowed ? '' : 'none';
  });

  /*
     Page protection.
     If the current page is not allowed for this role,
     send the user back to Calendar.
  */

  const current = navLinks.find(
    a => a.getAttribute('href') === here
  );

  if (current && !canSee(current)) {
    window.location.replace('calendar.html');
  }
}

refresh();

/* ----------------------------------------------------------
   LOG OUT
   ---------------------------------------------------------- */

const logoutButton =
  document.querySelector('.btn-logout');

if (logoutButton) {

  logoutButton.addEventListener('click', async e => {

    e.preventDefault();

    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }

    leaveToLogin();
  });
}