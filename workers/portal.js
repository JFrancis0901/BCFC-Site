import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const NAV=[
 ['Calendar','calendar.html','all'],['Announcements','announcements.html','admin,pastor,childrens-lead,ufy-lead,ufw-lead,ufm-lead,production-lead,creatives-lead'],
 ["Children's Church",'dept.html?m=childrens','admin,childrens-lead,childrens'],['UFY','dept.html?m=ufy','admin,ufy-lead,ufy'],['UFW','dept.html?m=ufw','admin,ufw-lead,ufw'],['UFM','dept.html?m=ufm','admin,ufm-lead,ufm'],
 ['Praise & Worship','worship.html','admin,pastor,preaching'],['Production','projects.html?m=production','admin,production-lead,production'],['Creatives','projects.html?m=creatives','admin,creatives-lead,creatives'],['Members','members.html','admin'],['Chat','chat.html','all']
];
const NAMES={admin:'Admin',pastor:'Pastor',preaching:'Preaching Staff','childrens-lead':"Children's Church Lead",childrens:"Children's Church Worker",'ufy-lead':'UFY Lead',ufy:'UFY Worker','ufw-lead':'UFW Lead',ufw:'UFW Worker','ufm-lead':'UFM Lead',ufm:'UFM Worker','production-lead':'Production Lead',production:'Production Worker','creatives-lead':'Creatives Lead',creatives:'Creatives Worker'};
let realRole=sessionStorage.getItem('bcfc-role')||'';
let userName=sessionStorage.getItem('bcfc-name')||'';
let roleStatus=sessionStorage.getItem('bcfc-role-status') || (realRole ? 'approved' : 'pending');
let requestedRole='';
window.realRole=realRole; window.currentRole=''; window.roleStatus=roleStatus; window.isApproved=false; window.roleReady=false;

function leaveToLogin(){['bcfc-role','bcfc-name','bcfc-email','bcfc-role-status','bcfc-view-role','bcfc-test-role'].forEach(k=>sessionStorage.removeItem(k)); location.href='login.html';}
function popup(message,title='Access Pending',type='danger') {
  // Always use an in-page notification. Never use browser alerts/notifications.
  let overlay = document.getElementById('portal-notification');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'portal-notification';
    overlay.className = 'portal-notification';
    overlay.innerHTML = `
      <div class="portal-notification-card" role="dialog" aria-modal="true" aria-labelledby="portal-notification-title">
        <button type="button" class="portal-notification-close" aria-label="Close">&times;</button>
        <div class="portal-notification-icon" id="portal-notification-icon">!</div>
        <h2 id="portal-notification-title"></h2>
        <p id="portal-notification-text"></p>
        <button type="button" class="portal-notification-ok">OK</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => {
      overlay.classList.remove('show');
    };
    overlay.querySelector('.portal-notification-close').addEventListener('click', close);
    overlay.querySelector('.portal-notification-ok').addEventListener('click', close);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });
  }

  const icon = overlay.querySelector('#portal-notification-icon');
  const titleEl = overlay.querySelector('#portal-notification-title');
  const textEl = overlay.querySelector('#portal-notification-text');
  const card = overlay.querySelector('.portal-notification-card');

  icon.textContent = type === 'success' ? '✓' : type === 'info' ? 'i' : '!';
  titleEl.textContent = title;
  textEl.textContent = message;
  card.dataset.type = type;

  requestAnimationFrame(() => overlay.classList.add('show'));
}
function applyUser(data, notify=false){
  const oldApproved=window.isApproved;
  realRole=data.role||''; userName=(data.name||`${data.firstName||''} ${data.lastName||''}`).trim(); roleStatus=data.roleStatus || (data.role ? 'approved' : 'pending'); requestedRole=data.requestedRole||'';
  window.realRole=realRole; window.currentRole=realRole; window.roleStatus=roleStatus; window.isApproved=roleStatus==='approved'&&!!realRole; window.roleReady=true;
  sessionStorage.setItem('bcfc-role',realRole); sessionStorage.setItem('bcfc-name',userName); sessionStorage.setItem('bcfc-role-status',roleStatus);
  refresh();
  if(notify && !oldApproved && window.isApproved) popup('Your role has been confirmed by an administrator. You now have full access to the BCFC Workers system.','Role Approved');
  if(notify && roleStatus==='rejected') popup('Your requested role was not approved by the administrator. Please contact an administrator.','Role Request Update');
}

onAuthStateChanged(auth,async user=>{
  if(!user){leaveToLogin();return;}
  try{
    const ref=doc(db,'users',user.uid); const snap=await getDoc(ref);
    if(!snap.exists()){popup('Your worker profile could not be found. Please contact an administrator.','Account Error'); await signOut(auth); leaveToLogin(); return;}
    applyUser(snap.data(),false);
    onSnapshot(ref,docSnap=>{if(docSnap.exists()) applyUser(docSnap.data(),true);});
  }catch(e){console.error(e); popup(`Could not load your worker profile (${e.code||e.message}).`,'Account Error');}
});

function currentPage(){
  const last = location.pathname.split('/').filter(Boolean).pop() || 'calendar';
  return last.replace(/\.html$/i, '').toLowerCase();
}

const here = currentPage();
const header=document.getElementById('portal-header');
if(header){header.innerHTML=`<a href="calendar.html" class="portal-logo">BCFC <span>Workers</span></a><nav class="portal-nav">${NAV.map(([t,h,r])=>`<a href="${h}" data-roles="${r}">${t.replace('&','&amp;')}</a>`).join('')}</nav><div class="portal-user"><span class="role-label" id="role-label"></span><a href="login.html" class="btn-logout">Log Out</a></div>`;}
const roleLabel=document.getElementById('role-label'); const navLinks=[...document.querySelectorAll('.portal-nav a')];
const canSee=a=>a.dataset.roles.split(',').some(r=>r==='all'||r===window.currentRole);
function refresh(){
  window.currentRole=window.roleReady ? realRole : ''; window.roleStatus=roleStatus; window.isApproved=window.roleReady && roleStatus==='approved'&&!!realRole;
  if(roleLabel){roleLabel.textContent=`${userName?userName+' ':''}(${window.isApproved?(NAMES[realRole]||realRole):'Role Pending'})`;}
  navLinks.forEach(a=>{
    const isCalendar=a.getAttribute('href')==='calendar.html';
    const allowed=window.roleReady && window.isApproved && canSee(a);
    const visible=window.roleReady && (isCalendar || (window.isApproved && canSee(a)));
    a.style.display=visible?'':'none'; a.classList.toggle('locked',!allowed); a.setAttribute('aria-disabled',String(!allowed));
  });
  // Pending users stay on the calendar. The clean URL is /calendar, while
  // the physical file is calendar.html, so compare normalized page names.
  // Do not redirect while Firebase is still loading the user's profile.
  // Otherwise pages such as Production and Chat briefly see the default
  // pending state and get sent back to Calendar before the real role arrives.
  if(!window.roleReady) {
    window.dispatchEvent(new CustomEvent('rolechange'));
    return;
  }

  if(!window.isApproved && here !== 'calendar') {
    location.replace('calendar');
    return;
  }

  if(window.isApproved && !canSeePage(here)) {
    location.replace('calendar');
    return;
  }
  window.dispatchEvent(new CustomEvent('rolechange'));
}

function linkPage(link){
  const raw = link.getAttribute('href') || '';
  return raw.split('?')[0].split('#')[0].replace(/\.html$/i, '').replace(/^\//, '').split('/').pop().toLowerCase();
}

function canSeePage(page){
  const link = navLinks.find(a => linkPage(a) === page);
  return !link || canSee(link);
}

refresh();
navLinks.forEach(a=>a.addEventListener('click',e=>{
  const page = linkPage(a);

  if(!window.isApproved && page !== 'calendar') {
    e.preventDefault();
    popup('Please wait for the admin to confirm your role before using this feature.');
    return;
  }

  if(window.isApproved && !canSee(a)) {
    e.preventDefault();
    popup('You do not have permission to use this feature.','No Permission');
  }
}));
const logoutButton=document.querySelector('.btn-logout'); if(logoutButton) logoutButton.onclick=async e=>{e.preventDefault();try{await signOut(auth);}finally{leaveToLogin();}};
