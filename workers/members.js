import { collection,getDocs,doc,updateDoc,deleteDoc,query,orderBy } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { auth,db } from "./firebase-config.js";
const NAMES={admin:'Admin',pastor:'Pastor',preaching:'Preaching Staff','childrens-lead':"Children's Church Lead",childrens:"Children's Church Worker",'ufy-lead':'UFY Lead',ufy:'UFY Worker','ufw-lead':'UFW Lead',ufw:'UFW Worker','ufm-lead':'UFM Lead',ufm:'UFM Worker','production-lead':'Production Lead',production:'Production Worker','creatives-lead':'Creatives Lead',creatives:'Creatives Worker'};
const list=document.getElementById('members-list'), errorBox=document.getElementById('members-error');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function formatDate(t){if(!t)return '—';const d=typeof t.toDate==='function'?t.toDate():new Date(t);return Number.isNaN(d.getTime())?'—':d.toLocaleString(undefined,{year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'});}
function statusBadge(s){const label=s==='approved'?'Approved':s==='rejected'?'Rejected':'Pending';return `<span class="role-badge">${label}</span>`;}
async function loadMembers(){
 try{
  const snap=await getDocs(query(collection(db,'users'),orderBy('createdAt','desc')));
  if(snap.empty){list.innerHTML='<tr><td colspan="7" class="members-empty">No members found.</td></tr>';return;}
  list.innerHTML=snap.docs.map(d=>{const m=d.data(), uid=d.id, me=uid===auth.currentUser?.uid, requested=m.requestedRole||m.role||'', status=m.roleStatus||'pending', approved=m.role||'';
   return `<tr><td>${esc(m.name||`${m.firstName||''} ${m.lastName||''}`.trim()||'—')}</td><td>${esc(m.email||'—')}</td><td><span class="role-badge">${esc(NAMES[requested]||requested||'Not selected')}</span></td><td>${statusBadge(status)}</td><td><span class="role-badge">${esc(NAMES[approved]||approved||'—')}</span></td><td>${esc(formatDate(m.createdAt))}</td><td>${me?'<span class="cannot-remove">Current account</span>':`<div style="display:flex;gap:6px;flex-wrap:wrap">${status!=='approved'&&requested?`<button type="button" class="approve-member-btn" data-id="${esc(uid)}">Approve</button>`:''}${status!=='approved'&&requested?`<button type="button" class="reject-member-btn" data-id="${esc(uid)}">Reject</button>`:''}<button type="button" class="remove-member-btn" data-id="${esc(uid)}" data-name="${esc(m.name||m.email||'this member')}">Remove</button></div>`}</td></tr>`;
  }).join('');
 }catch(err){console.error(err);errorBox.textContent=`Could not load members (${err.code||err.message}).`;errorBox.hidden=false;}
}
list.addEventListener('click',async e=>{
 const approve=e.target.closest('.approve-member-btn'), reject=e.target.closest('.reject-member-btn'), remove=e.target.closest('.remove-member-btn');
 try{
  if(approve){approve.disabled=true;const ref=doc(db,'users',approve.dataset.id);const snap=await getDocs(query(collection(db,'users')));const target=snap.docs.find(x=>x.id===approve.dataset.id)?.data();if(!target?.requestedRole)throw new Error('This member has no requested role.');await updateDoc(ref,{role:target.requestedRole,roleStatus:'approved',approvedAt:new Date()});await loadMembers();return;}
  if(reject){if(!confirm('Reject this role request?'))return;reject.disabled=true;await updateDoc(doc(db,'users',reject.dataset.id),{role:'',roleStatus:'rejected'});await loadMembers();return;}
  if(remove){if(!confirm(`Remove ${remove.dataset.name}? This deletes the worker profile.`))return;remove.disabled=true;await deleteDoc(doc(db,'users',remove.dataset.id));await loadMembers();}
 }catch(err){console.error(err);errorBox.textContent=`Action failed (${err.code||err.message}).`;errorBox.hidden=false;await loadMembers();}
});
loadMembers();
