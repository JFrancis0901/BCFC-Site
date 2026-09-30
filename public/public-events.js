import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA6YuHWmOaPEwrMRLCmvMHENoB-ysKeRg8",
  authDomain: "bcfc-workers.firebaseapp.com",
  projectId: "bcfc-workers",
  storageBucket: "bcfc-workers.firebasestorage.app",
  messagingSenderId: "248341878396",
  appId: "1:248341878396:web:35ed0e8ccb2f829c835bf9"
};

const app = initializeApp(firebaseConfig, "bcfc-public-events");
const db = getFirestore(app);

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[c]));

const MODULE_LABELS = {
  sunday:"Sunday Service", nurture:"Family Nurture", prayer:"Abound in Prayer",
  childrens:"Children's Church", ufy:"UFY", ufw:"UFW", ufm:"UFM",
  production:"Production", creatives:"Creatives", other:"Other"
};

function todayISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function parseDate(iso){
  const [y,m,d] = String(iso || "").split("-").map(Number);
  return new Date(y, (m || 1)-1, d || 1);
}

function formatDate(iso){
  if(!iso) return "Date to be announced";
  return parseDate(iso).toLocaleDateString(undefined, {
    month:"long", day:"numeric", year:"numeric"
  });
}

function formatTime(value){
  if(!value) return "";
  const [h,m] = value.split(":").map(Number);
  if(Number.isNaN(h) || Number.isNaN(m)) return value;
  const d = new Date();
  d.setHours(h,m,0,0);
  return d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
}

function eventMarkup(event){
  const time = event.time
    ? `${formatTime(event.time)}${event.endTime ? ` – ${formatTime(event.endTime)}` : ""}`
    : "";
  const meta = [event.place, time].filter(Boolean).join(" · ");
  const category = MODULE_LABELS[event.module] || "BCFC Event";
  const d = parseDate(event.date);
  const day = d.getDate();
  const month = d.toLocaleDateString(undefined,{month:"short"});
  return `<div class="evt public-event">
    <div class="date"><b>${day}</b>${esc(month)}</div>
    <div>
      <h3>${esc(event.title || "BCFC Event")}</h3>
      <p>${esc([category, meta].filter(Boolean).join(" · "))}</p>
    </div>
  </div>`;
}

function render(events){
  const now = todayISO();
  const upcoming = events
    .filter(e => e.public === true && e.date && e.date >= now)
    .sort((a,b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`));

  document.querySelectorAll("[data-public-events]").forEach(container => {
    const limitAttr = container.getAttribute("data-public-events");
    const limit = limitAttr === "all" ? upcoming.length : Math.max(1, Number(limitAttr) || 3);
    const shown = upcoming.slice(0, limit);
    container.innerHTML = shown.length
      ? shown.map(eventMarkup).join("")
      : `<p class="public-events-empty">No upcoming public events at the moment.</p>`;
  });

  document.querySelectorAll("[data-public-event-status]").forEach(el => {
    el.textContent = upcoming.length ? "" : "No upcoming public events at the moment.";
  });
}

const eventsQuery = query(
  collection(db, "events"),
  where("public", "==", true)
);

onSnapshot(eventsQuery, snapshot => {
  render(snapshot.docs.map(d => ({id:d.id, ...d.data()})));
}, error => {
  console.error("Public events listener:", error);
  document.querySelectorAll("[data-public-events]").forEach(container => {
    container.innerHTML = `<p class="public-events-empty">Events are temporarily unavailable.</p>`;
  });
});
