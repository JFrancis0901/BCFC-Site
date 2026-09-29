/* ==========================================================
   members.js
   Admin member management
   ========================================================== */

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

import {
  auth,
  db
} from "./firebase-config.js";


const NAMES = {
  admin: 'Admin',
  pastor: 'Pastor',
  preaching: 'Preaching Staff',

  'childrens-lead': "Children's Church Lead",
  childrens: "Children's Church Worker",

  'ufy-lead': 'UFY Lead',
  ufy: 'UFY Worker',

  'ufw-lead': 'UFW Lead',
  ufw: 'UFW Worker',

  'ufm-lead': 'UFM Lead',
  ufm: 'UFM Worker',

  'production-lead': 'Production Lead',
  production: 'Production Worker',

  'creatives-lead': 'Creatives Lead',
  creatives: 'Creatives Worker'
};


const list =
  document.getElementById('members-list');

const errorBox =
  document.getElementById('members-error');


function esc(value) {

  return String(value ?? '')
    .replace(
      /[&<>"']/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c])
    );

}


function formatDate(timestamp) {

  if (!timestamp) return '—';

  let date;

  if (
    typeof timestamp.toDate === 'function'
  ) {
    date = timestamp.toDate();
  } else {
    date = new Date(timestamp);
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


/* ==========================================================
   LOAD MEMBERS
   ========================================================== */

async function loadMembers() {

  try {

    const membersQuery =
      query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );

    const snapshot =
      await getDocs(membersQuery);


    if (snapshot.empty) {

      list.innerHTML = `
        <tr>
          <td
            colspan="5"
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

          const isMe =
            memberDoc.id ===
            auth.currentUser?.uid;


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

              <td>

                ${
                  isMe
                    ? `
                      <span
                        class="cannot-remove">
                        Current account
                      </span>
                    `
                    : `
                      <button
                        type="button"
                        class="remove-member-btn"
                        data-id="${esc(memberDoc.id)}"
                        data-name="${esc(member.name || member.email || 'this member')}">

                        Remove

                      </button>
                    `
                }

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
          colspan="5"
          class="members-empty">

          Unable to load members.

        </td>
      </tr>
    `;

    errorBox.textContent =
      `Couldn't load members. ${
        err.code || err.message
      }`;

    errorBox.hidden = false;
  }

}


/* ==========================================================
   REMOVE MEMBER
   ========================================================== */

list.addEventListener(
  'click',
  async e => {

    const button =
      e.target.closest(
        '.remove-member-btn'
      );

    if (!button) return;


    const uid =
      button.dataset.id;

    const name =
      button.dataset.name;


    const confirmed =
      confirm(
        `Remove ${name} from the BCFC Workers member list?\n\n` +
        `This removes their worker profile and prevents the portal from loading their account.`
      );


    if (!confirmed) return;


    button.disabled = true;

    button.textContent =
      'Removing...';


    try {

      await deleteDoc(
        doc(
          db,
          'users',
          uid
        )
      );


      await loadMembers();


    } catch (err) {

      console.error(err);

      alert(
        `Could not remove the member. ${
          err.code || err.message
        }`
      );

      button.disabled = false;

      button.textContent =
        'Remove';
    }

  }
);


/* ==========================================================
   START
   ========================================================== */

auth.authStateReady().then(() => {

  if (
    window.currentRole !== 'admin'
  ) {
    return;
  }

  loadMembers();

});