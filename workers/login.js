/* ==========================================================
   BCFC WORKERS LOGIN / SIGNUP
   ========================================================== */

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
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
   TABS
   ========================================================== */

const tabLogin = $("tab-login");
const tabSignup = $("tab-signup");
const loginPanel = $("login-panel");
const signupPanel = $("signup-panel");

function showTab(which) {
  const signup = which === "signup";

  loginPanel.hidden = signup;
  signupPanel.hidden = !signup;

  tabLogin.classList.toggle("on", !signup);
  tabSignup.classList.toggle("on", signup);

  tabLogin.setAttribute("aria-selected", String(!signup));
  tabSignup.setAttribute("aria-selected", String(signup));

  if (signup) showStep("role");
}

tabLogin.addEventListener("click", () => showTab("login"));
tabSignup.addEventListener("click", () => showTab("signup"));


/* ==========================================================
   GENERAL ERROR GLOW
   ========================================================== */

function errorGlow(field) {
  if (!field) return;

  field.classList.remove("field-error-glow");

  void field.offsetWidth;

  field.classList.add("field-error-glow");
}


/* ==========================================================
   LOGIN
   ========================================================== */

const loginForm = $("login-form");
const formError = $("form-error");
const passwordInput = $("password");
const togglePassword = $("toggle-password");

togglePassword.addEventListener("click", () => {
  const hidden = passwordInput.type === "password";

  passwordInput.type = hidden ? "text" : "password";
  togglePassword.textContent = hidden ? "Hide" : "Show";
});

function loginError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

loginForm.addEventListener("submit", async e => {
  e.preventDefault();

  formError.hidden = true;

  const email = $("email").value.trim();
  const password = passwordInput.value;

  if (!email) {
    loginError("Please enter your email address.");
    errorGlow($("email"));
    return;
  }

  if (!password) {
    loginError("Please enter your password.");
    errorGlow(passwordInput);
    return;
  }

  const button = $("login-btn");

  button.disabled = true;
  button.textContent = "Logging in...";

  try {

    const credential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const userRef =
      doc(db, "users", credential.user.uid);

    const userSnap =
      await getDoc(userRef);


    if (!userSnap.exists()) {

      await signOut(auth);

      loginError(
        "This account exists, but its worker profile is incomplete. Go to Sign Up and finish the account using the same email and password."
      );

      button.disabled = false;
      button.textContent = "Log In";

      return;
    }


    const userData =
      userSnap.data();


    if (!userData.role) {

      await signOut(auth);

      loginError(
        "This account does not have a worker role yet. Go to Sign Up and finish setting up your role."
      );

      button.disabled = false;
      button.textContent = "Log In";

      return;
    }


    sessionStorage.setItem(
      "bcfc-role",
      userData.role
    );

    sessionStorage.setItem(
      "bcfc-name",
      userData.name || ""
    );

    sessionStorage.setItem(
      "bcfc-email",
      userData.email || email
    );

    sessionStorage.removeItem("bcfc-test-role");
    sessionStorage.removeItem("bcfc-view-role");

    window.location.href = "calendar.html";

  } catch (err) {

    console.error("LOGIN ERROR:", err);

    if (
      err.code === "auth/invalid-credential" ||
      err.code === "auth/wrong-password" ||
      err.code === "auth/user-not-found"
    ) {

      loginError("Wrong email or password.");

      errorGlow($("email"));
      errorGlow(passwordInput);

    } else if (
      err.code === "auth/too-many-requests"
    ) {

      loginError(
        "Too many attempts. Please wait a moment and try again."
      );

    } else if (
      err.code === "auth/invalid-email"
    ) {

      loginError(
        "That email address is invalid."
      );

      errorGlow($("email"));

    } else {

      loginError(
        `Login failed (${err.code || "unknown error"}).`
      );
    }

    button.disabled = false;
    button.textContent = "Log In";
  }
});


/* ==========================================================
   GUEST
   ========================================================== */

$("guest-btn").addEventListener("click", () => {
  window.location.href = "../index.html";
});


/* ==========================================================
   ROLES
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


/* ==========================================================
   SIGNUP STEPS
   ========================================================== */

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
      element.hidden = key !== name;
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

    $("su-name").focus();
  }
}


/* ==========================================================
   ROLE BUTTONS
   ========================================================== */

$("role-groups").innerHTML =
  ROLE_GROUPS.map(
    ([title, list]) => `
      <div class="role-group">
        <h3>${title}</h3>

        <div class="role-grid">
          ${list.map(
            ([role, label]) => `
              <button
                type="button"
                class="role-btn"
                data-role="${role}">
                ${label}
              </button>
            `
          ).join("")}
        </div>
      </div>
    `
  ).join("");

$("role-groups").addEventListener("click", e => {

  const button =
    e.target.closest(".role-btn");

  if (!button) return;

  chosenRole =
    button.dataset.role;

  chosenCode = "";

  $("access-code").value = "";

  $("code-error").hidden = true;

  showStep("code");
});


/* ==========================================================
   BACK BUTTONS
   ========================================================== */

signupPanel.addEventListener("click", e => {

  const button =
    e.target.closest("[data-back]");

  if (!button) return;

  if (button.dataset.back === "role") {

    chosenRole = "";
    chosenCode = "";

    $("access-code").value = "";

    showStep("role");

    return;
  }

  if (button.dataset.back === "code") {

    showStep("code");
  }
});


/* ==========================================================
   ACCESS CODE
   ========================================================== */

$("access-code").addEventListener("input", () => {

  /*
     IMPORTANT:
     Convert the code to uppercase automatically.
     Remove spaces.
  */

  $("access-code").value =
    $("access-code")
      .value
      .toUpperCase()
      .replace(/\s/g, "");

  $("code-error").hidden = true;

  $("access-code").classList.remove(
    "field-error-glow"
  );
});


$("code-form").addEventListener("submit", e => {

  e.preventDefault();

  const code =
    $("access-code")
      .value
      .toUpperCase()
      .replace(/\s/g, "");

  if (!code) {

    $("code-error").textContent =
      "Enter the access code.";

    $("code-error").hidden = false;

    errorGlow(
      $("access-code")
    );

    return;
  }

  /*
     Save normalized code.
  */

  chosenCode = code;

  showStep("account");
});


/* ==========================================================
   PASSWORD COLORS
   ========================================================== */

const signupPassword =
  $("su-password");

const confirmPassword =
  $("su-password2");


function updatePasswordColor() {

  const password =
    signupPassword.value;

  signupPassword.classList.remove(
    "password-empty",
    "password-weak",
    "password-strong",
    "field-error-glow"
  );

  if (!password) {

    signupPassword.classList.add(
      "password-empty"
    );

    return;
  }


  /*
     8 OR MORE = GREEN
     UNDER 8 = YELLOW
  */

  if (password.length >= 8) {

    signupPassword.classList.add(
      "password-strong"
    );

  } else {

    signupPassword.classList.add(
      "password-weak"
    );
  }

  updateConfirmPassword();
}


function updateConfirmPassword() {

  const password =
    signupPassword.value;

  const confirm =
    confirmPassword.value;

  confirmPassword.classList.remove(
    "password-empty",
    "password-weak",
    "password-strong",
    "field-error-glow"
  );


  if (!confirm) {

    confirmPassword.classList.add(
      "password-empty"
    );

    return;
  }


  /*
     Longer than original = RED
  */

  if (
    confirm.length >
    password.length
  ) {

    confirmPassword.classList.add(
      "field-error-glow"
    );

    return;
  }


  /*
     Exact match = GREEN
  */

  if (confirm === password) {

    confirmPassword.classList.add(
      "password-strong"
    );

    return;
  }


  /*
     Partial match = YELLOW
  */

  if (
    password.startsWith(confirm)
  ) {

    confirmPassword.classList.add(
      "password-weak"
    );

    return;
  }


  /*
     Wrong = RED
  */

  confirmPassword.classList.add(
    "field-error-glow"
  );
}


signupPassword.addEventListener(
  "input",
  updatePasswordColor
);

confirmPassword.addEventListener(
  "input",
  updateConfirmPassword
);


/* ==========================================================
   SIGNUP
   ========================================================== */

const signupForm =
  $("signup-form");

const signupError =
  $("signup-error");

function signupErr(message) {

  signupError.textContent =
    message;

  signupError.hidden = false;
}


signupForm.addEventListener(
  "submit",
  async e => {

    e.preventDefault();

    signupError.hidden = true;


    const name =
      $("su-name").value.trim();

    const email =
      $("su-email").value.trim();

    const password =
      signupPassword.value;

    const password2 =
      confirmPassword.value;


    /* ---------- VALIDATION ---------- */

    if (!chosenRole) {

      signupErr(
        "Please choose your role."
      );

      showStep("role");

      return;
    }


    if (!chosenCode) {

      signupErr(
        "Please enter your access code."
      );

      showStep("code");

      return;
    }


    if (!name) {

      signupErr(
        "Please enter your full name."
      );

      errorGlow(
        $("su-name")
      );

      return;
    }


    if (!email) {

      signupErr(
        "Please enter your email."
      );

      errorGlow(
        $("su-email")
      );

      return;
    }


    if (password.length < 8) {

      signupErr(
        "Password must be at least 8 characters."
      );

      errorGlow(
        signupPassword
      );

      return;
    }


    if (password !== password2) {

      signupErr(
        "The passwords do not match."
      );

      errorGlow(
        confirmPassword
      );

      return;
    }


    const button =
      $("signup-btn");

    button.disabled = true;
    button.textContent =
      "Creating account...";


    let credential;


    /* ======================================================
       CREATE AUTH ACCOUNT
       ====================================================== */

    try {

      credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

    } catch (err) {

      /*
         Existing Auth account.

         Try to recover it instead.
      */

      if (
        err.code ===
        "auth/email-already-in-use"
      ) {

        try {

          credential =
            await signInWithEmailAndPassword(
              auth,
              email,
              password
            );

        } catch (recoveryError) {

          console.error(
            "ACCOUNT RECOVERY ERROR:",
            recoveryError
          );

          signupErr(
            recoveryError.code ===
              "auth/wrong-password" ||
            recoveryError.code ===
              "auth/invalid-credential"

              ? "This email already exists, but the password is incorrect."

              : `This email already exists (${recoveryError.code || "unknown error"}).`
          );

          button.disabled = false;
          button.textContent =
            "Create account";

          return;
        }

      } else {

        console.error(
          "CREATE ACCOUNT ERROR:",
          err
        );

        signupErr(
          err.code ===
            "auth/invalid-email"

            ? "That email address is invalid."

            : err.code ===
              "auth/weak-password"

            ? "Choose a stronger password."

            : `Could not create the account (${err.code || "unknown error"}).`
        );

        button.disabled = false;
        button.textContent =
          "Create account";

        return;
      }
    }


    const uid =
      credential.user.uid;


    /* ======================================================
       CHECK USER PROFILE
       ====================================================== */

    const userRef =
      doc(db, "users", uid);

    let userSnap;

    try {

      userSnap =
        await getDoc(userRef);

    } catch (err) {

      console.error(
        "USER PROFILE READ ERROR:",
        err
      );

      signupErr(
        `Cannot check your worker profile (${err.code || "unknown error"}).`
      );

      button.disabled = false;
      button.textContent =
        "Create account";

      return;
    }


    /*
       If profile already has a role,
       this is already a completed account.
    */

    if (
      userSnap.exists() &&
      userSnap.data().role
    ) {

      await signOut(auth);

      signupErr(
        "This email is already registered. Please use Log In."
      );

      errorGlow(
        $("su-email")
      );

      button.disabled = false;
      button.textContent =
        "Create account";

      return;
    }


    /* ======================================================
       STEP A — VERIFY ACCESS CODE
       ====================================================== */

    try {

      await setDoc(
        doc(db, "signups", uid),
        {
          role: chosenRole,
          code: chosenCode
        }
      );

    } catch (err) {

      console.error(
        "ACCESS CODE FIRESTORE ERROR:",
        err
      );


      /*
         ONLY THIS ERROR IS NOW CALLED
         AN ACCESS-CODE ERROR.
      */

      if (
        err.code ===
        "permission-denied"
      ) {

        await signOut(auth);

        $("code-error").textContent =
          `The access code for ${ROLE_LABEL[chosenRole]} was rejected by Firebase.`;

        $("code-error").hidden = false;

        showStep("code");

        errorGlow(
          $("access-code")
        );

      } else {

        signupErr(
          `Firebase could not verify the signup (${err.code || "unknown error"}).`
        );
      }


      button.disabled = false;
      button.textContent =
        "Create account";

      return;
    }


    /* ======================================================
       STEP B — CREATE USER PROFILE
       ====================================================== */

    try {

      await setDoc(
        userRef,
        {
          role: chosenRole,
          name: name,
          email: email,
          createdAt: serverTimestamp()
        }
      );

    } catch (err) {

      console.error(
        "USER PROFILE SAVE ERROR:",
        err
      );

      signupErr(
        `The access code was accepted, but the worker profile could not be saved (${err.code || "unknown error"}).`
      );

      button.disabled = false;
      button.textContent =
        "Create account";

      return;
    }


    /* ======================================================
       SUCCESS
       ====================================================== */

    sessionStorage.setItem(
      "bcfc-role",
      chosenRole
    );

    sessionStorage.setItem(
      "bcfc-name",
      name
    );

    sessionStorage.setItem(
      "bcfc-email",
      email
    );

    sessionStorage.removeItem(
      "bcfc-test-role"
    );

    sessionStorage.removeItem(
      "bcfc-view-role"
    );


    window.location.href =
      "calendar.html";
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

    if (!email) {

      errorGlow(
        $("forgot-email")
      );

      return;
    }


    const button =
      forgotForm.querySelector(
        "button"
      );

    button.disabled = true;
    button.textContent =
      "Sending...";


    try {

      await sendPasswordResetEmail(
        auth,
        email
      );

      forgotSuccess.hidden =
        false;

      button.textContent =
        "Reset Link Sent";

    } catch (err) {

      console.error(err);

      if (
        err.code ===
        "auth/invalid-email"
      ) {

        errorGlow(
          $("forgot-email")
        );

        button.disabled = false;
        button.textContent =
          "Send Reset Link";

        return;
      }

      forgotSuccess.hidden =
        false;
    }
  }
);


/* ==========================================================
   REMOVE OLD ROLE SWITCHING
   ========================================================== */

sessionStorage.removeItem(
  "bcfc-test-role"
);

sessionStorage.removeItem(
  "bcfc-view-role"
);