import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "../workers/firebase-config.js";
const ministryNames={childrens:"Children’s Church",ufy:"UFY",ufw:"UFW",ufm:"UFM",worship:"Praise & Worship",production:"Production",creatives:"Creatives"};
const roleMap={childrens:["childrens","childrens-lead"],ufy:["ufy","ufy-lead"],ufw:["ufw","ufw-lead"],ufm:["ufm","ufm-lead"],production:["production","production-lead"],creatives:["creatives","creatives-lead"]};
const choices=document.getElementById('ministry-choices'), section=document.getElementById('team-section'), title=document.getElementById('team-title'), status=document.getElementById('team-status'), list=document.getElementById('team-list');
const logo='assets/bcfc-logo.png';
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function personName(m){return m.name||[m.firstName,m.middleInitial,m.lastName].filter(Boolean).join(' ')||'Name unavailable';}
async function show(key){choices.hidden=true;section.hidden=false;title.textContent=ministryNames[key];status.textContent='Loading team…';list.innerHTML='';
 try{const snap=await getDocs(collection(db,'publicWorkers'));const roles=roleMap[key]||[];const people=snap.docs.map(d=>d.data()).filter(m=>m.ministry===key&&m.active!==false&&roles.includes(m.role));
 if(!people.length){status.textContent='No published team members are available yet.';return;}status.textContent='';list.innerHTML=people.map(m=>`<article class="team-person"><img src="${logo}" alt="BCFC logo"><h3>${esc(personName(m))}</h3><span class="team-role">${m.role.endsWith('-lead')?'Leader':'Worker'}</span></article>`).join('');
 }catch(e){console.error(e);status.textContent='Team information is not available right now. The Workers portal must publish the public team list and allow public reads.';}}
choices.addEventListener('click',e=>{const b=e.target.closest('[data-ministry]');if(b)show(b.dataset.ministry);});
document.getElementById('back-ministries').addEventListener('click',()=>{section.hidden=true;choices.hidden=false;});
const params=new URLSearchParams(location.search);if(params.get('m')&&ministryNames[params.get('m')])show(params.get('m'));
