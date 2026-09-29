/* ==========================================================
   login.js = behavior for the login page.
   Handles the on-screen form (show/hide password, forgot-password panel)
   AND the real sign-in: Firebase Authentication + a Firestore lookup
   for the signed-in user's role, then redirects into the portal.
   ========================================================== */

import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

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
    // Sign in with Firebase Authentication.
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Look up this person's role from Firestore: users/{uid} -> { role: "admin", ... }
    const userDoc = await getDoc(doc(db, "users", uid));

    if (!userDoc.exists()) {
      // Account exists in Firebase Auth but has no matching Firestore document yet.
      // EDIT: change this message if you want a different behavior for brand-new accounts.
      throw { code: 'no-role-doc' };
    }

    const { role, name } = userDoc.data();

    // Save role + basic info for this tab session, so portal.js and other
    // pages can read it without hitting Firestore again on every click.
    sessionStorage.setItem('bcfc-role', role || 'guest');
    sessionStorage.setItem('bcfc-name', name || '');
    sessionStorage.setItem('bcfc-email', email);
    sessionStorage.removeItem('bcfc-test-role'); // clear any leftover test-mode role

    window.location.href = "calendar.html";

  } catch (err) {
    console.error(err);
    if (err.code === 'no-role-doc') {
      showError('Your account exists but has no role set up yet. Contact an admin.');
    } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
      showError('Wrong email or password.');
    } else if (err.code === 'auth/too-many-requests') {
      showError('Too many attempts. Please wait a moment and try again.');
    } else if (err.code === 'auth/invalid-email') {
      showError('That email address looks invalid.');
    } else {
      showError('Something went wrong signing in. Please try again.');
    }
    btn.disabled = false;
    btn.textContent = 'Log In';
  }
});

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

/* ---------- 3. GUEST LOGIN ---------- */
// Guests are NOT workers — they get sent to the PUBLIC site (bcfc.com/),
// not into the workers portal. "../" steps out of the /workers folder
// back to the site root where index.html lives.
guestBtn.addEventListener('click', () => {
  window.location.href = "../index.html";
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

  const btn = forgotForm.querySelector('button');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    await sendPasswordResetEmail(auth, email);
    forgotSuccess.hidden = false;
  } catch (err) {
    console.error(err);
    // Firebase intentionally doesn't reveal whether the email exists, so we
    // show the same success message either way — this avoids leaking which
    // emails have accounts. Only a clearly malformed email gets its own message.
    if (err.code === 'auth/invalid-email') {
      btn.disabled = false;
      btn.textContent = 'Send Reset Link';
      alert('That email address looks invalid.');
      return;
    }
    forgotSuccess.hidden = false;
  }
});
