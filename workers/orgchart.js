import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db, auth } from "./firebase-config.js";

const button=document.getElementById('sync-org-chart');
const status=document.getElementById('org-chart-sync-status');
const NAMES={admin:'Admin',pastor:'Pastor',preaching:'Preaching Staff','childrens-lead':"Children's Church Lead",childrens:"Children's Church Worker",'ufy-lead':'UFY Lead',ufy:'UFY Worker','ufw-lead':'UFW Lead',ufw:'UFW Worker','ufm-lead':'UFM Lead',ufm:'UFM Worker','production-lead':'Production Lead',production:'Production Worker','creatives-lead':'Creatives Lead',creatives:'Creatives Worker'};
const PARENT={admin:null,pastor:'admin',preaching:'pastor','childrens-lead':'pastor','ufy-lead':'pastor','ufw-lead':'pastor','ufm-lead':'pastor','production-lead':'pastor','creatives-lead':'pastor',childrens:'childrens-lead',ufy:'ufy-lead',ufw:'ufw-lead',ufm:'ufm-lead',production:'production-lead',creatives:'creatives-lead'};

async function publish(){
 if(!window.isApproved || window.currentRole!=='admin'){status.textContent='Administrator access required.';return;}
 button.disabled=true; status.textContent='Publishing…';
 try{
  const snap=await getDocs(collection(db,'users'));
  const approved=snap.docs.map(d=>({id:d.id,...d.data()})).filter(m=>m.role && (m.roleStatus==='approved' || !('roleStatus' in m)) && NAMES[m.role]);
  const current=await getDocs(collection(db,'orgChart'));
  const batch=writeBatch(db);
  current.docs.forEach(d=>batch.delete(d.ref));
  approved.forEach(m=>{
    const name=(m.name||`${m.firstName||''} ${m.lastName||''}`).trim()||'Unnamed';
    batch.set(doc(db,'orgChart',m.id),{
      name,
      role:m.role,
      title:NAMES[m.role],
      parentRole:PARENT[m.role]||null,
      active:true,
      updatedAt:new Date(),
      updatedBy:auth.currentUser?.uid||''
    });
  });
  await batch.commit();
  status.textContent=`Published ${approved.length} approved worker${approved.length===1?'':'s'}.`;
 }catch(e){console.error(e);status.textContent=`Publish failed (${e.code||e.message}).`;}
 finally{button.disabled=false;}
}
button?.addEventListener('click',publish);
window.addEventListener('rolechange',()=>{if(window.isApproved&&window.currentRole==='admin'){button.disabled=false;}else{button.disabled=true;}});
