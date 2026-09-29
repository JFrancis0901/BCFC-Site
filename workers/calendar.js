/* ==========================================================
   calendar.js

   Calendar + dashboard name setup.

   Google signup users arrive here with:

   sessionStorage:
     bcfc-needs-name = "1"

   The dashboard opens, but the name overlay blocks
   interaction until the user saves their full name.
   ========================================================== */

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

import {
  auth,
  db
} from "./firebase-config.js";


/* ==========================================================
   MODULES
   ========================================================== */

const MODULE_COLORS = {

  sunday: {
    label: "Sunday Service",
    dot: "dot-sunday"
  },

  nurture: {
    label: "Family Nurture",
    dot: "dot-nurture"
  },

  prayer: {
    label: "Abound in Prayer",
    dot: "dot-prayer"
  },

  childrens: {
    label: "Children's Church",
    dot: "dot-childrens"
  },

  ufy: {
    label: "UFY",
    dot: "dot-ufy"
  },

  ufw: {
    label: "UFW",
    dot: "dot-ufw"
  },

  ufm: {
    label: "UFM",
    dot: "dot-ufm"
  },

  production: {
    label: "Production",
    dot: "dot-production"
  },

  creatives: {
    label: "Creatives",
    dot: "dot-creatives"
  },

  other: {
    label: "Other",
    dot: "dot-other"
  }

};


const PREACHING = [
  "sunday",
  "nurture",
  "prayer"
];


/* ==========================================================
   ROLE PERMISSIONS
   ========================================================== */

const ALL =
  Object.keys(MODULE_COLORS);


const CAN_MANAGE = {

  admin:
    ALL,

  pastor:
    [
      ...PREACHING,
      "other"
    ],

  "childrens-lead":
    ["childrens"],

  "ufy-lead":
    ["ufy"],

  "ufw-lead":
    ["ufw"],

  "ufm-lead":
    ["ufm"],

  "production-lead":
    ["production"],

  "creatives-lead":
    ["creatives"]

};


const myModules = () =>
  CAN_MANAGE[
    window.currentRole
  ] || [];


/* ==========================================================
   HELPERS
   ========================================================== */

const esc = value =>
  String(value ?? "")
    .replace(
      /[&<>\"']/g,
      char =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "\"": "&quot;",
          "'": "&#39;"
        }[char])
    );


const pad = number =>
  String(number)
    .padStart(2, "0");


const iso = (
  year,
  month,
  day
) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;


const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];


/* ==========================================================
   NAME SETUP
   ========================================================== */

const profileOverlay =
  document.getElementById(
    "profile-setup-overlay"
  );

const profileForm =
  document.getElementById(
    "profile-setup-form"
  );

const profileName =
  document.getElementById(
    "profile-setup-name"
  );

const profileError =
  document.getElementById(
    "profile-setup-error"
  );

const profileButton =
  document.getElementById(
    "profile-setup-btn"
  );


function showProfileSetup() {

  if (!profileOverlay) return;

  profileError.hidden =
    true;

  profileOverlay.hidden =
    false;

  document.body.style.overflow =
    "hidden";

  setTimeout(
    () => profileName?.focus(),
    100
  );

}


function hideProfileSetup() {

  if (!profileOverlay) return;

  profileOverlay.hidden =
    true;

  document.body.style.overflow =
    "";

}


async function checkProfileSetup() {

  await auth.authStateReady();


  const user =
    auth.currentUser;


  if (!user) {
    return;
  }


  let needsName =
    sessionStorage.getItem(
      "bcfc-needs-name"
    ) === "1";


  /*
    Also check Firestore.

    This makes the name prompt appear even
    if the browser session flag disappeared.
  */

  try {

    const userDoc =
      await getDoc(
        doc(
          db,
          "users",
          user.uid
        )
      );


    if (
      userDoc.exists() &&
      !(userDoc.data().name || "").trim()
    ) {

      needsName = true;

    }

  } catch (err) {

    console.warn(
      "Could not check profile name:",
      err
    );

  }


  if (needsName) {

    sessionStorage.setItem(
      "bcfc-needs-name",
      "1"
    );

    showProfileSetup();

  }

}


profileForm?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    profileError.hidden =
      true;


    const name =
      profileName.value
        .trim();


    if (!name) {

      profileError.textContent =
        "Please enter your full name.";

      profileError.hidden =
        false;

      profileName.focus();

      return;

    }


    if (name.length < 2) {

      profileError.textContent =
        "Please enter your full name.";

      profileError.hidden =
        false;

      profileName.focus();

      return;

    }


    if (!auth.currentUser) {

      profileError.textContent =
        "Your login session has expired. Please log in again.";

      profileError.hidden =
        false;

      return;

    }


    profileButton.disabled =
      true;

    profileButton.textContent =
      "Saving...";


    try {

      await updateDoc(
        doc(
          db,
          "users",
          auth.currentUser.uid
        ),
        {
          name
        }
      );


      sessionStorage.setItem(
        "bcfc-name",
        name
      );


      sessionStorage.removeItem(
        "bcfc-needs-name"
      );


      /*
        Reload so the shared portal header,
        navigation and every dashboard component
        receive the completed profile.
      */

      window.location.reload();


    } catch (err) {

      console.error(
        "Could not save name:",
        err
      );


      profileError.textContent =
        `Could not save your name (${err.code || "unknown error"}). Please try again.`;

      profileError.hidden =
        false;


      profileButton.disabled =
        false;

      profileButton.textContent =
        "Continue";

    }

  }
);


/* ==========================================================
   CALENDAR DATA
   ========================================================== */

const today =
  new Date();


let events = [];


let viewYear =
  today.getFullYear();


let viewMonth =
  today.getMonth();


let selectedDate =
  iso(
    viewYear,
    viewMonth,
    today.getDate()
  );


const grid =
  document.getElementById(
    "calendar-grid"
  );

const monthLabel =
  document.getElementById(
    "month-label"
  );

const panelTitle =
  document.getElementById(
    "day-panel-title"
  );

const panelList =
  document.getElementById(
    "day-panel-list"
  );

const addBtn =
  document.getElementById(
    "add-event-btn"
  );

const dialog =
  document.getElementById(
    "event-dialog"
  );

const form =
  document.getElementById(
    "event-form"
  );

const errBox =
  document.getElementById(
    "event-error"
  );

const modSel =
  document.getElementById(
    "evt-module"
  );

const preacherRow =
  document.getElementById(
    "preacher-row"
  );


const eventsOn =
  date =>
    events
      .filter(
        event =>
          event.date === date
      )
      .sort(
        (a, b) =>
          (a.time || "")
            .localeCompare(
              b.time || ""
            )
      );


/* ==========================================================
   RENDER CALENDAR
   ========================================================== */

function renderCalendar() {

  monthLabel.textContent =
    `${MONTH_NAMES[viewMonth]} ${viewYear}`;


  grid.innerHTML =
    "";


  const startWeekday =
    new Date(
      viewYear,
      viewMonth,
      1
    ).getDay();


  const daysInMonth =
    new Date(
      viewYear,
      viewMonth + 1,
      0
    ).getDate();


  const totalCells =
    Math.ceil(
      (
        startWeekday +
        daysInMonth
      ) / 7
    ) * 7;


  const todayStr =
    iso(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );


  for (
    let i = 0;
    i < totalCells;
    i++
  ) {

    const cellDate =
      new Date(
        viewYear,
        viewMonth,
        i - startWeekday + 1
      );


    const other =
      cellDate.getMonth() !==
      viewMonth;


    const dateStr =
      iso(
        cellDate.getFullYear(),
        cellDate.getMonth(),
        cellDate.getDate()
      );


    const dots =
      eventsOn(dateStr)
        .map(
          event => {

            const module =
              MODULE_COLORS[
                event.module
              ] ||
              MODULE_COLORS.other;


            return `
              <i
                class="dot ${module.dot}">
              </i>
            `;

          }
        )
        .join("");


    const cell =
      document.createElement(
        "button"
      );


    cell.type =
      "button";


    cell.className =
      "day-cell" +
      (
        other
          ? " other-month"
          : ""
      ) +
      (
        dateStr === todayStr
          ? " today"
          : ""
      ) +
      (
        dateStr === selectedDate
          ? " selected"
          : ""
      );


    cell.innerHTML = `
      <span class="day-num">
        ${cellDate.getDate()}
      </span>

      <span class="day-dots">
        ${dots}
      </span>
    `;


    cell.addEventListener(
      "click",
      () => {

        selectedDate =
          dateStr;

        refresh();

      }
    );


    grid.appendChild(
      cell
    );

  }

}


/* ==========================================================
   RENDER DAY PANEL
   ========================================================== */

function renderPanel() {

  const date =
    new Date(
      selectedDate +
      "T00:00:00"
    );


  panelTitle.textContent =
    date.toLocaleDateString(
      undefined,
      {
        weekday: "long",
        month: "long",
        day: "numeric"
      }
    );


  const list =
    eventsOn(
      selectedDate
    );


  const manage =
    myModules();


  panelList.innerHTML =
    list.length

      ? list
          .map(
            event => {

              const module =
                MODULE_COLORS[
                  event.module
                ] ||
                MODULE_COLORS.other;


              const meta = [
                event.kind,
                event.time,
                event.assignee,
                event.preacher &&
                  `Preacher: ${event.preacher}`
              ]
                .filter(Boolean)
                .map(esc)
                .join(" · ");


              return `
                <li>

                  <span class="evt-title">
                    ${esc(event.title)}
                  </span>

                  <span class="evt-module">
                    ${esc(module.label)}
                  </span>

                  ${
                    meta
                      ? `
                        <span class="evt-meta">
                          ${meta}
                        </span>
                      `
                      : ""
                  }

                  ${
                    event.notes
                      ? `
                        <span class="evt-meta">
                          ${esc(event.notes)}
                        </span>
                      `
                      : ""
                  }

                  ${
                    manage.includes(
                      event.module
                    )
                      ? `
                        <button
                          class="evt-del"
                          data-id="${esc(event.id)}"
                          aria-label="Delete activity">
                          &times;
                        </button>
                      `
                      : ""
                  }

                </li>
              `;

            }
          )
          .join("")

      : `
          <li
            class="day-panel-empty"
            style="border:0;background:none;padding:0">
            No activities scheduled.
          </li>
        `;


  addBtn.hidden =
    manage.length === 0;

}


/* ==========================================================
   REFRESH
   ========================================================== */

function refresh() {

  renderCalendar();

  renderPanel();

}


window.addEventListener(
  "rolechange",
  refresh
);


/* ==========================================================
   FIRESTORE EVENTS
   ========================================================== */

auth.authStateReady()
  .then(
    async () => {

      /*
        Check the Google signup name requirement.
      */

      await checkProfileSetup();


      /*
        Load events.
      */

      onSnapshot(
        collection(
          db,
          "events"
        ),

        snap => {

          events =
            snap.docs.map(
              d => ({
                id: d.id,
                ...d.data()
              })
            );

          refresh();

        },

        err => {

          console.error(err);


          panelList.innerHTML = `
            <li
              class="day-panel-empty"
              style="border:0;background:none;padding:0">

              Couldn't load events
              (${esc(
                err.code ||
                err.message
              )}).

            </li>
          `;

        }
      );

    }
  );


/* ==========================================================
   MONTH NAVIGATION
   ========================================================== */

document
  .getElementById(
    "prev-month"
  )
  .addEventListener(
    "click",
    () => {

      viewMonth--;

      if (viewMonth < 0) {

        viewMonth = 11;

        viewYear--;

      }

      renderCalendar();

    }
  );


document
  .getElementById(
    "next-month"
  )
  .addEventListener(
    "click",
    () => {

      viewMonth++;


      if (viewMonth > 11) {

        viewMonth = 0;

        viewYear++;

      }


      renderCalendar();

    }
  );


document
  .getElementById(
    "today-btn"
  )
  .addEventListener(
    "click",
    () => {

      viewYear =
        today.getFullYear();

      viewMonth =
        today.getMonth();

      selectedDate =
        iso(
          viewYear,
          viewMonth,
          today.getDate()
        );

      refresh();

    }
  );


/* ==========================================================
   DELETE EVENT
   ========================================================== */

panelList.addEventListener(
  "click",
  async e => {

    const button =
      e.target.closest(
        ".evt-del"
      );


    if (
      !button ||
      !confirm(
        "Delete this activity?"
      )
    ) {

      return;

    }


    try {

      await deleteDoc(
        doc(
          db,
          "events",
          button.dataset.id
        )
      );

    } catch (err) {

      console.error(err);

      alert(
        "You don't have permission to delete that."
      );

    }

  }
);


/* ==========================================================
   PREACHER LIST
   ========================================================== */

async function loadPreachers() {

  try {

    const snap =
      await getDocs(
        query(
          collection(db, "users"),
          where(
            "role",
            "in",
            [
              "preaching",
              "pastor"
            ]
          )
        )
      );


    document
      .getElementById(
        "preacher-list"
      )
      .innerHTML =
        snap.docs
          .map(
            d =>
              `<option value="${esc(
                d.data().name || ""
              )}">`
          )
          .join("");


  } catch (err) {

    console.warn(
      "Preacher list unavailable:",
      err.code
    );

  }

}


/* ==========================================================
   ADD ACTIVITY
   ========================================================== */

addBtn.addEventListener(
  "click",
  () => {

    form.reset();

    errBox.hidden =
      true;


    modSel.innerHTML =
      myModules()
        .map(
          key =>
            `
              <option
                value="${key}">
                ${esc(
                  MODULE_COLORS[key].label
                )}
              </option>
            `
        )
        .join("");


    document
      .getElementById(
        "evt-date"
      )
      .value =
        selectedDate;


    preacherRow.hidden =
      !PREACHING.includes(
        modSel.value
      );


    loadPreachers();


    dialog.showModal();

  }
);


modSel.addEventListener(
  "change",
  () => {

    preacherRow.hidden =
      !PREACHING.includes(
        modSel.value
      );

  }
);


document
  .getElementById(
    "evt-cancel"
  )
  .addEventListener(
    "click",
    () => {

      dialog.close();

    }
  );


/* ==========================================================
   SAVE ACTIVITY
   ========================================================== */

form.addEventListener(
  "submit",
  async e => {

    e.preventDefault();


    const module =
      modSel.value;


    if (
      !myModules()
        .includes(module)
    ) {

      errBox.textContent =
        "You can't add that type of activity.";

      errBox.hidden =
        false;

      return;

    }


    const saveBtn =
      document.getElementById(
        "evt-save"
      );


    saveBtn.disabled =
      true;


    try {

      await addDoc(
        collection(
          db,
          "events"
        ),
        {

          title:
            document
              .getElementById(
                "evt-title"
              )
              .value
              .trim(),

          module,

          date:
            document
              .getElementById(
                "evt-date"
              )
              .value,

          time:
            document
              .getElementById(
                "evt-time"
              )
              .value,

          preacher:
            PREACHING.includes(module)
              ? document
                  .getElementById(
                    "evt-preacher"
                  )
                  .value
                  .trim()
              : "",

          notes:
            document
              .getElementById(
                "evt-notes"
              )
              .value
              .trim(),

          createdBy:
            auth.currentUser?.uid ||
            "",

          createdByName:
            sessionStorage.getItem(
              "bcfc-name"
            ) || "",

          createdAt:
            serverTimestamp()

        }
      );


      selectedDate =
        document
          .getElementById(
            "evt-date"
          )
          .value;


      const [
        year,
        month
      ] =
        selectedDate
          .split("-")
          .map(Number);


      viewYear =
        year;

      viewMonth =
        month - 1;


      dialog.close();


    } catch (err) {

      console.error(err);


      errBox.textContent =
        `Couldn't save (${err.code || err.message}). You may not have permission, or the connection failed.`;

      errBox.hidden =
        false;

    }


    saveBtn.disabled =
      false;

  }
);


/* Initial render */

refresh();