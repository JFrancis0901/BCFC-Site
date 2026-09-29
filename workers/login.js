/* ==========================================================
   login.js = behavior for the login / sign-up page.
   LOG IN : Firebase Auth email+password, then role lookup in users/{uid}.
   SIGN UP: pick role -> enter access code -> name/email/password.
            The code is checked by Firestore rules (signups/{uid} vs config/roleCodes),
            so it can't be faked from the browser.
   ========================================================== */

import { signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword, deleteUser }
  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const $ = id => document.getElementById(id);

/* ---------- Tabs: Log in / Sign up ---------- */
const tabLogin = $('tab-login'), tabSignup = $('tab-signup');
const loginPanel = $('login-panel'), signupPanel = $('signup-panel');
function showTab(which) {
  const signup = which === 'signup';
  loginPanel.hidden = signup; signupPanel.hidden = !signup;
  tabLogin.classList.toggle('on', !signup); tabSignup.classList.toggle('on', signup);
  tabLogin.setAttribute('aria-selected', String(!signup)); tabSignup.setAttribute('aria-selected', String(signup));
  if (signup) showStep('role');
}
tabLogin.addEventListener('click', () => showTab('login'));
tabSignup.addEventListener('click', () => showTab('signup'));

/* ==========================================================
   LOG IN
   ========================================================== */
const loginForm = $('login-form'), formError = $('form-error');
const passwordInp = $('password'), togglePwBtn = $('toggle-password');

togglePwBtn.addEventListener('click', () => {
  const isHidden = passwordInp.type === 'password';
  passwordInp.type = isHidden ? 'text' : 'password';
  togglePwBtn.textContent = isHidden ? 'Hide' : 'Show';
});

function showError(message) { formError.textContent = message; formError.hidden = false; }

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;
  const email = $('email').value.trim();
  const password = passwordInp.value;
  if (!email || !password) { showError('Please enter your email and password.'); return; }

  const btn = $('login-btn');
  btn.disabled = true; btn.textContent = 'Logging in...';
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, "users", cred.user.uid));
    if (!userDoc.exists()) throw { code: 'no-role-doc' };
    const { role, name } = userDoc.data();
    sessionStorage.setItem('bcfc-role', role || 'guest');
    sessionStorage.setItem('bcfc-name', name || '');
    sessionStorage.setItem('bcfc-email', email);
    sessionStorage.removeItem('bcfc-test-role');
    sessionStorage.removeItem('bcfc-view-role');
    window.location.href = "calendar.html";
  } catch (err) {
    console.error(err);
    if (err.code === 'no-role-doc') showError('Your account exists but has no role set up yet. Contact an admin.');
    else if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(err.code)) showError('Wrong email or password.');
    else if (err.code === 'auth/too-many-requests') showError('Too many attempts. Please wait a moment and try again.');
    else if (err.code === 'auth/invalid-email') showError('That email address looks invalid.');
    else showError('Something went wrong signing in. Please try again.');
    btn.disabled = false; btn.textContent = 'Log In';
  }
});

$('guest-btn').addEventListener('click', () => { window.location.href = "../index.html"; });

/* ==========================================================
   SIGN UP  (role -> code -> account)
   ========================================================== */
// Role keys must match the ones used in portal.js and firestore.rules.
const ROLE_GROUPS = [
  ['Church leadership', [['admin', 'Admin'], ['pastor', 'Pastor'], ['preaching', 'Preaching Staff']]],
  ['Department leads', [['childrens-lead', "Children's Church Lead"], ['ufy-lead', 'UFY Lead'], ['ufw-lead', 'UFW Lead'],
    ['ufm-lead', 'UFM Lead'], ['production-lead', 'Production Lead'], ['creatives-lead', 'Creatives Lead']]],
  ['Department workers', [['childrens', "Children's Church Worker"], ['ufy', 'UFY Worker'], ['ufw', 'UFW Worker'],
    ['ufm', 'UFM Worker'], ['production', 'Production Worker'], ['creatives', 'Creatives Worker']]],
];
const ROLE_LABEL = Object.fromEntries(ROLE_GROUPS.flatMap(([, list]) => list));

const steps = { role: $('step-role'), code: $('step-code'), account: $('step-account') };
let chosenRole = '', chosenCode = '';

function showStep(name) {
  Object.entries(steps).forEach(([k, el]) => el.hidden = k !== name);
  if (name === 'code') { $('code-title').textContent = `Enter the ${ROLE_LABEL[chosenRole]} code`; $('access-code').focus(); }
  if (name === 'account') { $('role-chip').textContent = `Signing up as ${ROLE_LABEL[chosenRole]}`; $('su-name').focus(); }
}

$('role-groups').innerHTML = ROLE_GROUPS.map(([title, list]) =>
  `<div class="role-group"><h3>${title}</h3><div class="role-grid">${
    list.map(([k, label]) => `<button type="button" class="role-btn" data-role="${k}">${label.replace(/&/g, '&amp;')}</button>`).join('')
  }</div></div>`).join('');

$('role-groups').addEventListener('click', e => {
  const b = e.target.closest('.role-btn'); if (!b) return;
  chosenRole = b.dataset.role;
  $('access-code').value = ''; $('code-error').hidden = true;
  showStep('code');
});

signupPanel.addEventListener('click', e => {
  const b = e.target.closest('[data-back]'); if (b) showStep(b.dataset.back);
});

// Step 2: we only collect the code here. Firestore checks it in step 3 (secure, server-side).
$('code-form').addEventListener('submit', e => {
  e.preventDefault();
  const code = $('access-code').value.trim();
  if (!code) { $('code-error').textContent = 'Enter the access code to continue.'; $('code-error').hidden = false; return; }
  chosenCode = code; $('code-error').hidden = true;
  showStep('account');
});

// Step 3: create the account.
const signupError = $('signup-error');
const signupErr = m => { signupError.textContent = m; signupError.hidden = false; };

$('signup-form').addEventListener('submit', async e => {
  e.preventDefault(); signupError.hidden = true;
  const name = $('su-name').value.trim(), email = $('su-email').value.trim();
  const pw = $('su-password').value, pw2 = $('su-password2').value;
  if (!name || !email || !pw) return signupErr('Fill in your name, email and password.');
  if (pw.length < 8) return signupErr('Use a password with at least 8 characters.');
  if (pw !== pw2) return signupErr('The two passwords do not match.');

  const btn = $('signup-btn');
  btn.disabled = true; btn.textContent = 'Creating account...';
  const reset = () => { btn.disabled = false; btn.textContent = 'Create account'; };

  let cred;
  try { cred = await createUserWithEmailAndPassword(auth, email, pw); }
  catch (err) {
    console.error(err);
    signupErr(err.code === 'auth/email-already-in-use' ? 'That email already has an account. Use Log in instead.'
      : err.code === 'auth/invalid-email' ? 'That email address looks invalid.'
      : err.code === 'auth/weak-password' ? 'Choose a stronger password.'
      : err.code === 'auth/operation-not-allowed' ? 'Email sign-up is not enabled in Firebase yet.'
      : `Could not create the account (${err.code || 'unknown error'}).`);
    return reset();
  }

  // 1) Ask Firestore to verify the code. The rules only allow this write if the code matches.
  try { await setDoc(doc(db, 'signups', cred.user.uid), { role: chosenRole, code: chosenCode }); }
  catch (err) {
    console.error(err);
    try { await deleteUser(cred.user); } catch (e2) { console.warn('cleanup failed', e2); }
    reset();
    if (err.code === 'permission-denied') {
      $('code-error').textContent = `That code isn't right for ${ROLE_LABEL[chosenRole]}. Check it and try again.`;
      $('code-error').hidden = false; showStep('code');
    } else signupErr(`Could not verify the code (${err.code || 'unknown error'}). Try again.`);
    return;
  }

  // 2) Code accepted: save the user's profile with the role they proved they can have.
  try {
    await setDoc(doc(db, 'users', cred.user.uid), { role: chosenRole, name, email, createdAt: serverTimestamp() });
  } catch (err) {
    console.error(err);
    signupErr(`Your code was accepted but the profile could not be saved (${err.code || 'unknown error'}). Log in and contact an admin.`);
    return reset();
  }

  sessionStorage.setItem('bcfc-role', chosenRole);
  sessionStorage.setItem('bcfc-name', name);
  sessionStorage.setItem('bcfc-email', email);
  sessionStorage.removeItem('bcfc-view-role');
  window.location.href = 'calendar.html';
});

/* ==========================================================
   FORGOT PASSWORD PANEL
   ========================================================== */
const forgotLink = document.querySelector('.forgot-link');
const forgotCard = $('forgot-password');
const forgotForm = $('forgot-form');
const forgotSuccess = $('forgot-success');

forgotLink.addEventListener('click', e => { e.preventDefault(); forgotCard.classList.add('show'); });
document.querySelector('.close-forgot').addEventListener('click', () => forgotCard.classList.remove('show'));
document.addEventListener('keydown', e => { if (e.key === 'Escape') forgotCard.classList.remove('show'); });

forgotForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('forgot-email').value.trim();
  if (!email) return;
  const btn = forgotForm.querySelector('button');
  btn.disabled = true; btn.textContent = 'Sending...';
  try {
    await sendPasswordResetEmail(auth, email);
    forgotSuccess.hidden = false;
  } catch (err) {
    console.error(err);
    if (err.code === 'auth/invalid-email') {
      btn.disabled = false; btn.textContent = 'Send Reset Link';
      alert('That email address looks invalid.');
      return;
    }
    forgotSuccess.hidden = false;
  }
});
