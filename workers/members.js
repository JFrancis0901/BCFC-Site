/* ==========================================================
   members.js

   Admin-only page showing everyone who created an account.
   ========================================================== */

import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

import {
  db
} from "./firebase-config.js";


/* ----------------------------------------------------------
   ROLE NAMES
   ---------------------------------------------------------- */

const NAMES = {

  admin: 'Admin',

  pastor: 'Pastor',

  preaching: 'Preaching Staff',

  'childrens-lead':
    "Children's Church Lead",

  childrens:
    "Children's Church Worker",

  'ufy-lead':
    'UFY Lead',

  ufy:
    'UFY Worker',

  'ufw-lead':
    'UFW Lead',

  ufw:
    'UFW Worker',

  'ufm-lead':
    'UFM Lead',

  ufm:
    'UFM Worker',

  'production-lead':
    'Production Lead',

  production:
    'Production Worker',

  'creatives-lead':
    'Creatives Lead',

  creatives:
    'Creatives Worker',

  guest:
    'Guest'

};


/* ----------------------------------------------------------
   ELEMENTS
   ---------------------------------------------------------- */

const list =
  document.getElementById(
    'members-list'
  );

const errorBox =
  document.getElementById(
    'members-error'
  );


/* ----------------------------------------------------------
   ESCAPE HTML
   ---------------------------------------------------------- */

function esc(value) {

  return String(value ?? '')
    .replace(
      /[&<>"']/g,
      c =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[c])
    );

}


/* ----------------------------------------------------------
   FORMAT DATE
   ---------------------------------------------------------- */

function formatDate(timestamp) {

  if (!timestamp) {
    return '—';
  }


  let date;


  if (
    typeof timestamp.toDate === 'function'
  ) {

    date =
      timestamp.toDate();

  } else {

    date =
      new Date(timestamp);

  }


  if (Number.isNaN(date.getTime())) {
    return '—';
  }


  return date.toLocaleString(
    undefined,
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }
  );

}


/* ----------------------------------------------------------
   LOAD MEMBERS
   ---------------------------------------------------------- */

async function loadMembers() {

  try {

    const membersQuery =
      query(
        collection(db, 'users'),
        orderBy(
          'createdAt',
          'desc'
        )
      );


    const snapshot =
      await getDocs(
        membersQuery
      );


    if (snapshot.empty) {

      list.innerHTML = `
        <tr>
          <td
            colspan="4"
            class="members-empty">

            No members found.

          </td>
        </tr>
      `;

      return;

    }


    list.innerHTML =
      snapshot.docs
        .map(memberDoc => {

          const member =
            memberDoc.data();


          const role =
            member.role || 'guest';


          return `
            <tr>

              <td>
                ${esc(
                  member.name || '—'
                )}
              </td>

              <td>
                ${esc(
                  member.email || '—'
                )}
              </td>

              <td>

                <span class="role-badge">
                  ${esc(
                    NAMES[role] || role
                  )}
                </span>

              </td>

              <td>
                ${esc(
                  formatDate(
                    member.createdAt
                  )
                )}
              </td>

            </tr>
          `;

        })
        .join('');


  } catch (err) {

    console.error(err);

    list.innerHTML = `
      <tr>

        <td
          colspan="4"
          class="members-empty">

          Unable to load members.

        </td>

      </tr>
    `;


    errorBox.textContent =
      `Couldn't load members. ${
        err.code ||
        err.message
      }`;

    errorBox.hidden = false;

  }

}


/* ----------------------------------------------------------
   START
   ---------------------------------------------------------- */

loadMembers();