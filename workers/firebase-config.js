/* ==========================================================
   firebase-config.js = connects this site to YOUR Firebase project.

   Auth persistence is intentionally TAB-BASED. This means each browser tab
   keeps its own signed-in worker account. Logging a different worker into a
   second tab will NOT replace the account in the first tab, and refreshing
   either tab keeps that tab's account signed in.
   ========================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence
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

// IMPORTANT: use session persistence instead of Firebase's default local
// persistence. Firebase's local persistence is shared by tabs for the same
// origin, so signing in another account in another tab can replace the first
// account. Session persistence keeps each tab's account independent while
// still surviving normal page refreshes in that tab.
export const authPersistenceReady = setPersistence(auth, browserSessionPersistence)
  .catch(error => {
    console.error("Could not configure tab-based auth persistence:", error);
    throw error;
  });
