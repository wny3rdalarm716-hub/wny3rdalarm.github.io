import {getApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,doc,collection,getDocFromServer,getDocsFromServer,query,orderBy,limit,addDoc,deleteDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const $=id=>document.getElementById(id);
const presets=Object.freeze({photo_review:'Photos ready for editorial review.',gallery_ready:'Gallery content is ready.',website_review:'Website changes ready for review.',app_test:'App update ready for testing.',maintenance_done:'Routine maintenance complete.',meeting_plan:'Please check our usual group planning channel.',thanks:'Thanks for helping with the project!'});
for(const [kind,label] of Object.entries(presets)){const o=document.createElement('option');o.value=kind;o.textContent=label;$('board-choice').append(o);}
let auth,db,epoch=0,posting=false;
const status=t=>$('board-status').textContent=t;
const txt=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e;};
async function grant(){
  if($('dashboard').hidden)throw Error('Sign in to the staff portal first.');
  if(!auth){const app=getApp('wny-admin');auth=getAuth(app);db=getFirestore(app);}
  const user=auth.currentUser;
  if(!user?.emailVerified)throw Error('Verified staff access required.');
  const docSnap=await getDocFromServer(doc(db,'staffAccess',user.uid));
  if(!docSnap.exists()||docSnap.data().active!==true||auth.currentUser?.uid!==user.uid||$('dashboard').hidden)throw Error('Staff access not authorized.');
  return user.uid;
}
async function refresh(){
  const gen=++epoch;$('board-send').disabled=true;
  if($('dashboard').hidden){$('staff-board').hidden=true;$('board-list').replaceChildren();return;}
  $('staff-board').hidden=false;status('Checking staff access…');
  try{
    const uid=await grant();
    const result=await getDocsFromServer(query(collection(db,'teamBoard'),orderBy('createdAt','desc'),limit(30)));
    if(gen!==epoch||$('dashboard').hidden||auth.currentUser?.uid!==uid)return;
    const list=$('board-list');list.replaceChildren();
    for(const snap of result.docs){const data=snap.data();if(!Object.hasOwn(presets,data.kind))continue;const row=document.createElement('article');row.className='connect-row';row.append(txt('strong',presets[data.kind]),txt('p',(data.author===uid?'You':'Staff member')+' · '+(data.createdAt?.toDate().toLocaleString()||'Recent')));
      if(data.author===uid){const button=txt('button','Remove my message');button.type='button';button.className='secondary';button.onclick=async()=>{if(!confirm('Remove this message?'))return;try{await grant();await deleteDoc(snap.ref);await refresh();}catch(_){status('Could not remove message.');}};row.append(button);}
      list.append(row);
    }
    if(!list.childElementCount)list.append(txt('p','No team messages yet.'));
    status('Last checked '+new Date().toLocaleTimeString());$('board-send').disabled=posting;
  }catch(e){if(gen!==epoch)return;$('board-list').replaceChildren();status(e.code==='permission-denied'?'Board access denied. Confirm V2.5 rules are published in the admin project.':'Team board unavailable. Check staff access and network.');}
}
$('board-form').onsubmit=async e=>{e.preventDefault();if(posting)return;posting=true;$('board-send').disabled=true;try{const uid=await grant();const kind=$('board-choice').value;if(!Object.hasOwn(presets,kind))throw Error('Invalid message');await addDoc(collection(db,'teamBoard'),{kind,author:uid,createdAt:serverTimestamp()});}catch(_){status('Message not sent. Check permissions and connection.');posting=false;$('board-send').disabled=false;return;}posting=false;await refresh();};
$('board-refresh').onclick=refresh;
new MutationObserver(refresh).observe($('dashboard'),{attributes:true,attributeFilter:['hidden']});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
setInterval(()=>{if(!document.hidden&&!$('dashboard').hidden&&!posting)refresh();},30000);
refresh();
