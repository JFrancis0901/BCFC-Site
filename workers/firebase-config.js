/* ==========================================================
   firebase-config.js = connects this site to YOUR Firebase project.

   Auth persistence is shared across tabs so Admin Panel, Live Display, and Monitor
   can open in separate tabs without asking the same user to sign in again.
   ========================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
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

// Use local persistence so the signed-in account is available to new tabs.
export const authPersistenceReady = setPersistence(auth, browserLocalPersistence)
  .catch(error => {
    console.error("Could not configure shared auth persistence:", error);
    throw error;
  });
