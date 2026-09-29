/* ==========================================================
   portal.js = shared logic for EVERY workers page.
   - Builds the header + navbar.
   - Requires a real Firebase session.
   - Blocks pages your role isn't allowed to open.
   - The user's Firebase role is FIXED after login.
   - No role-switching/dropdown.
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

// [label, page, roles allowed]
// "all" = every logged-in role

const NAV = [
  ['Calendar', 'calendar.html', 'all'],

  [
    'Announcements',
    'announcements.html',
    `admin,pastor,${LEADS}`
  ],

  [
    "Children's Church",
    'dept.html?m=childrens',
    'admin,childrens-lead,childrens'
  ],

  [
    'UFY',
    'dept.html?m=ufy',
    'admin,ufy-lead,ufy'
  ],

  [
    'UFW',
    'dept.html?m=ufw',
    'admin,ufw-lead,ufw'
  ],

  [
    'UFM',
    'dept.html?m=ufm',
    'admin,ufm-lead,ufm'
  ],

  [
    'Praise & Worship',
    'worship.html',
    'admin,pastor,preaching'
  ],

  [
    'Production',
    'projects.html?m=production',
    'admin,production-lead,production'
  ],

  [
    'Creatives',
    'projects.html?m=creatives',
    'admin,creatives-lead,creatives'
  ],

  [
    'Chat',
    'chat.html',
    'all'
  ]
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
   GET LOGGED-IN USER
   ========================================================== */

const realRole = sessionStorage.getItem('bcfc-role');
const userName = sessionStorage.getItem('bcfc-name') || '';


/* ==========================================================
   LOGOUT / RETURN TO LOGIN
   ========================================================== */

function leaveToLogin() {

  [
    'bcfc-role',
    'bcfc-name',
    'bcfc-email',

    // Remove any old role-switch information
    'bcfc-view-role',
    'bcfc-test-role'

  ].forEach(k => sessionStorage.removeItem(k));

  window.location.href = "login.html";
}


if (!realRole) {
  leaveToLogin();
}


/* ==========================================================
   VERIFY FIREBASE USER
   ========================================================== */

onAuthStateChanged(auth, async user => {

  if (!user) {
    return leaveToLogin();
  }

  /*
    Verify that the role stored in the user's Firestore
    document is the same role being used by this page.
  */

  try {

    const snap = await getDoc(
      doc(db, 'users', user.uid)
    );

    if (!snap.exists()) {

      return warn(
        `No document at users/${user.uid} in Firestore. ` +
        `Create it with a "role" field, or the database will reject everything you do.`
      );
    }

    const dbRole = snap.data().role;

    /*
      If the Firebase database says the user has a different
      role, trust the database and update the session.
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

  } catch (e) {

    warn(
      `Could not read your users document (${e.code || e.message}). ` +
      `Publish the latest firestore.rules.`
    );
  }
});


/* ==========================================================
   WARNING MESSAGE
   ========================================================== */

function warn(msg) {

  console.warn(msg);

  const b = document.createElement('div');

  b.style.cssText =
    'background:#fdeceb;' +
    'color:#b3122a;' +
    'padding:.6rem 1rem;' +
    'font:600 .85rem sans-serif;' +
    'text-align:center';

  b.textContent = msg;

  document.body.prepend(b);
}


/* ==========================================================
   IMPORTANT:
   THE CURRENT ROLE IS ALWAYS THE REAL FIREBASE ROLE.
   
   There is NO role-switching anymore.
   ========================================================== */

window.realRole = realRole;
window.currentRole = realRole;


/* ==========================================================
   CURRENT PAGE
   ========================================================== */

const here =
  (location.pathname.split('/').pop() || 'calendar.html')
  + location.search;


/* ==========================================================
   HEADER
   ========================================================== */

const header =
  document.getElementById('portal-header');


header.innerHTML = `
  <a href="calendar.html" class="portal-logo">
    BCFC <span>Workers</span>
  </a>

  <nav class="portal-nav">
    ${NAV.map(([t, h, r]) =>
      `<a href="${h}" data-roles="${r}"${h === here ? ' class="active"' : ''}>
        ${t.replace('&', '&amp;')}
      </a>`
    ).join('')}
  </nav>

  <div class="portal-user">

    <span class="role-label" id="role-label"></span>

    <a href="login.html" class="btn-logout">
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

const canSee = a =>
  a.dataset.roles
    .split(',')
    .some(
      r => r === 'all' || r === window.currentRole
    );


/* ==========================================================
   REFRESH INTERFACE
   ========================================================== */

function refresh() {

  /*
    Display ONLY the user's real role.
    
    Example:
    
    John (Admin)
    Maria (UFY Worker)
    Daniel (Production Lead)
  */

  roleLabel.textContent =
    `${userName ? userName + ' ' : ''}` +
    `(${NAMES[realRole] || realRole})`;


  /*
    Lock navigation items that the user's role
    isn't allowed to access.
  */

  navLinks.forEach(a => {

    const allowed = canSee(a);

    a.classList.toggle(
      'locked',
      !allowed
    );

    a.setAttribute(
      'aria-disabled',
      String(!allowed)
    );
  });


  /*
    Page guard.
    
    If somebody manually enters a URL they don't
    have permission to access, send them back
    to the calendar.
  */

  const current =
    navLinks.find(
      a => a.getAttribute('href') === here
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


/* ==========================================================
   START INTERFACE
   ========================================================== */

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