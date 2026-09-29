/* ==========================================================
   portal.js = shared logic for EVERY workers page.
   Reads the role that login.js saved after a real sign-in and uses it
   to show/hide nav links. If someone lands here without having signed
   in (no saved role), they're sent back to the login page.

   TEST MODE: if you open calendar.html directly during development
   (no bcfc-role saved yet), the old "Viewing as" dropdown still works
   so you can keep testing nav/role logic without logging in each time.
   Once a real role is saved, the dropdown is hidden and the real
   role/name is shown instead.
   ========================================================== */

import { signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

const roleSwitch  = document.getElementById('role-switch');
const roleLabel   = document.querySelector('.role-label');
const navLinks    = document.querySelectorAll('.portal-nav a');
const logoutBtn   = document.querySelector('.btn-logout');

const savedRole = sessionStorage.getItem('bcfc-role');
const savedName = sessionStorage.getItem('bcfc-name');

if (savedRole) {
  // ---------- REAL LOGIN: use the saved role, hide the test switcher ----------
  window.currentRole = savedRole;

  if (roleSwitch) roleSwitch.hidden = true;
  if (roleLabel) {
    roleLabel.hidden = false;
    roleLabel.textContent = savedName ? `${savedName} (${roleDisplayName(savedRole)})` : roleDisplayName(savedRole);
  }
} else {
  // ---------- NO SAVED ROLE: no real session, send back to login ----------
  // EDIT: comment this block out temporarily if you need to open calendar.html
  // directly while building a new module, without logging in each time.
  window.location.href = "login.html";
}

function roleDisplayName(role) {
  const names = {
    admin: 'Admin', pastor: 'Pastor', preaching: 'Preaching Staff',
    'childrens-lead': "Children's Church Lead", childrens: "Children's Church Worker",
    'ufy-lead': 'UFY Lead', ufy: 'UFY Worker',
    'ufw-lead': 'UFW Lead', ufw: 'UFW Worker',
    'ufm-lead': 'UFM Lead', ufm: 'UFM Worker',
    'production-lead': 'Production Lead', production: 'Production Worker',
    'creatives-lead': 'Creatives Lead', creatives: 'Creatives Worker',
    guest: 'Guest'
  };
  return names[role] || role;
}

function applyRoleToNav() {
  navLinks.forEach(link => {
    const allowed = link.dataset.roles.split(',');
    const canSee = allowed.includes('all') || allowed.includes(window.currentRole);
    link.classList.toggle('locked', !canSee);
    link.setAttribute('aria-disabled', String(!canSee));
  });
}

if (roleSwitch && !savedRole) {
  // Test-mode dropdown only runs when there's no real saved role.
  window.currentRole = sessionStorage.getItem('bcfc-test-role') || 'admin';
  roleSwitch.value = window.currentRole;
  roleSwitch.addEventListener('change', () => {
    window.currentRole = roleSwitch.value;
    sessionStorage.setItem('bcfc-test-role', window.currentRole);
    applyRoleToNav();
  });
}

applyRoleToNav();

/* ---------- LOG OUT ---------- */
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
    sessionStorage.removeItem('bcfc-role');
    sessionStorage.removeItem('bcfc-name');
    sessionStorage.removeItem('bcfc-email');
    sessionStorage.removeItem('bcfc-test-role');
    window.location.href = "login.html";
  });
}
