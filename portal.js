/* ==========================================================
   portal.js = shared logic for EVERY workers page.
   Right now this only does the TEMPORARY role switcher (see calendar.html
   comments). Every future workers page should include this file so the
   nav links stay in sync with "Viewing as".
   TODO: BACKEND — once real accounts exist, delete the role-switch dropdown
   and set window.currentRole from the logged-in user's saved role instead.
   ========================================================== */

const roleSwitch = document.getElementById('role-switch');
const navLinks = document.querySelectorAll('.portal-nav a');

// Remembers the chosen role across pages while testing (clears when the tab closes).
window.currentRole = sessionStorage.getItem('bcfc-test-role') || 'admin';

function applyRoleToNav() {
  navLinks.forEach(link => {
    const allowed = link.dataset.roles.split(',');
    const canSee = allowed.includes('all') || allowed.includes(window.currentRole);
    link.classList.toggle('locked', !canSee);
    link.setAttribute('aria-disabled', String(!canSee));
  });
}

if (roleSwitch) {
  roleSwitch.value = window.currentRole;
  roleSwitch.addEventListener('change', () => {
    window.currentRole = roleSwitch.value;
    sessionStorage.setItem('bcfc-test-role', window.currentRole);
    applyRoleToNav();
  });
}

applyRoleToNav();
