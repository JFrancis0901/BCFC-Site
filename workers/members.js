import { collection,getDocs,doc,updateDoc,deleteDoc,query,orderBy } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth,db } from "./firebase-config.js";
const NAMES={admin:'Admin',pastor:'Pastor',preaching:'Preaching Staff','childrens-lead':"Children's Church Lead",childrens:"Children's Church Worker",'ufy-lead':'UFY Lead',ufy:'UFY Worker','ufw-lead':'UFW Lead',ufw:'UFW Worker','ufm-lead':'UFM Lead',ufm:'UFM Worker','production-lead':'Production Lead',production:'Production Worker','creatives-lead':'Creatives Lead',creatives:'Creatives Worker'};
const list=document.getElementById('members-list'), requests=document.getElementById('requests-list'), count=document.getElementById('request-count'), errorBox=document.getElementById('members-error');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function formatDate(t){if(!t)return '—';const d=typeof t.toDate==='function'?t.toDate():new Date(t);return Number.isNaN(d.getTime())?'—':d.toLocaleString(undefined,{year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'});}
function statusBadge(s){const label=s==='approved'?'Approved':s==='rejected'?'Rejected':'Pending';return `<span class="role-badge ${s}-badge">${label}</span>`;}
function notify(title,text){const box=document.getElementById('members-notification');document.getElementById('members-notification-title').textContent=title;document.getElementById('members-notification-text').textContent=text;box.classList.add('show');}
function closeNotify(){document.getElementById('members-notification').classList.remove('show');}
document.querySelector('.members-notification-close').onclick=closeNotify;document.getElementById('members-notification-ok').onclick=closeNotify;
let memberDocs=[];
async function loadMembers(){
 try{
  const snap=await getDocs(query(collection(db,'users'),orderBy('createdAt','desc')));
  memberDocs=snap.docs;
  const pending=snap.docs.filter(d=>{const m=d.data();return (m.roleStatus||'pending')==='pending'&&!!(m.requestedRole||'');});
  count.textContent=String(pending.length);
  if(!pending.length) requests.innerHTML='<tr><td colspan="5" class="members-empty">There are no pending role requests.</td></tr>';
  else requests.innerHTML=pending.map(d=>{const m=d.data(),uid=d.id,name=m.name||`${m.firstName||''} ${m.lastName||''}`.trim()||'—',requested=m.requestedRole||'';return `<tr><td><strong>${esc(name)}</strong></td><td>${esc(m.email||'—')}</td><td><span class="role-badge pending-badge">${esc(NAMES[requested]||requested)}</span></td><td>${esc(formatDate(m.createdAt))}</td><td><div class="action-row"><button type="button" class="approve-member-btn" data-id="${esc(uid)}">Approve</button><button type="button" class="reject-member-btn" data-id="${esc(uid)}">Reject</button></div></td></tr>`;}).join('');
  if(!snap.empty) list.innerHTML=snap.docs.map(d=>{const m=d.data(),uid=d.id,me=uid===auth.currentUser?.uid,requested=m.requestedRole||m.role||'',status=m.roleStatus||'pending',approved=m.role||'',name=m.name||`${m.firstName||''} ${m.lastName||''}`.trim()||'—';return `<tr><td>${esc(name)}</td><td>${esc(m.email||'—')}</td><td><span class="role-badge">${esc(NAMES[requested]||requested||'Not selected')}</span></td><td>${statusBadge(status)}</td><td><span class="role-badge approved-badge">${esc(NAMES[approved]||approved||'—')}</span></td><td>${esc(formatDate(m.createdAt))}</td><td>${me?'<span>Current account</span>':`<button type="button" class="remove-member-btn" data-id="${esc(uid)}" data-name="${esc(name)}">Remove</button>`}</td></tr>`;}).join('');
  else list.innerHTML='<tr><td colspan="7" class="members-empty">No members found.</td></tr>';
 }catch(err){console.error(err);errorBox.textContent=`Could not load members (${err.code||err.message}).`;errorBox.hidden=false;}
}
async function handleAction(e){
 const approve=e.target.closest('.approve-member-btn'),reject=e.target.closest('.reject-member-btn'),remove=e.target.closest('.remove-member-btn');
 try{
  if(approve){approve.disabled=true;const target=memberDocs.find(x=>x.id===approve.dataset.id)?.data();if(!target?.requestedRole)throw new Error('This member has no requested role.');await updateDoc(doc(db,'users',approve.dataset.id),{role:target.requestedRole,roleStatus:'approved',approvedAt:new Date()});notify('Role Approved','The member has been approved and will receive access automatically.');await loadMembers();return;}
  if(reject){reject.disabled=true;await updateDoc(doc(db,'users',reject.dataset.id),{role:'',roleStatus:'rejected'});notify('Request Rejected','The role request has been rejected.');await loadMembers();return;}
  if(remove){remove.disabled=true;await deleteDoc(doc(db,'users',remove.dataset.id));notify('Member Removed','The member profile was removed.');await loadMembers();}
 }catch(err){console.error(err);errorBox.textContent=`Action failed (${err.code||err.message}).`;errorBox.hidden=false;await loadMembers();}
}
requests.addEventListener('click',handleAction);list.addEventListener('click',handleAction);
loadMembers();