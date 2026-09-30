/* ==========================================================
   login.js

   LOGIN:
   - Email + password
   - Google

   SIGN UP:
   - Choose role
   - Enter access code
   - Google OR email/password

   Google signup flow:
   role -> access code -> Google -> dashboard ->
   name prompt -> save name -> dashboard usable
   ========================================================== */

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

import { auth, db } from "./firebase-config.js";

const $ = id => document.getElementById(id);


/* ==========================================================
   SESSION HELPERS
   ========================================================== */

function saveSession(role, name, email, needsName = false) {

  sessionStorage.setItem(
    "bcfc-role",
    role || ""
  );

  sessionStorage.setItem(
    "bcfc-name",
    name || ""
  );

  sessionStorage.setItem(
    "bcfc-email",
    email || ""
  );

  sessionStorage.removeItem(
    "bcfc-test-role"
  );

  sessionStorage.removeItem(
    "bcfc-view-role"
  );


  if (needsName) {
    sessionStorage.setItem(
      "bcfc-needs-name",
      "1"
    );
  } else {
    sessionStorage.removeItem(
      "bcfc-needs-name"
    );
  }

}


function goToDashboard(
  role,
  name,
  email,
  needsName = false
) {

  saveSession(
    role,
    name,
    email,
    needsName
  );

  window.location.href =
    "calendar.html";

}


/* ==========================================================
   TABS
   ========================================================== */

const tabLogin =
  $("tab-login");

const tabSignup =
  $("tab-signup");

const loginPanel =
  $("login-panel");

const signupPanel =
  $("signup-panel");


function showTab(which) {

  const signup =
    which === "signup";

  loginPanel.hidden =
    signup;

  signupPanel.hidden =
    !signup;

  tabLogin.classList.toggle(
    "on",
    !signup
  );

  tabSignup.classList.toggle(
    "on",
    signup
  );

  tabLogin.setAttribute(
    "aria-selected",
    String(!signup)
  );

  tabSignup.setAttribute(
    "aria-selected",
    String(signup)
  );

  if (signup) {
    showStep("role");
  }

}


tabLogin.addEventListener(
  "click",
  () => showTab("login")
);

tabSignup.addEventListener(
  "click",
  () => showTab("signup")
);


/* ==========================================================
   NORMAL EMAIL LOGIN
   ========================================================== */

const loginForm =
  $("login-form");

const formError =
  $("form-error");

const passwordInp =
  $("password");

const togglePwBtn =
  $("toggle-password");


togglePwBtn.addEventListener(
  "click",
  () => {

    const hidden =
      passwordInp.type === "password";

    passwordInp.type =
      hidden
        ? "text"
        : "password";

    togglePwBtn.textContent =
      hidden
        ? "Hide"
        : "Show";

  }
);


function showError(message) {

  formError.textContent =
    message;

  formError.hidden =
    false;

}


loginForm.addEventListener(
  "submit",
  async e => {

    e.preventDefault();

    formError.hidden =
      true;


    const email =
      $("email")
        .value
        .trim();

    const password =
      passwordInp.value;


    if (!email || !password) {

      showError(
        "Please enter your email and password."
      );

      return;
    }


    const btn =
      $("login-btn");

    btn.disabled =
      true;

    btn.textContent =
      "Logging in...";


    try {

      const cred =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );


      const userDoc =
        await getDoc(
          doc(
            db,
            "users",
            cred.user.uid
          )
        );


      if (!userDoc.exists()) {

        throw {
          code: "no-role-doc"
        };

      }


      const data =
        userDoc.data();

      const role =
        data.role || "";

      const name =
        (data.name || "").trim();

      const needsName =
        !name;


      goToDashboard(
        role,
        name,
        email,
        needsName
      );


    } catch (err) {

      console.error(err);


      if (
        err.code ===
        "no-role-doc"
      ) {

        showError(
          "Your account exists but has no role set up yet. Contact an admin."
        );

      }

      else if (
        [
          "auth/invalid-credential",
          "auth/wrong-password",
          "auth/user-not-found"
        ].includes(err.code)
      ) {

        showError(
          "Wrong email or password."
        );

      }

      else if (
        err.code ===
        "auth/too-many-requests"
      ) {

        showError(
          "Too many attempts. Please wait a moment and try again."
        );

      }

      else if (
        err.code ===
        "auth/invalid-email"
      ) {

        showError(
          "That email address looks invalid."
        );

      }

      else {

        showError(
          "Something went wrong signing in. Please try again."
        );

      }


      btn.disabled =
        false;

      btn.textContent =
        "Log In";

    }

  }
);


/* ==========================================================
   GOOGLE LOGIN
   ========================================================== */

const googleBtn =
  $("google-btn");

const googleBtnText =
  $("google-btn-text");


googleBtn.addEventListener(
  "click",
  async () => {

    formError.hidden =
      true;

    googleBtn.disabled =
      true;

    googleBtnText.textContent =
      "Connecting to Google...";


    try {

      const provider =
        new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account"
      });


      const result =
        await signInWithPopup(
          auth,
          provider
        );


      const googleUser =
        result.user;


      const userDoc =
        await getDoc(
          doc(
            db,
            "users",
            googleUser.uid
          )
        );


      if (!userDoc.exists()) {

        try {
          await deleteUser(
            googleUser
          );
        } catch (_) {

          try {
            await signOut(auth);
          } catch (_) {}

        }


        showError(
          "This Google account is not registered as a BCFC worker yet. Please use Sign up first."
        );

        return;
      }


      const data =
        userDoc.data();

      const role =
        data.role || "";

      const name =
        (data.name || "").trim();


      /*
        If the profile exists but the name is empty,
        send the person to the dashboard and let the
        dashboard ask for their name.
      */

      goToDashboard(
        role,
        name,
        googleUser.email || "",
        !name
      );


    } catch (err) {

      console.error(
        "Google login error:",
        err
      );


      if (
        err.code ===
        "auth/popup-closed-by-user"
      ) {

        showError(
          "Google sign-in was cancelled."
        );

      }

      else if (
        err.code ===
        "auth/popup-blocked"
      ) {

        showError(
          "Your browser blocked the Google sign-in window. Please allow pop-ups for this site."
        );

      }

      else if (
        err.code ===
        "auth/account-exists-with-different-credential"
      ) {

        showError(
          "This Google email already has a BCFC account using email and password. Please use your normal password login."
        );

      }

      else if (
        err.code ===
        "auth/unauthorized-domain"
      ) {

        showError(
          "This website address is not authorized for Google sign-in in Firebase."
        );

      }

      else if (
        err.code ===
        "auth/operation-not-allowed"
      ) {

        showError(
          "Google sign-in is not enabled in Firebase yet."
        );

      }

      else {

        showError(
          "Google sign-in failed. Please try again."
        );

      }

    }

    finally {

      googleBtn.disabled =
        false;

      googleBtnText.textContent =
        "Continue with Google";

    }

  }
);


/* ==========================================================
   GUEST
   ========================================================== */

$("guest-btn").addEventListener(
  "click",
  () => {

    // Public church site now lives in /public/, not at site root.
    window.location.href =
      "../public/index.html";

  }
);


/* ==========================================================
   SIGNUP ROLES
   ========================================================== */

const ROLE_GROUPS = [

  [
    "Church leadership",
    [
      ["admin", "Admin"],
      ["pastor", "Pastor"],
      ["preaching", "Preaching Staff"]
    ]
  ],

  [
    "Department leads",
    [
      ["childrens-lead", "Children's Church Lead"],
      ["ufy-lead", "UFY Lead"],
      ["ufw-lead", "UFW Lead"],
      ["ufm-lead", "UFM Lead"],
      ["production-lead", "Production Lead"],
      ["creatives-lead", "Creatives Lead"]
    ]
  ],

  [
    "Department workers",
    [
      ["childrens", "Children's Church Worker"],
      ["ufy", "UFY Worker"],
      ["ufw", "UFW Worker"],
      ["ufm", "UFM Worker"],
      ["production", "Production Worker"],
      ["creatives", "Creatives Worker"]
    ]
  ]

];


const ROLE_LABEL =
  Object.fromEntries(
    ROLE_GROUPS.flatMap(
      ([, list]) => list
    )
  );


const steps = {
  role: $("step-role"),
  code: $("step-code"),
  account: $("step-account")
};


let chosenRole = "";
let chosenCode = "";


function showStep(name) {

  Object.entries(steps).forEach(
    ([key, element]) => {

      element.hidden =
        key !== name;

    }
  );


  if (name === "code") {

    $("code-title").textContent =
      `Enter the ${ROLE_LABEL[chosenRole]} code`;

    $("access-code").focus();

  }


  if (name === "account") {

    $("role-chip").textContent =
      `Signing up as ${ROLE_LABEL[chosenRole]}`;

  }

}


/* Build role buttons */

$("role-groups").innerHTML =
  ROLE_GROUPS.map(
    ([title, list]) => `

      <div class="role-group">

        <h3>${title}</h3>

        <div class="role-grid">

          ${
            list.map(
              ([key, label]) => `

                <button
                  type="button"
                  class="role-btn"
                  data-role="${key}">
                  ${label.replace(
                    /&/g,
                    "&amp;"
                  )}
                </button>

              `
            ).join("")
          }

        </div>

      </div>

    `
  ).join("");


$("role-groups").addEventListener(
  "click",
  e => {

    const button =
      e.target.closest(
        ".role-btn"
      );

    if (!button) return;


    chosenRole =
      button.dataset.role;

    $("access-code").value =
      "";

    $("code-error").hidden =
      true;

    showStep("code");

  }
);


signupPanel.addEventListener(
  "click",
  e => {

    const button =
      e.target.closest(
        "[data-back]"
      );

    if (button) {

      showStep(
        button.dataset.back
      );

    }

  }
);


/* ==========================================================
   ACCESS CODE
   ========================================================== */

$("code-form").addEventListener(
  "submit",
  e => {

    e.preventDefault();


    const code =
      $("access-code")
        .value
        .trim()
        .toUpperCase();


    if (!code) {

      $("code-error").textContent =
        "Enter the access code to continue.";

      $("code-error").hidden =
        false;

      return;

    }


    chosenCode =
      code;

    $("code-error").hidden =
      true;

    showStep("account");

  }
);


/* ==========================================================
   SIGNUP ERROR
   ========================================================== */

const signupError =
  $("signup-error");


function signupErr(message) {

  signupError.textContent =
    message;

  signupError.hidden =
    false;

}


/* ==========================================================
   GOOGLE SIGNUP
   ========================================================== */

const googleSignupBtn =
  $("google-signup-btn");

const googleSignupBtnText =
  $("google-signup-btn-text");


googleSignupBtn.addEventListener(
  "click",
  async () => {

    signupError.hidden =
      true;

    $("code-error").hidden =
      true;


    if (
      !chosenRole ||
      !chosenCode
    ) {

      signupErr(
        "Please choose your role and enter your access code first."
      );

      return;
    }


    googleSignupBtn.disabled =
      true;

    googleSignupBtnText.textContent =
      "Connecting to Google...";


    let googleUser =
      null;

    let isNewGoogleAccount =
      false;


    try {

      const provider =
        new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account"
      });


      const result =
        await signInWithPopup(
          auth,
          provider
        );


      googleUser =
        result.user;


      isNewGoogleAccount =
        result?.providerId === "google.com";


      /*
        Check whether this Google account
        already has a workers profile.
      */

      const existingUser =
        await getDoc(
          doc(
            db,
            "users",
            googleUser.uid
          )
        );


      /*
        Already registered:
        - If name exists -> use Log in
        - If name is empty -> continue to dashboard
          and ask for the missing name.
      */

      if (existingUser.exists()) {

        const data =
          existingUser.data();

        const role =
          data.role || "";

        const name =
          (data.name || "").trim();


        if (!name) {

          goToDashboard(
            role,
            "",
            googleUser.email || "",
            true
          );

          return;

        }


        await signOut(auth);


        signupErr(
          "This Google account is already registered. Please use Log in instead."
        );

        return;

      }


      /*
        FIRST:
        Verify the selected role + code.
      */

      try {

        await setDoc(
          doc(
            db,
            "signups",
            googleUser.uid
          ),
          {
            role: chosenRole,
            code: chosenCode
          }
        );

      } catch (codeErr) {

        console.error(
          "Google signup code error:",
          codeErr
        );


        if (isNewGoogleAccount) {

          try {
            await deleteUser(
              googleUser
            );
          } catch (_) {

            try {
              await signOut(auth);
            } catch (_) {}

          }

        } else {

          try {
            await signOut(auth);
          } catch (_) {}

        }


        if (
          codeErr.code ===
          "permission-denied"
        ) {

          $("code-error").textContent =
            `That code isn't right for ${ROLE_LABEL[chosenRole]}. Check it and try again.`;

          $("code-error").hidden =
            false;

          showStep("code");

        } else {

          signupErr(
            `Could not verify the code (${codeErr.code || "unknown error"}).`
          );

        }


        return;

      }


      /*
        SECOND:
        Create the worker profile immediately,
        but leave the name blank.

        The dashboard will ask for the name.
      */

      try {

        await setDoc(
          doc(
            db,
            "users",
            googleUser.uid
          ),
          {
            role: chosenRole,
            name: "",
            email: googleUser.email || "",
            createdAt: serverTimestamp()
          }
        );

      } catch (profileErr) {

        console.error(
          "Google profile creation error:",
          profileErr
        );


        if (isNewGoogleAccount) {

          try {
            await deleteUser(
              googleUser
            );
          } catch (_) {

            try {
              await signOut(auth);
            } catch (_) {}

          }

        } else {

          try {
            await signOut(auth);
          } catch (_) {}

        }


        signupErr(
          `The account was created but the worker profile could not be saved (${profileErr.code || "unknown error"}).`
        );

        return;

      }


      /*
        Everything is ready.

        Go to the dashboard.
        The dashboard will block interaction
        and ask for the worker's full name.
      */

      goToDashboard(
        chosenRole,
        "",
        googleUser.email || "",
        true
      );


    } catch (err) {

      console.error(
        "Google signup error:",
        err
      );


      if (
        err.code ===
        "auth/popup-closed-by-user"
      ) {

        signupErr(
          "Google sign-up was cancelled."
        );

      }

      else if (
        err.code ===
        "auth/popup-blocked"
      ) {

        signupErr(
          "Your browser blocked the Google sign-in window. Please allow pop-ups for this site."
        );

      }

      else if (
        err.code ===
        "auth/unauthorized-domain"
      ) {

        signupErr(
          "This website address is not authorized for Google sign-in in Firebase."
        );

      }

      else if (
        err.code ===
        "auth/operation-not-allowed"
      ) {

        signupErr(
          "Google sign-in is not enabled in Firebase yet."
        );

      }

      else if (
        err.code ===
        "auth/account-exists-with-different-credential"
      ) {

        signupErr(
          "This Google email already has an account using another sign-in method. Please use Log in instead."
        );

      }

      else {

        signupErr(
          `Google sign-up failed (${err.code || "unknown error"}).`
        );

      }

    }

    finally {

      googleSignupBtn.disabled =
        false;

      googleSignupBtnText.textContent =
        "Continue with Google";

    }

  }
);


/* ==========================================================
   EMAIL/PASSWORD SIGNUP
   ========================================================== */

$("signup-form").addEventListener(
  "submit",
  async e => {

    e.preventDefault();

    signupError.hidden =
      true;


    const name =
      $("su-name")
        .value
        .trim();

    const email =
      $("su-email")
        .value
        .trim();

    const pw =
      $("su-password")
        .value;

    const pw2 =
      $("su-password2")
        .value;


    if (
      !name ||
      !email ||
      !pw
    ) {

      signupErr(
        "Fill in your name, email and password."
      );

      return;

    }


    if (pw.length < 8) {

      signupErr(
        "Use a password with at least 8 characters."
      );

      return;

    }


    if (pw !== pw2) {

      signupErr(
        "The two passwords do not match."
      );

      return;

    }


    const btn =
      $("signup-btn");

    btn.disabled =
      true;

    btn.textContent =
      "Creating account...";


    let cred;


    try {

      cred =
        await createUserWithEmailAndPassword(
          auth,
          email,
          pw
        );

    } catch (err) {

      console.error(err);


      signupErr(

        err.code ===
        "auth/email-already-in-use"

          ? "That email already has an account. Use Log in instead."

          : err.code ===
            "auth/invalid-email"

            ? "That email address looks invalid."

            : err.code ===
              "auth/weak-password"

              ? "Choose a stronger password."

              : err.code ===
                "auth/operation-not-allowed"

                ? "Email sign-up is not enabled in Firebase yet."

                : `Could not create the account (${err.code || "unknown error"}).`

      );


      btn.disabled =
        false;

      btn.textContent =
        "Create account";

      return;

    }


    /*
      Verify role code.
    */

    try {

      await setDoc(
        doc(
          db,
          "signups",
          cred.user.uid
        ),
        {
          role: chosenRole,
          code: chosenCode
        }
      );

    } catch (err) {

      console.error(err);


      try {
        await deleteUser(
          cred.user
        );
      } catch (_) {}


      btn.disabled =
        false;

      btn.textContent =
        "Create account";


      if (
        err.code ===
        "permission-denied"
      ) {

        $("code-error").textContent =
          `That code isn't right for ${ROLE_LABEL[chosenRole]}. Check it and try again.`;

        $("code-error").hidden =
          false;

        showStep("code");

      } else {

        signupErr(
          `Could not verify the code (${err.code || "unknown error"}).`
        );

      }

      return;

    }


    /*
      Create worker profile.
    */

    try {

      await setDoc(
        doc(
          db,
          "users",
          cred.user.uid
        ),
        {
          role: chosenRole,
          name,
          email,
          createdAt: serverTimestamp()
        }
      );

    } catch (err) {

      console.error(err);


      signupErr(
        `Your code was accepted but the profile could not be saved (${err.code || "unknown error"}).`
      );


      btn.disabled =
        false;

      btn.textContent =
        "Create account";

      return;

    }


    goToDashboard(
      chosenRole,
      name,
      email,
      false
    );

  }
);


/* ==========================================================
   FORGOT PASSWORD
   ========================================================== */

const forgotLink =
  document.querySelector(
    ".forgot-link"
  );

const forgotCard =
  $("forgot-password");

const forgotForm =
  $("forgot-form");

const forgotSuccess =
  $("forgot-success");


forgotLink.addEventListener(
  "click",
  e => {

    e.preventDefault();

    forgotCard.classList.add(
      "show"
    );

  }
);


document
  .querySelector(".close-forgot")
  .addEventListener(
    "click",
    () => {

      forgotCard.classList.remove(
        "show"
      );

    }
  );


document.addEventListener(
  "keydown",
  e => {

    if (e.key === "Escape") {

      forgotCard.classList.remove(
        "show"
      );

    }

  }
);


forgotForm.addEventListener(
  "submit",
  async e => {

    e.preventDefault();


    const email =
      $("forgot-email")
        .value
        .trim();


    if (!email) return;


    const btn =
      forgotForm.querySelector(
        "button"
      );


    btn.disabled =
      true;

    btn.textContent =
      "Sending...";


    try {

      await sendPasswordResetEmail(
        auth,
        email
      );

      forgotSuccess.hidden =
        false;

    } catch (err) {

      console.error(err);


      if (
        err.code ===
        "auth/invalid-email"
      ) {

        btn.disabled =
          false;

        btn.textContent =
          "Send Reset Link";

        alert(
          "That email address looks invalid."
        );

        return;

      }

      forgotSuccess.hidden =
        false;

    }

  }
);