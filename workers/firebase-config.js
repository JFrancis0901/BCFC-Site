/* ==========================================================
   firebase-config.js = connects this site to YOUR Firebase project.
   These values are safe to be public in your code — Firebase security
   comes from the sign-in system and the Firestore rules, not from
   hiding this file. Every Firebase web app publishes this openly.
   ========================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA6YuHWmOaPEwrMRLCmvMHENoB-ysKeRg8",
  authDomain: "bcfc-workers.firebaseapp.com",
  projectId: "bcfc-workers",
  storageBucket: "bcfc-workers.firebasestorage.app",
  messagingSenderId: "248341878396",
  appId: "1:248341878396:web:35ed0e8ccb2f829c835bf9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
