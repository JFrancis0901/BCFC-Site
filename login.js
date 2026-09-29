/* ==========================================================
   login.js = behavior for the login page.
   Right now this ONLY runs the on-screen form logic (show/hide
   password, open/close the forgot-password panel, basic checks).
   It does NOT actually verify a password against a real account yet.
   Every spot that needs a real backend is marked "TODO: BACKEND".
   ========================================================== */

const loginForm   = document.getElementById('login-form');
const formError   = document.getElementById('form-error');
const guestBtn    = document.getElementById('guest-btn');
const togglePwBtn = document.getElementById('toggle-password');
const passwordInp = document.getElementById('password');

/* ---------- 1. SHOW / HIDE PASSWORD ---------- */
togglePwBtn.addEventListener('click', () => {
  const isHidden = passwordInp.type === 'password';
  passwordInp.type = isHidden ? 'text' : 'password';
  togglePwBtn.textContent = isHidden ? 'Hide' : 'Show';
});

/* ---------- 2. LOG IN WITH EMAIL + PASSWORD ---------- */
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;

  const email = document.getElementById('email').value.trim();
  const password = passwordInp.value;

  if (!email || !password) {
    showError('Please enter your email and password.');
    return;
  }

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.textContent = 'Logging in...';

  try {
    // TODO: BACKEND — replace this block with a real sign-in call.
    // Example using Firebase Authentication (recommended):
    //
    //   import { signInWithEmailAndPassword } from "firebase/auth";
    //   import { auth } from "./firebase-config.js";
    //   const userCredential = await signInWithEmailAndPassword(auth, email, password);
    //   // Then look up the user's ROLE (Admin, Pastor, Department Lead, etc.)
    //   // in your database and redirect them to the Calendar page:
    //   window.location.href = "calendar.html";
    //
    // For now, this just simulates a failed login so the page is testable:
    await new Promise(r => setTimeout(r, 600));
    throw new Error('placeholder');

  } catch (err) {
    showError('This form is not connected to an account system yet.');
    btn.disabled = false;
    btn.textContent = 'Log In';
  }
});

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

/* ---------- 3. GUEST LOGIN ---------- */
guestBtn.addEventListener('click', () => {
  // TODO: BACKEND — decide what a guest account can see.
  // Simplest approach: skip real sign-in and send them straight to a
  // read-only version of the Calendar page, e.g.:
  //   window.location.href = "calendar.html?guest=1";
  alert('Guest login is not connected yet — this will open a read-only view of the Calendar.');
});

/* ---------- 4. FORGOT PASSWORD PANEL ---------- */
const forgotLink  = document.querySelector('.forgot-link');
const forgotCard  = document.getElementById('forgot-password');
const closeForgot = document.querySelector('.close-forgot');
const forgotForm  = document.getElementById('forgot-form');
const forgotSuccess = document.getElementById('forgot-success');

forgotLink.addEventListener('click', (e) => {
  e.preventDefault();
  forgotCard.classList.add('show');
});
closeForgot.addEventListener('click', () => forgotCard.classList.remove('show'));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') forgotCard.classList.remove('show');
});

forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) return;

  // TODO: BACKEND — replace with a real password-reset email call.
  // Example using Firebase Authentication:
  //
  //   import { sendPasswordResetEmail } from "firebase/auth";
  //   await sendPasswordResetEmail(auth, email);
  //
  forgotSuccess.hidden = false;
  forgotForm.querySelector('button').disabled = true;
});
