/* ==========================================================
   CALENDAR.JS
   ========================================================== */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDocs,
  query,
  where,
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

  sunday:{
    label:"Sunday Service",
    dot:"dot-sunday"
  },

  nurture:{
    label:"Family Nurture",
    dot:"dot-nurture"
  },

  prayer:{
    label:"Abound in Prayer",
    dot:"dot-prayer"
  },

  childrens:{
    label:"Children's Church",
    dot:"dot-childrens"
  },

  ufy:{
    label:"UFY",
    dot:"dot-ufy"
  },

  ufw:{
    label:"UFW",
    dot:"dot-ufw"
  },

  ufm:{
    label:"UFM",
    dot:"dot-ufm"
  },

  production:{
    label:"Production",
    dot:"dot-production"
  },

  creatives:{
    label:"Creatives",
    dot:"dot-creatives"
  },

  other:{
    label:"Other",
    dot:"dot-other"
  }

};


/* ==========================================================
   TEAM GROUPS
   ========================================================== */

const TEAM_GROUPS = {

  admin:{
    label:"Admin",
    className:"team-admin"
  },

  pastor:{
    label:"Pastor",
    className:"team-pastor"
  },

  preaching:{
    label:"Preaching",
    className:"team-preaching"
  },

  childrens:{
    label:"Children's",
    className:"team-childrens"
  },

  ufy:{
    label:"UFY",
    className:"team-ufy"
  },

  ufw:{
    label:"UFW",
    className:"team-ufw"
  },

  ufm:{
    label:"UFM",
    className:"team-ufm"
  },

  production:{
    label:"Production",
    className:"team-production"
  },

  creatives:{
    label:"Creatives",
    className:"team-creatives"
  },

  other:{
    label:"Other",
    className:"team-other"
  }

};


/* ==========================================================
   PREACHING
   ========================================================== */

const PREACHING = [
  "sunday",
  "nurture",
  "prayer"
];


/* ==========================================================
   MANAGE PERMISSIONS
   ========================================================== */

const ALL =
  Object.keys(MODULE_COLORS);

const CAN_MANAGE = {

  admin:ALL,

  pastor:[
    ...PREACHING,
    "other"
  ],

  "childrens-lead":[
    "childrens"
  ],

  "ufy-lead":[
    "ufy"
  ],

  "ufw-lead":[
    "ufw"
  ],

  "ufm-lead":[
    "ufm"
  ],

  "production-lead":[
    "production"
  ],

  "creatives-lead":[
    "creatives"
  ]

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
      /[&<>"']/g,
      character =>
        ({
          "&":"&amp;",
          "<":"&lt;",
          ">":"&gt;",
          '"':"&quot;",
          "'":"&#39;"
        }[character])
    );

const pad = number =>
  String(number).padStart(2,"0");

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


function formatTime(time){

  if(!time){
    return "";
  }

  const parts =
    time.split(":");

  if(parts.length < 2){
    return time;
  }

  let hour =
    Number(parts[0]);

  const minute =
    parts[1];

  const suffix =
    hour >= 12
      ? "PM"
      : "AM";

  hour =
    hour % 12 || 12;

  return `${hour}:${minute} ${suffix}`;
}


function formatTimeRange(
  start,
  end
){

  if(start && end){
    return `${formatTime(start)} – ${formatTime(end)}`;
  }

  if(start){
    return formatTime(start);
  }

  if(end){
    return `Ends ${formatTime(end)}`;
  }

  return "";
}


/* ==========================================================
   STATE
   ========================================================== */

const today =
  new Date();

let events = [];

let userRoles = {};

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

/*
  null = adding a new activity
  ID = editing an existing activity
*/
let editingEventId = null;

let currentTeamPopup = null;


/* ==========================================================
   ELEMENTS
   ========================================================== */

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

const summaryGrid =
  document.getElementById(
    "activity-summary-grid"
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

const titleInput =
  document.getElementById(
    "evt-title"
  );

const dateInput =
  document.getElementById(
    "evt-date"
  );

const timeInput =
  document.getElementById(
    "evt-time"
  );

const endTimeInput =
  document.getElementById(
    "evt-end-time"
  );

const placeInput =
  document.getElementById(
    "evt-place"
  );

const preacherInput =
  document.getElementById(
    "evt-preacher"
  );

const notesInput =
  document.getElementById(
    "evt-notes"
  );

const saveButton =
  document.getElementById(
    "evt-save"
  );


/* ==========================================================
   POPUPS
   ========================================================== */

const teamDialog =
  document.getElementById(
    "team-activities-dialog"
  );

const teamPopupIcon =
  document.getElementById(
    "team-popup-icon"
  );

const teamPopupTitle =
  document.getElementById(
    "team-popup-title"
  );

const teamPopupCount =
  document.getElementById(
    "team-popup-count"
  );

const teamPopupList =
  document.getElementById(
    "team-popup-list"
  );

const teamPopupClose =
  document.getElementById(
    "team-popup-close"
  );


const notifyDialog =
  document.getElementById(
    "calendar-notify-dialog"
  );

const notifyIcon =
  document.getElementById(
    "calendar-notify-icon"
  );

const notifyTitle =
  document.getElementById(
    "calendar-notify-title"
  );

const notifyText =
  document.getElementById(
    "calendar-notify-text"
  );

const notifyCancel =
  document.getElementById(
    "calendar-notify-cancel"
  );

const notifyOk =
  document.getElementById(
    "calendar-notify-ok"
  );

let notifyResolver = null;


/* ==========================================================
   BCFC NOTIFICATION POPUP
   ========================================================== */

function showCalendarPopup({

  title="BCFC",

  text="",

  okText="OK",

  cancelText="Cancel",

  confirm=false,

  type="info"

} = {}){

  notifyTitle.textContent =
    title;

  notifyText.textContent =
    text;

  notifyOk.textContent =
    okText;

  notifyCancel.textContent =
    cancelText;

  notifyCancel.hidden =
    !confirm;


  if(type === "danger"){

    notifyIcon.textContent =
      "!";

    notifyIcon.style.background =
      "#fdeaea";

    notifyIcon.style.color =
      "#c62828";

    notifyOk.style.background =
      "#c62828";

    notifyOk.style.borderColor =
      "#c62828";

  }else if(type === "success"){

    notifyIcon.textContent =
      "✓";

    notifyIcon.style.background =
      "#eaf7ef";

    notifyIcon.style.color =
      "#25854b";

    notifyOk.style.background =
      "#101a3d";

    notifyOk.style.borderColor =
      "#101a3d";

  }else{

    notifyIcon.textContent =
      "i";

    notifyIcon.style.background =
      "#e8efff";

    notifyIcon.style.color =
      "#1c5fd4";

    notifyOk.style.background =
      "#101a3d";

    notifyOk.style.borderColor =
      "#101a3d";

  }


  if(notifyDialog.open){
    notifyDialog.close();
  }

  notifyDialog.showModal();


  return new Promise(resolve => {

    notifyResolver =
      resolve;

  });

}


function closeCalendarPopup(result){

  if(notifyDialog.open){
    notifyDialog.close();
  }


  if(notifyResolver){

    const resolve =
      notifyResolver;

    notifyResolver =
      null;

    resolve(result);

  }

}


notifyOk.addEventListener(
  "click",
  () => closeCalendarPopup(true)
);

notifyCancel.addEventListener(
  "click",
  () => closeCalendarPopup(false)
);

notifyDialog.addEventListener(
  "click",
  event => {

    if(
      event.target ===
      notifyDialog &&
      notifyCancel.hidden
    ){

      closeCalendarPopup(true);

    }

  }
);


/* ==========================================================
   USER ROLES
   ========================================================== */

async function loadUserRoles(){

  try{

    const snapshot =
      await getDocs(
        collection(
          db,
          "users"
        )
      );

    userRoles = {};

    snapshot.docs.forEach(
      userDoc => {

        const data =
          userDoc.data();

        userRoles[
          userDoc.id
        ] =
          data.role || "";

      }
    );

  }catch(error){

    console.warn(
      "Could not load user roles:",
      error.code ||
      error.message
    );

  }

}


/* ==========================================================
   NORMALIZE ROLE
   ========================================================== */

function normalizeRole(role){

  if(!role){
    return "other";
  }

  if(role === "admin"){
    return "admin";
  }

  if(role === "pastor"){
    return "pastor";
  }

  if(role === "preaching"){
    return "preaching";
  }

  if(
    role === "childrens" ||
    role === "childrens-lead"
  ){
    return "childrens";
  }

  if(
    role === "ufy" ||
    role === "ufy-lead"
  ){
    return "ufy";
  }

  if(
    role === "ufw" ||
    role === "ufw-lead"
  ){
    return "ufw";
  }

  if(
    role === "ufm" ||
    role === "ufm-lead"
  ){
    return "ufm";
  }

  if(
    role === "production" ||
    role === "production-lead"
  ){
    return "production";
  }

  if(
    role === "creatives" ||
    role === "creatives-lead"
  ){
    return "creatives";
  }

  return "other";
}


function eventTeam(event){

  let role =
    event.createdByRole ||
    "";


  if(
    !role &&
    event.createdBy &&
    userRoles[
      event.createdBy
    ]
  ){

    role =
      userRoles[
        event.createdBy
      ];

  }


  return normalizeRole(
    role
  );

}


/* ==========================================================
   EVENT ACCESS
   ========================================================== */

function canManageEvent(event){

  return myModules().includes(
    event.module
  );

}


/* ==========================================================
   EVENTS BY DATE
   ========================================================== */

function eventsOn(date){

  return events

    .filter(
      event =>
        event.date === date
    )

    .sort(
      (a,b) =>
        (
          a.time || ""
        ).localeCompare(
          b.time || ""
        )
    );

}


/* ==========================================================
   CALENDAR
   ========================================================== */

function renderCalendar(){

  monthLabel.textContent =
    `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  grid.innerHTML = "";


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


  for(
    let i = 0;
    i < totalCells;
    i++
  ){

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
        .map(event => {

          const module =
            MODULE_COLORS[
              event.module
            ] ||
            MODULE_COLORS.other;

          return `
            <i
              class="dot ${module.dot}"
            ></i>
          `;

        })
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


    grid.appendChild(cell);

  }

}


/* ==========================================================
   SELECTED DAY
   ========================================================== */

function renderPanel(){

  const date =
    new Date(
      selectedDate +
      "T00:00:00"
    );


  panelTitle.textContent =
    date.toLocaleDateString(
      undefined,
      {
        weekday:"long",
        month:"long",
        day:"numeric"
      }
    );


  const list =
    eventsOn(
      selectedDate
    );


  if(!list.length){

    panelList.innerHTML = `
      <li
        class="day-panel-empty"
        style="
          border:0;
          background:none;
          padding:0
        "
      >
        No activities scheduled.
      </li>
    `;

  }else{

    panelList.innerHTML =
      list
        .map(event => {

          const module =
            MODULE_COLORS[
              event.module
            ] ||
            MODULE_COLORS.other;


          const time =
            formatTimeRange(
              event.time,
              event.endTime
            );


          const manageable =
            canManageEvent(
              event
            );


          return `
            <li>

              <span class="evt-title">
                ${esc(
                  event.title
                )}
              </span>

              <span class="evt-module">
                ${esc(
                  module.label
                )}
              </span>


              ${
                time
                  ? `
                    <span class="evt-meta">
                      🕐 ${esc(time)}
                    </span>
                  `
                  : ""
              }


              ${
                event.place
                  ? `
                    <span class="evt-meta">
                      📍 ${esc(
                        event.place
                      )}
                    </span>
                  `
                  : ""
              }


              ${
                event.preacher
                  ? `
                    <span class="evt-meta">
                      Preacher:
                      ${esc(
                        event.preacher
                      )}
                    </span>
                  `
                  : ""
              }


              ${
                event.createdByName
                  ? `
                    <span class="evt-meta">
                      Added by:
                      ${esc(
                        event.createdByName
                      )}
                    </span>
                  `
                  : ""
              }


              ${
                event.notes
                  ? `
                    <span class="evt-meta">
                      ${esc(
                        event.notes
                      )}
                    </span>
                  `
                  : ""
              }


              ${
                manageable
                  ? `
                    <div class="evt-actions">

                      <button
                        type="button"
                        class="evt-edit"
                        data-id="${esc(
                          event.id
                        )}"
                        aria-label="Edit activity"
                        title="Edit activity"
                      >
                        ✎
                      </button>

                      <button
                        type="button"
                        class="evt-del"
                        data-id="${esc(
                          event.id
                        )}"
                        aria-label="Delete activity"
                        title="Delete activity"
                      >
                        ×
                      </button>

                    </div>
                  `
                  : ""
              }

            </li>
          `;

        })
        .join("");

  }


  addBtn.hidden =
    myModules().length === 0;

}


/* ==========================================================
   ACTIVITY SUMMARY
   ========================================================== */

function getTeamEvents(team){

  return events
    .filter(
      event =>
        eventTeam(event) === team
    )
    .sort(
      (a,b) => {

        const dateCompare =
          (
            b.date || ""
          ).localeCompare(
            a.date || ""
          );


        if(
          dateCompare !== 0
        ){
          return dateCompare;
        }


        return (
          b.time || ""
        ).localeCompare(
          a.time || ""
        );

      }
    );

}


function renderActivitySummary(){

  summaryGrid.innerHTML =
    Object.keys(
      TEAM_GROUPS
    )
      .map(team => {

        const group =
          TEAM_GROUPS[team];

        const count =
          getTeamEvents(
            team
          ).length;


        return `
          <button
            type="button"
            class="team-summary-box ${
              group.className
            }"
            data-team="${esc(team)}"
          >

            <div class="team-summary-top">

              <span
                class="team-summary-dot"
              ></span>

              <span
                class="team-summary-name"
              >
                ${esc(
                  group.label
                )}
              </span>

            </div>


            <div class="team-summary-count">
              ${count}
            </div>


            <div class="team-summary-label">

              ${
                count === 1
                  ? "activity"
                  : "activities"
              }

            </div>

          </button>
        `;

      })
      .join("");

}


/* ==========================================================
   DEPARTMENT POPUP
   ========================================================== */

function openTeamPopup(team){

  const group =
    TEAM_GROUPS[
      team
    ];


  if(!group){
    return;
  }


  currentTeamPopup =
    team;


  const teamEvents =
    getTeamEvents(
      team
    );


  teamPopupTitle.textContent =
    group.label;


  teamPopupCount.textContent =
    `${teamEvents.length} ${
      teamEvents.length === 1
        ? "activity"
        : "activities"
    }`;


  teamPopupIcon.textContent =
    group.label
      .slice(0,1)
      .toUpperCase();


  if(!teamEvents.length){

    teamPopupList.innerHTML = `
      <div class="popup-empty">
        No activities have been added by
        ${esc(group.label)} yet.
      </div>
    `;

  }else{

    teamPopupList.innerHTML =
      teamEvents
        .map(event => {

          const module =
            MODULE_COLORS[
              event.module
            ] ||
            MODULE_COLORS.other;


          const date =
            new Date(
              event.date +
              "T00:00:00"
            );


          const dateLabel =
            date.toLocaleDateString(
              undefined,
              {
                weekday:"long",
                month:"long",
                day:"numeric",
                year:"numeric"
              }
            );


          const time =
            formatTimeRange(
              event.time,
              event.endTime
            );


          const manageable =
            canManageEvent(
              event
            );


          return `
            <article
              class="popup-activity"
            >

              <div
                class="popup-activity-title"
              >
                ${esc(
                  event.title
                )}
              </div>


              <span
                class="popup-activity-category"
              >
                ${esc(
                  module.label
                )}
              </span>


              <div
                class="popup-activity-details"
              >

                <span>
                  📅 ${esc(
                    dateLabel
                  )}
                </span>


                ${
                  time
                    ? `
                      <span>
                        🕐 ${esc(time)}
                      </span>
                    `
                    : ""
                }


                ${
                  event.place
                    ? `
                      <span>
                        📍 ${esc(
                          event.place
                        )}
                      </span>
                    `
                    : ""
                }


                ${
                  event.preacher
                    ? `
                      <span>
                        🎤 Preacher:
                        ${esc(
                          event.preacher
                        )}
                      </span>
                    `
                    : ""
                }


                ${
                  event.notes
                    ? `
                      <span>
                        📝 ${esc(
                          event.notes
                        )}
                      </span>
                    `
                    : ""
                }

              </div>


              <div
                class="popup-added-by"
              >

                Added by:
                <strong>
                  ${esc(
                    event.createdByName ||
                    "Worker"
                  )}
                </strong>

              </div>


              ${
                manageable
                  ? `
                    <div
                      class="popup-activity-actions"
                    >

                      <button
                        type="button"
                        class="popup-edit-button"
                        data-id="${esc(
                          event.id
                        )}"
                      >
                        ✎ Edit Activity
                      </button>

                    </div>
                  `
                  : ""
              }

            </article>
          `;

        })
        .join("");

  }


  if(!teamDialog.open){
    teamDialog.showModal();
  }

}


/* ==========================================================
   OPEN EDIT FORM
   ========================================================== */

async function openEditDialog(eventId){

  const activity =
    events.find(
      event =>
        event.id ===
        eventId
    );


  if(!activity){
    return;
  }


  if(
    !canManageEvent(
      activity
    )
  ){

    await showCalendarPopup({

      title:
        "No permission",

      text:
        "You don't have permission to edit this activity.",

      okText:
        "OK",

      type:
        "danger"

    });

    return;

  }


  editingEventId =
    eventId;


  form.reset();

  errBox.hidden =
    true;


  /*
    The edit form can use the same
    category list as Add Activity.
  */

  modSel.innerHTML =
    myModules()
      .map(
        module => `
          <option
            value="${esc(
              module
            )}"
          >
            ${esc(
              MODULE_COLORS[
                module
              ].label
            )}
          </option>
        `
      )
      .join("");


  titleInput.value =
    activity.title ||
    "";


  modSel.value =
    activity.module;


  dateInput.value =
    activity.date ||
    "";


  timeInput.value =
    activity.time ||
    "";


  endTimeInput.value =
    activity.endTime ||
    "";


  placeInput.value =
    activity.place ||
    "";


  preacherInput.value =
    activity.preacher ||
    "";


  notesInput.value =
    activity.notes ||
    "";


  preacherRow.hidden =
    !PREACHING.includes(
      activity.module
    );


  saveButton.textContent =
    "Save Changes";


  dialog.querySelector(
    "h2"
  ).textContent =
    "Edit Activity";


  if(teamDialog.open){
    teamDialog.close();
  }


  loadPreachers();

  dialog.showModal();

}


/* ==========================================================
   SUMMARY CLICK
   ========================================================== */

summaryGrid.addEventListener(
  "click",
  event => {

    const box =
      event.target.closest(
        ".team-summary-box"
      );


    if(!box){
      return;
    }


    openTeamPopup(
      box.dataset.team
    );

  }
);


/* ==========================================================
   TEAM POPUP EDIT
   ========================================================== */

teamPopupList.addEventListener(
  "click",
  async event => {

    const editButton =
      event.target.closest(
        ".popup-edit-button"
      );


    if(!editButton){
      return;
    }


    await openEditDialog(
      editButton.dataset.id
    );

  }
);


/* ==========================================================
   SELECTED DAY EDIT
   ========================================================== */

panelList.addEventListener(
  "click",
  async event => {

    const editButton =
      event.target.closest(
        ".evt-edit"
      );


    if(editButton){

      await openEditDialog(
        editButton.dataset.id
      );

      return;

    }

  }
);


/* ==========================================================
   DELETE ACTIVITY
   ========================================================== */

panelList.addEventListener(
  "click",
  async event => {

    const button =
      event.target.closest(
        ".evt-del"
      );


    if(!button){
      return;
    }


    const confirmed =
      await showCalendarPopup({

        title:
          "Delete activity?",

        text:
          "This activity will be permanently deleted.",

        okText:
          "Delete",

        cancelText:
          "Cancel",

        confirm:
          true,

        type:
          "danger"

      });


    if(!confirmed){
      return;
    }


    try{

      await deleteDoc(
        doc(
          db,
          "events",
          button.dataset.id
        )
      );


      await showCalendarPopup({

        title:
          "Activity deleted",

        text:
          "The activity has been removed from the calendar.",

        okText:
          "OK",

        type:
          "success"

      });


    }catch(error){

      console.error(
        error
      );


      await showCalendarPopup({

        title:
          "Delete failed",

        text:
          error.code ||
          error.message ||
          "You don't have permission to delete that activity.",

        okText:
          "OK",

        type:
          "danger"

      });

    }

  }
);


/* ==========================================================
   PREACHERS
   ========================================================== */

async function loadPreachers(){

  try{

    const snapshot =
      await getDocs(
        query(
          collection(
            db,
            "users"
          ),
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


    document.getElementById(
      "preacher-list"
    ).innerHTML =

      snapshot.docs
        .map(
          userDoc => `
            <option
              value="${esc(
                userDoc.data().name ||
                ""
              )}"
            >
          `
        )
        .join("");


  }catch(error){

    console.warn(
      "Preacher list unavailable:",
      error.code ||
      error.message
    );

  }

}


/* ==========================================================
   RESET FORM TO ADD MODE
   ========================================================== */

function prepareAddForm(){

  editingEventId =
    null;

  form.reset();

  errBox.hidden =
    true;


  modSel.innerHTML =
    myModules()
      .map(
        module => `
          <option
            value="${esc(
              module
            )}"
          >
            ${esc(
              MODULE_COLORS[
                module
              ].label
            )}
          </option>
        `
      )
      .join("");


  dateInput.value =
    selectedDate;


  preacherRow.hidden =
    !PREACHING.includes(
      modSel.value
    );


  saveButton.textContent =
    "Save";


  dialog.querySelector(
    "h2"
  ).textContent =
    "Add Activity";


  loadPreachers();

}


/* ==========================================================
   ADD ACTIVITY BUTTON
   ========================================================== */

addBtn.addEventListener(
  "click",
  () => {

    prepareAddForm();

    dialog.showModal();

  }
);


/* ==========================================================
   MODULE CHANGE
   ========================================================== */

modSel.addEventListener(
  "change",
  () => {

    preacherRow.hidden =
      !PREACHING.includes(
        modSel.value
      );

  }
);


/* ==========================================================
   CANCEL
   ========================================================== */

document
  .getElementById(
    "evt-cancel"
  )
  .addEventListener(
    "click",
    () => {

      editingEventId =
        null;

      dialog.close();

    }
  );


/* ==========================================================
   SAVE / UPDATE ACTIVITY
   ========================================================== */

form.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const module =
      modSel.value;


    if(
      !myModules().includes(
        module
      )
    ){

      await showCalendarPopup({

        title:
          "No permission",

        text:
          "You can't save an activity in that category.",

        okText:
          "OK",

        type:
          "danger"

      });

      return;

    }


    const title =
      titleInput.value.trim();


    const date =
      dateInput.value;


    const startTime =
      timeInput.value;


    const endTime =
      endTimeInput.value;


    const place =
      placeInput.value.trim();


    const preacher =
      preacherInput.value.trim();


    const notes =
      notesInput.value.trim();


    if(
      startTime &&
      endTime &&
      endTime <= startTime
    ){

      await showCalendarPopup({

        title:
          "Invalid time",

        text:
          "End time must be later than start time.",

        okText:
          "OK",

        type:
          "danger"

      });

      return;

    }


    saveButton.disabled =
      true;


    try{

      /* ====================================================
         EDIT EXISTING
         ==================================================== */

      if(editingEventId){

        const existing =
          events.find(
            item =>
              item.id ===
              editingEventId
          );


        if(!existing){

          throw new Error(
            "The activity could not be found."
          );

        }


        await updateDoc(

          doc(
            db,
            "events",
            editingEventId
          ),

          {

            title,

            module,

            date,

            time:startTime,

            endTime,

            place,

            preacher:
              PREACHING.includes(
                module
              )
                ? preacher
                : "",

            notes

          }

        );


        selectedDate =
          date;


        const [
          year,
          month
        ] =
          date
            .split("-")
            .map(Number);


        viewYear =
          year;

        viewMonth =
          month - 1;


        editingEventId =
          null;


        dialog.close();


        refresh();


        if(currentTeamPopup){

          openTeamPopup(
            currentTeamPopup
          );

        }


        await showCalendarPopup({

          title:
            "Activity updated",

          text:
            `"${title}" has been updated successfully.`,

          okText:
            "OK",

          type:
            "success"

        });


      }else{

        /* ================================================
           ADD NEW
           ================================================ */

        await addDoc(

          collection(
            db,
            "events"
          ),

          {

            title,

            module,

            date,

            time:startTime,

            endTime,

            place,

            preacher:
              PREACHING.includes(
                module
              )
                ? preacher
                : "",

            notes,

            createdBy:
              auth.currentUser?.uid ||
              "",

            createdByName:
              sessionStorage.getItem(
                "bcfc-name"
              ) ||
              "Worker",

            createdByRole:
              window.currentRole ||
              "",

            createdAt:
              serverTimestamp()

          }

        );


        selectedDate =
          date;


        const [
          year,
          month
        ] =
          date
            .split("-")
            .map(Number);


        viewYear =
          year;

        viewMonth =
          month - 1;


        dialog.close();


        refresh();


        await showCalendarPopup({

          title:
            "Activity added",

          text:
            `"${title}" has been added to the calendar.`,

          okText:
            "OK",

          type:
            "success"

        });

      }


    }catch(error){

      console.error(
        error
      );


      await showCalendarPopup({

        title:
          editingEventId
            ? "Couldn't update activity"
            : "Couldn't save activity",

        text:
          error.code ||
          error.message ||
          "You may not have permission, or the connection failed.",

        okText:
          "OK",

        type:
          "danger"

      });

    }


    saveButton.disabled =
      false;

  }
);


/* ==========================================================
   NAVIGATION
   ========================================================== */

document
  .getElementById(
    "prev-month"
  )
  .addEventListener(
    "click",
    () => {

      viewMonth--;

      if(viewMonth < 0){

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

      if(viewMonth > 11){

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
   REFRESH
   ========================================================== */

function refresh(){

  renderCalendar();

  renderPanel();

  renderActivitySummary();

}


window.addEventListener(
  "rolechange",
  refresh
);


/* ==========================================================
   FIRESTORE
   ========================================================== */

async function startCalendar(){

  try{

    await auth.authStateReady();

    await loadUserRoles();


    onSnapshot(

      collection(
        db,
        "events"
      ),

      snapshot => {

        events =
          snapshot.docs.map(
            eventDoc => ({
              id:eventDoc.id,
              ...eventDoc.data()
            })
          );


        refresh();


        /*
          If the department popup is already open,
          update its contents automatically.
        */

        if(
          currentTeamPopup &&
          teamDialog.open
        ){

          openTeamPopup(
            currentTeamPopup
          );

        }

      },

      async error => {

        console.error(
          "Events listener:",
          error
        );


        await showCalendarPopup({

          title:
            "Calendar couldn't load",

          text:
            error.code ||
            error.message ||
            "There was a problem loading the activities.",

          okText:
            "OK",

          type:
            "danger"

        });

      }

    );


    refresh();


  }catch(error){

    console.error(
      "Calendar startup error:",
      error
    );


    await showCalendarPopup({

      title:
        "Calendar error",

      text:
        error.code ||
        error.message ||
        "The calendar could not start.",

      okText:
        "OK",

      type:
        "danger"

    });

  }

}


teamDialog.addEventListener(
  "close",
  () => {

    /*
      Keep the last selected team remembered,
      but don't force the popup open again.
    */

  }
);


startCalendar();