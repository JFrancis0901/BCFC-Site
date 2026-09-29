/* ==========================================================
   portal.js = shared logic for EVERY workers page.
   - Requires a real Firebase session.
   - Firebase users/{uid}.role is the user's REAL role.
   - NO role-switching/debug dropdown.
   - Admins get access to the Members page.
   ========================================================== */

import { signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import { doc, getDoc }
  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

import { auth, db } from "./firebase-config.js";


/* ==========================================================
   ROLES
   ========================================================== */

const LEADS =
  'childrens-lead,ufy-lead,ufw-lead,ufm-lead,production-lead,creatives-lead';


/* ==========================================================
   NAVIGATION
   ========================================================== */

const NAV = [
  ['Calendar', 'calendar.html', 'all'],

  ['Announcements',
    'announcements.html',
    `admin,pastor,${LEADS}`],

  ["Children's Church",
    'dept.html?m=childrens',
    'admin,childrens-lead,childrens'],

  ['UFY',
    'dept.html?m=ufy',
    'admin,ufy-lead,ufy'],

  ['UFW',
    'dept.html?m=ufw',
    'admin,ufw-lead,ufw'],

  ['UFM',
    'dept.html?m=ufm',
    'admin,ufm-lead,ufm'],

  ['Praise & Worship',
    'worship.html',
    'admin,pastor,preaching'],

  ['Production',
    'projects.html?m=production',
    'admin,production-lead,production'],

  ['Creatives',
    'projects.html?m=creatives',
    'admin,creatives-lead,creatives'],

  // ADMIN ONLY
  ['Members',
    'members.html',
    'admin'],

  ['Chat',
    'chat.html',
    'all']
];


/* ==========================================================
   ROLE NAMES
   ========================================================== */

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


/* ==========================================================
   REAL USER ROLE
   ========================================================== */

const realRole =
  sessionStorage.getItem('bcfc-role');

const userName =
  sessionStorage.getItem('bcfc-name') || '';


/* ==========================================================
   LOGOUT
   ========================================================== */

function leaveToLogin() {

  [
    'bcfc-role',
    'bcfc-name',
    'bcfc-email',

    // Remove old role-switching values
    'bcfc-view-role',
    'bcfc-test-role'

  ].forEach(k => sessionStorage.removeItem(k));

  window.location.href = "login.html";
}


if (!realRole) {
  leaveToLogin();
}


/* ==========================================================
   VERIFY FIREBASE SESSION + REAL ROLE
   ========================================================== */

onAuthStateChanged(auth, async user => {

  if (!user) {
    return leaveToLogin();
  }

  try {

    const snap = await getDoc(
      doc(db, 'users', user.uid)
    );

    if (!snap.exists()) {
      return warn(
        `No user profile found for ${user.uid}.`
      );
    }

    const dbRole = snap.data().role;

    /*
      The Firestore role is the authority.

      If the browser's session somehow differs,
      replace it with the database role.
    */

    if (dbRole !== realRole) {

      sessionStorage.setItem(
        'bcfc-role',
        dbRole || 'guest'
      );

      sessionStorage.setItem(
        'bcfc-name',
        snap.data().name || ''
      );

      location.reload();
    }

  } catch (err) {

    console.error(err);

    warn(
      `Could not verify your account role (${err.code || err.message}).`
    );
  }
});


/* ==========================================================
   WARNING
   ========================================================== */

function warn(message) {

  console.warn(message);

  const box =
    document.createElement('div');

  box.style.cssText =
    'background:#fdeceb;' +
    'color:#b3122a;' +
    'padding:.6rem 1rem;' +
    'font:600 .85rem sans-serif;' +
    'text-align:center';

  box.textContent = message;

  document.body.prepend(box);
}


/* ==========================================================
   IMPORTANT
   ========================================================== */

window.realRole = realRole;

/*
  There is NO longer a separate "viewing role".

  currentRole is ALWAYS the actual Firebase role.
*/

window.currentRole = realRole;


/* ==========================================================
   CURRENT PAGE
   ========================================================== */

const here =
  (location.pathname.split('/').pop() || 'calendar.html')
  + location.search;


/* ==========================================================
   BUILD HEADER
   ========================================================== */

const header =
  document.getElementById('portal-header');

header.innerHTML = `

  <a href="calendar.html" class="portal-logo">
    BCFC <span>Workers</span>
  </a>

  <nav class="portal-nav">

    ${NAV.map(([title, href, roles]) => `

      <a
        href="${href}"
        data-roles="${roles}"
        ${href === here ? 'class="active"' : ''}
      >
        ${title.replace('&', '&amp;')}
      </a>

    `).join('')}

  </nav>

  <div class="portal-user">

    <span
      class="role-label"
      id="role-label">
    </span>

    <a
      href="login.html"
      class="btn-logout">
      Log Out
    </a>

  </div>
`;


/* ==========================================================
   ELEMENTS
   ========================================================== */

const roleLabel =
  document.getElementById('role-label');

const navLinks =
  [...document.querySelectorAll('.portal-nav a')];


/* ==========================================================
   PERMISSION CHECK
   ========================================================== */

const canSee = link => {

  return link.dataset.roles
    .split(',')
    .some(role =>
      role === 'all' ||
      role === window.currentRole
    );

};


/* ==========================================================
   REFRESH NAVIGATION
   ========================================================== */

function refresh() {

  /*
    Display the REAL role only.
  */

  roleLabel.textContent =
    `${userName ? userName + ' ' : ''}` +
    `(${NAMES[realRole] || realRole})`;


  /*
    Show/hide navigation based on real role.
  */

  navLinks.forEach(link => {

    const allowed =
      canSee(link);

    link.classList.toggle(
      'locked',
      !allowed
    );

    link.setAttribute(
      'aria-disabled',
      String(!allowed)
    );

  });


  /*
    Page protection.

    If someone manually types a URL they don't
    have access to, send them to Calendar.
  */

  const current =
    navLinks.find(
      link =>
        link.getAttribute('href') === here
    );

  if (
    current &&
    !canSee(current)
  ) {

    window.location.replace(
      'calendar.html'
    );
  }
}


refresh();


/* ==========================================================
   LOG OUT
   ========================================================== */

document
  .querySelector('.btn-logout')
  .addEventListener('click', async e => {

    e.preventDefault();

    try {

      await signOut(auth);

    } catch (err) {

      console.error(err);

    }

    leaveToLogin();

  });