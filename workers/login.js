/* ==========================================================
   BCFC WORKERS PORTAL
   LOGIN + SIGNUP
   ========================================================== */

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  deleteUser
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
   LOGIN / SIGNUP TABS
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

  if (signup) {
    showStep("role");
  }
}

tabLogin.addEventListener("click", () => showTab("login"));
tabSignup.addEventListener("click", () => showTab("signup"));


/* ==========================================================
   LOGIN
   ========================================================== */

const loginForm = $("login-form");
const formError = $("form-error");

const emailInput = $("email");
const passwordInp = $("password");
const togglePwBtn = $("toggle-password");

function clearLoginErrors() {
  emailInput.classList.remove("field-error-glow");
  passwordInp.classList.remove("field-error-glow");
}

function showLoginError(message, fields = []) {
  formError.textContent = message;
  formError.hidden = false;

  clearLoginErrors();

  fields.forEach(id => {
    const field = $(id);
    if (field) {
      field.classList.add("field-error-glow");
    }
  });
}

emailInput.addEventListener("input", () => {
  emailInput.classList.remove("field-error-glow");
});

passwordInp.addEventListener("input", () => {
  passwordInp.classList.remove("field-error-glow");
});


/* Show / hide password */

togglePwBtn.addEventListener("click", () => {
  const hidden = passwordInp.type === "password";

  passwordInp.type = hidden ? "text" : "password";
  togglePwBtn.textContent = hidden ? "Hide" : "Show";
  togglePwBtn.setAttribute(
    "aria-label",
    hidden ? "Hide password" : "Show password"
  );
});


/* Login */

loginForm.addEventListener("submit", async e => {
  e.preventDefault();

  formError.hidden = true;
  clearLoginErrors();

  const email = emailInput.value.trim();
  const password = passwordInp.value;

  if (!email && !password) {
    showLoginError(
      "Please enter your email and password.",
      ["email", "password"]
    );
    return;
  }

  if (!email) {
    showLoginError("Please enter your email address.", ["email"]);
    return;
  }

  if (!password) {
    showLoginError("Please enter your password.", ["password"]);
    return;
  }

  const btn = $("login-btn");

  btn.disabled = true;
  btn.textContent = "Logging in...";

  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const userDoc = await getDoc(
      doc(db, "users", cred.user.uid)
    );

    if (!userDoc.exists()) {
      throw { code: "no-role-doc" };
    }

    const data = userDoc.data();

    const role = data.role;
    const name = data.name;

    sessionStorage.setItem("bcfc-role", role || "guest");
    sessionStorage.setItem("bcfc-name", name || "");
    sessionStorage.setItem("bcfc-email", email);

    sessionStorage.removeItem("bcfc-test-role");
    sessionStorage.removeItem("bcfc-view-role");

    window.location.href = "calendar.html";

  } catch (err) {

    console.error(err);

    if (err.code === "no-role-doc") {

      showLoginError(
        "Your account exists but has no role set up yet. Contact an admin.",
        ["email"]
      );

    } else if (
      [
        "auth/invalid-credential",
        "auth/wrong-password",
        "auth/user-not-found"
      ].includes(err.code)
    ) {

      showLoginError(
        "Wrong email or password.",
        ["email", "password"]
      );

    } else if (err.code === "auth/too-many-requests") {

      showLoginError(
        "Too many attempts. Please wait a moment and try again.",
        ["email", "password"]
      );

    } else if (err.code === "auth/invalid-email") {

      showLoginError(
        "That email address looks invalid.",
        ["email"]
      );

    } else {

      showLoginError(
        "Something went wrong signing in. Please try again.",
        ["email", "password"]
      );
    }

    btn.disabled = false;
    btn.textContent = "Log In";
  }
});


/* Guest */

$("guest-btn").addEventListener("click", () => {
  window.location.href = "../index.html";
});


/* ==========================================================
   SIGNUP
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

const ROLE_LABEL = Object.fromEntries(
  ROLE_GROUPS.flatMap(([, list]) => list)
);

const steps = {
  role: $("step-role"),
  code: $("step-code"),
  account: $("step-account")
};

let chosenRole = "";
let chosenCode = "";


/* Signup steps */

function showStep(name) {

  Object.entries(steps).forEach(([key, element]) => {
    element.hidden = key !== name;
  });

  if (name === "code") {

    $("code-title").textContent =
      `Enter the ${ROLE_LABEL[chosenRole]} code`;

    $("access-code").focus();
  }

  if (name === "account") {

    $("role-chip").textContent =
      `Signing up as ${ROLE_LABEL[chosenRole]}`;

    $("su-name").focus();

    updatePasswordColors();
    updateConfirmPasswordColors();
  }
}


/* Role buttons */

$("role-groups").innerHTML = ROLE_GROUPS.map(
  ([title, list]) => {

    return `
      <div class="role-group">

        <h3>${title}</h3>

        <div class="role-grid">

          ${list.map(([key, label]) => `
            <button
              type="button"
              class="role-btn"
              data-role="${key}"
            >
              ${label.replace(/&/g, "&amp;")}
            </button>
          `).join("")}

        </div>

      </div>
    `;
  }
).join("");


$("role-groups").addEventListener("click", e => {

  const button = e.target.closest(".role-btn");

  if (!button) return;

  chosenRole = button.dataset.role;

  $("access-code").value = "";
  $("code-error").hidden = true;

  showStep("code");
});


/* Back buttons */

signupPanel.addEventListener("click", e => {

  const button = e.target.closest("[data-back]");

  if (!button) return;

  showStep(button.dataset.back);
});


/* ==========================================================
   ACCESS CODE
   ========================================================== */

$("code-form").addEventListener("submit", e => {

  e.preventDefault();

  const code = $("access-code").value.trim();

  $("access-code").classList.remove("field-error-glow");

  if (!code) {

    $("code-error").textContent =
      "Enter the access code to continue.";

    $("code-error").hidden = false;

    $("access-code").classList.add("field-error-glow");

    return;
  }

  chosenCode = code;

  $("code-error").hidden = true;

  showStep("account");
});


$("access-code").addEventListener("input", () => {
  $("access-code").classList.remove("field-error-glow");
});


/* ==========================================================
   PASSWORD STRENGTH
   ========================================================== */

const passwordMain = $("su-password");
const passwordConfirm = $("su-password2");


function getPasswordStrength(password) {

  if (!password) {
    return "empty";
  }

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score >= 4 && password.length >= 8) {
    return "strong";
  }

  return "weak";
}


function updatePasswordColors() {

  if (!passwordMain) return;

  passwordMain.classList.remove(
    "password-empty",
    "password-weak",
    "password-strong",
    "field-error-glow"
  );

  const strength = getPasswordStrength(
    passwordMain.value
  );

  if (strength === "empty") {
    passwordMain.classList.add("password-empty");
  }

  if (strength === "weak") {
    passwordMain.classList.add("password-weak");
  }

  if (strength === "strong") {
    passwordMain.classList.add("password-strong");
  }
}


/* ==========================================================
   CONFIRM PASSWORD
   ========================================================== */

/*
   Empty  = GRAY
   Still typing / partial = YELLOW
   Exact match = GREEN
   Longer than original = RED
   Wrong = RED
*/

function updateConfirmPasswordColors() {

  if (!passwordConfirm) return;

  passwordConfirm.classList.remove(
    "password-empty",
    "password-weak",
    "password-strong",
    "field-error-glow"
  );

  const original = passwordMain.value;
  const confirm = passwordConfirm.value;

  /* Empty */

  if (!confirm) {

    passwordConfirm.classList.add(
      "password-empty"
    );

    return;
  }


  /* Confirm password is longer than original */

  if (confirm.length > original.length) {

    passwordConfirm.classList.add(
      "field-error-glow"
    );

    return;
  }


  /* Exact match */

  if (confirm === original) {

    passwordConfirm.classList.add(
      "password-strong"
    );

    return;
  }


  /* Still typing */

  if (original.startsWith(confirm)) {

    passwordConfirm.classList.add(
      "password-weak"
    );

    return;
  }


  /* Wrong */

  passwordConfirm.classList.add(
    "field-error-glow"
  );
}


passwordMain.addEventListener(
  "input",
  () => {
    updatePasswordColors();
    updateConfirmPasswordColors();
  }
);

passwordConfirm.addEventListener(
  "input",
  updateConfirmPasswordColors
);


/* ==========================================================
   SIGNUP FORM
   ========================================================== */

const signupError = $("signup-error");

function signupErr(message, fieldIds = []) {

  signupError.textContent = message;
  signupError.hidden = false;

  [
    "su-name",
    "su-email",
    "su-password",
    "su-password2"
  ].forEach(id => {
    $(id)?.classList.remove("field-error-glow");
  });

  fieldIds.forEach(id => {
    $(id)?.classList.add("field-error-glow");
  });
}


[
  "su-name",
  "su-email",
  "su-password",
  "su-password2"
].forEach(id => {

  $(id).addEventListener("input", () => {

    $(id).classList.remove(
      "field-error-glow"
    );

    signupError.hidden = true;
  });

});


$("signup-form").addEventListener(
  "submit",
  async e => {

    e.preventDefault();

    signupError.hidden = true;

    const name = $("su-name").value.trim();
    const email = $("su-email").value.trim();

    const pw = passwordMain.value;
    const pw2 = passwordConfirm.value;


    /* Name */

    if (!name) {

      signupErr(
        "Please enter your full name.",
        ["su-name"]
      );

      return;
    }


    /* Email */

    if (!email) {

      signupErr(
        "Please enter your email address.",
        ["su-email"]
      );

      return;
    }


    /* Password */

    if (!pw) {

      signupErr(
        "Please enter a password.",
        ["su-password"]
      );

      return;
    }


    if (pw.length < 8) {

      signupErr(
        "Use a password with at least 8 characters.",
        ["su-password"]
      );

      return;
    }


    /* Confirm password */

    if (!pw2) {

      signupErr(
        "Please confirm your password.",
        ["su-password2"]
      );

      return;
    }


    if (pw2.length > pw.length) {

      signupErr(
        "The confirmation password is longer than your password.",
        ["su-password2"]
      );

      return;
    }


    if (pw !== pw2) {

      signupErr(
        "The two passwords do not match.",
        ["su-password2"]
      );

      return;
    }


    /* Create account */

    const btn = $("signup-btn");

    btn.disabled = true;
    btn.textContent = "Creating account...";


    const resetButton = () => {

      btn.disabled = false;
      btn.textContent = "Create account";
    };


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

      if (
        err.code ===
        "auth/email-already-in-use"
      ) {

        signupErr(
          "That email already has an account. Use Log in instead.",
          ["su-email"]
        );

      } else if (
        err.code === "auth/invalid-email"
      ) {

        signupErr(
          "That email address looks invalid.",
          ["su-email"]
        );

      } else if (
        err.code === "auth/weak-password"
      ) {

        signupErr(
          "Choose a stronger password.",
          ["su-password"]
        );

      } else if (
        err.code === "auth/operation-not-allowed"
      ) {

        signupErr(
          "Email sign-up is not enabled in Firebase yet.",
          ["su-email"]
        );

      } else {

        signupErr(
          `Could not create the account (${err.code || "unknown error"}).`
        );
      }

      resetButton();

      return;
    }


    /* Verify access code */

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
        await deleteUser(cred.user);
      } catch (cleanupError) {
        console.warn(
          "Account cleanup failed",
          cleanupError
        );
      }

      resetButton();

      if (
        err.code === "permission-denied"
      ) {

        $("code-error").textContent =
          `That code isn't right for ${ROLE_LABEL[chosenRole]}. Check it and try again.`;

        $("code-error").hidden = false;

        $("access-code").classList.add(
          "field-error-glow"
        );

        showStep("code");

      } else {

        signupErr(
          `Could not verify the code (${err.code || "unknown error"}).`
        );
      }

      return;
    }


    /* Save profile */

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

      resetButton();

      return;
    }


    /* Login session */

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
      "bcfc-view-role"
    );

    sessionStorage.removeItem(
      "bcfc-test-role"
    );


    window.location.href =
      "calendar.html";
  }
);


/* ==========================================================
   FORGOT PASSWORD
   ========================================================== */

const forgotLink =
  document.querySelector(".forgot-link");

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

    forgotCard.classList.add("show");
  }
);


document
  .querySelector(".close-forgot")
  .addEventListener(
    "click",
    () => {
      forgotCard.classList.remove("show");
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
      $("forgot-email").value.trim();

    if (!email) return;

    const btn =
      forgotForm.querySelector("button");

    btn.disabled = true;
    btn.textContent = "Sending...";

    try {

      await sendPasswordResetEmail(
        auth,
        email
      );

      forgotSuccess.hidden = false;

      btn.textContent =
        "Reset Link Sent";

    } catch (err) {

      console.error(err);

      if (
        err.code === "auth/invalid-email"
      ) {

        alert(
          "That email address looks invalid."
        );

        btn.disabled = false;
        btn.textContent =
          "Send Reset Link";

        return;
      }

      /*
         Firebase intentionally does not reveal
         whether an email exists.
      */

      forgotSuccess.hidden = false;

      btn.textContent =
        "Reset Link Sent";
    }
  }
);