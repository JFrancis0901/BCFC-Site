import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth, db, authPersistenceReady } from "./firebase-config.js";

const $ = id => document.getElementById(id);
const ROLE_GROUPS = [
  ["Church leadership", [["admin","Admin"],["pastor","Pastor"],["preaching","Preaching Staff"]]],
  ["Department leads", [["childrens-lead","Children's Church Lead"],["ufy-lead","UFY Lead"],["ufw-lead","UFW Lead"],["ufm-lead","UFM Lead"],["production-lead","Production Lead"],["creatives-lead","Creatives Lead"]]],
  ["Department workers", [["childrens","Children's Church Worker"],["ufy","UFY Worker"],["ufw","UFW Worker"],["ufm","UFM Worker"],["production","Production Worker"],["creatives","Creatives Worker"]]]
];
const ROLE_LABEL = Object.fromEntries(ROLE_GROUPS.flatMap(([, list]) => list));
let pendingSignup = null;
let pendingGoogleSignup = null;

function saveSession(data, email="") {
  sessionStorage.setItem("bcfc-role", data.role || "");
  sessionStorage.setItem("bcfc-name", data.name || "");
  sessionStorage.setItem("bcfc-email", email || data.email || "");
  sessionStorage.setItem("bcfc-role-status", data.roleStatus || "pending");
  sessionStorage.removeItem("bcfc-view-role");
  sessionStorage.removeItem("bcfc-test-role");
}
function goCalendar(data, email="") { saveSession(data,email); window.location.href="calendar.html"; }
function showError(el,msg){ el.textContent=msg; el.hidden=false; }
function clearError(el){ el.hidden=true; el.textContent=""; }
function friendlyAuthError(err){
  const m={
    "auth/invalid-credential":"Wrong email or password.",
    "auth/wrong-password":"Wrong email or password.",
    "auth/user-not-found":"Wrong email or password.",
    "auth/too-many-requests":"Too many attempts. Please wait a moment and try again.",
    "auth/invalid-email":"That email address looks invalid.",
    "auth/email-already-in-use":"That email already has an account. Please log in instead.",
    "auth/weak-password":"Password must be at least 8 characters.",
    "auth/popup-closed-by-user":"Google sign-in was cancelled.",
    "auth/popup-blocked":"Your browser blocked the Google sign-in window. Please allow pop-ups for this site.",
    "auth/unauthorized-domain":"This website address is not authorized for Google sign-in in Firebase.",
    "auth/operation-not-allowed":"This sign-in method is not enabled in Firebase yet."
  };
  return m[err.code] || `Something went wrong (${err.code || "unknown error"}). Please try again.`;
}

// Tabs
const tabLogin=$("tab-login"), tabSignup=$("tab-signup"), loginPanel=$("login-panel"), signupPanel=$("signup-panel");
function showTab(which){ const signup=which==="signup"; loginPanel.hidden=signup; signupPanel.hidden=!signup; tabLogin.classList.toggle("on",!signup); tabSignup.classList.toggle("on",signup); tabLogin.setAttribute("aria-selected",String(!signup)); tabSignup.setAttribute("aria-selected",String(signup)); if(signup && !pendingSignup) showAccountStep(); }
tabLogin.onclick=()=>showTab("login"); tabSignup.onclick=()=>showTab("signup");

// Login
const loginForm=$("login-form"), formError=$("form-error"), loginBtn=$("login-btn");
$("toggle-password").onclick=()=>{ const p=$("password"), hidden=p.type==="password"; p.type=hidden?"text":"password"; $("toggle-password").textContent=hidden?"Hide":"Show"; };
loginForm.addEventListener("submit",async e=>{
  e.preventDefault();
  await authPersistenceReady; clearError(formError); loginBtn.disabled=true; loginBtn.textContent="Logging in...";
  try{
    const cred=await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);
    const snap=await getDoc(doc(db,"users",cred.user.uid));
    if(!snap.exists()) throw new Error("No worker profile was found for this account.");
    goCalendar(snap.data(),cred.user.email||"");
  }catch(err){ console.error(err); showError(formError,err.message?.startsWith("No worker profile")?err.message:friendlyAuthError(err)); loginBtn.disabled=false; loginBtn.textContent="Log In"; }
});

// Google login
$("google-btn").onclick=async()=>{
  clearError(formError);
  await authPersistenceReady; const btn=$("google-btn"), txt=$("google-btn-text"); btn.disabled=true; txt.textContent="Connecting to Google...";
  try{
    const result=await signInWithPopup(auth,new GoogleAuthProvider());
    const snap=await getDoc(doc(db,"users",result.user.uid));
    if(!snap.exists()){ await signOut(auth); throw new Error("This Google account is not registered as a BCFC worker yet. Please use Sign up first."); }
    goCalendar(snap.data(),result.user.email||"");
  }catch(err){ console.error(err); showError(formError,err.message?.startsWith("This Google")?err.message:friendlyAuthError(err)); }
  finally{ btn.disabled=false; txt.textContent="Continue with Google"; }
};
$("guest-btn").onclick=()=>{ window.location.href="../public/index.html"; };

// Signup steps
function showAccountStep(){
  $("step-account").hidden=false;
  $("step-google-name").hidden=true;
  $("step-role").hidden=true;
}
function showGoogleNameStep(){
  $("step-account").hidden=true;
  $("step-google-name").hidden=false;
  $("step-role").hidden=true;
  setTimeout(() => $("google-first-name")?.focus(), 0);
}
function showRoleStep(){
  $("step-account").hidden=true;
  $("step-google-name").hidden=true;
  $("step-role").hidden=false;
}
const signupForm=$("signup-form"), signupError=$("signup-error");
signupForm.addEventListener("submit",async e=>{
  e.preventDefault();
  await authPersistenceReady; clearError(signupError);
  const last=$("su-last-name").value.trim(), first=$("su-first-name").value.trim(), middle=$("su-middle-initial").value.trim().toUpperCase(), email=$("su-email").value.trim(), pw=$("su-password").value, pw2=$("su-password2").value;
  if(!last||!first||!email||!pw||!pw2) return showError(signupError,"Please fill in all required fields.");
  if(middle && !/^[A-Z]$/.test(middle)) return showError(signupError,"Middle initial must be one letter.");
  if(pw!==pw2) return showError(signupError,"Passwords do not match.");
  if(pw.length<8) return showError(signupError,"Password must be at least 8 characters.");
  const btn=$("signup-btn"); btn.disabled=true; btn.textContent="Creating account...";
  try{
    const cred=await createUserWithEmailAndPassword(auth,email,pw);
    pendingSignup={uid:cred.user.uid,email,first,last,middle,name:`${first} ${middle?middle+" ":""}${last}`};
    buildRoleButtons(); showRoleStep();
  }catch(err){ console.error(err); showError(signupError,friendlyAuthError(err)); btn.disabled=false; btn.textContent="Create account"; }
});

// Google signup: Google provides identity/name, then user chooses role.
$("google-signup-btn").onclick=async()=>{
  clearError(signupError);
  await authPersistenceReady; const btn=$("google-signup-btn"), txt=$("google-signup-btn-text"); btn.disabled=true; txt.textContent="Connecting to Google...";
  try{
    const result=await signInWithPopup(auth,new GoogleAuthProvider());
    const snap=await getDoc(doc(db,"users",result.user.uid));
    if(snap.exists()){ goCalendar(snap.data(),result.user.email||""); return; }
    // Do not use Google's displayName as the BCFC profile name.
    // Ask the user explicitly for the name they want stored in Firestore.
    pendingGoogleSignup={uid:result.user.uid,email:result.user.email||""};
    $("google-last-name").value="";
    $("google-first-name").value="";
    $("google-middle-initial").value="";
    clearError($("google-name-error"));
    showGoogleNameStep();
  }catch(err){ console.error(err); showError(signupError,friendlyAuthError(err)); }
  finally{ btn.disabled=false; txt.textContent="Continue with Google"; }
};

// Google signup step 2: collect the name explicitly before role selection.
const googleNameForm=$("google-name-form");
const googleNameError=$("google-name-error");
if(googleNameForm){
  googleNameForm.addEventListener("submit",e=>{
    e.preventDefault();
    clearError(googleNameError);
    if(!pendingGoogleSignup) return;

    const last=$("google-last-name").value.trim();
    const first=$("google-first-name").value.trim();
    const middle=$("google-middle-initial").value.trim().toUpperCase();

    if(!last || !first){
      showError(googleNameError,"Please enter your first and last name.");
      return;
    }
    if(middle && !/^[A-Z]$/.test(middle)){
      showError(googleNameError,"Middle initial must be one letter.");
      return;
    }

    pendingSignup={
      ...pendingGoogleSignup,
      first,last,middle,
      name:`${first} ${middle?middle+" ":""}${last}`
    };
    pendingGoogleSignup=null;
    buildRoleButtons();
    showRoleStep();
  });
}

function buildRoleButtons(){
  $("role-groups").innerHTML=ROLE_GROUPS.map(([title,list])=>`<div class="role-group"><h3>${title}</h3><div class="role-grid">${list.map(([key,label])=>`<button type="button" class="role-btn" data-role="${key}">${label.replace(/&/g,"&amp;")}</button>`).join("")}</div></div>`).join("");
}
buildRoleButtons();
const roleError=$("role-error");
$("role-groups").addEventListener("click",async e=>{
  const btn=e.target.closest(".role-btn"); if(!btn||!pendingSignup) return;
  clearError(roleError); $("role-groups").querySelectorAll("button").forEach(b=>b.disabled=true);
  const role=btn.dataset.role;
  try{
    await setDoc(doc(db,"users",pendingSignup.uid),{firstName:pendingSignup.first,lastName:pendingSignup.last,middleInitial:pendingSignup.middle,name:pendingSignup.name,email:pendingSignup.email,requestedRole:role,role:"",roleStatus:"pending",createdAt:serverTimestamp()});
    await showSignupNotice(role);
    const snap=await getDoc(doc(db,"users",pendingSignup.uid)); goCalendar(snap.data(),pendingSignup.email);
  }catch(err){ console.error(err); showError(roleError,`Your account was created, but the role request could not be saved (${err.code||"unknown error"}).`); $("role-groups").querySelectorAll("button").forEach(b=>b.disabled=false); }
});

async function showSignupNotice(role){
  const label=ROLE_LABEL[role]||role;
  let overlay=document.getElementById("signup-notification");
  if(!overlay){
    overlay=document.createElement("div");
    overlay.id="signup-notification";
    overlay.className="signup-notification";
    overlay.innerHTML=`
      <div class="signup-notification-card" role="dialog" aria-modal="true">
        <button type="button" class="signup-notification-close" aria-label="Close">&times;</button>
        <div class="signup-notification-icon">✓</div>
        <h2>Account Created</h2>
        <p class="signup-notification-message"></p>
        <button type="button" class="signup-notification-ok">Continue</button>
      </div>`;
    document.body.appendChild(overlay);
  }
  overlay.querySelector(".signup-notification-message").textContent=
    `Your requested role is ${label}. Please wait for an administrator to confirm your role before you can use the full system.`;
  overlay.classList.add("show");
  return new Promise(resolve=>{
    const close=()=>{ overlay.classList.remove("show"); resolve(); };
    overlay.querySelector(".signup-notification-close").onclick=close;
    overlay.querySelector(".signup-notification-ok").onclick=close;
  });
}

// Password reset
const forgotLink=document.querySelector(".forgot-link");
if(forgotLink) forgotLink.addEventListener("click",async e=>{ e.preventDefault(); const email=$("email").value.trim(); if(!email) return showError(formError,"Enter your email address first, then click Forgot password again."); try{ await sendPasswordResetEmail(auth,email); showError(formError,"Password reset email sent. Check your inbox."); }catch(err){ showError(formError,friendlyAuthError(err)); } });
