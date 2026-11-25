import {getApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore,doc,getDocFromServer,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {announcements,photoLabels} from '../admin-config.js?v=2.4';
const $=id=>document.getElementById(id);
const focuses=['general','technology','photography','editorial','organization'];
const tests={login:'Staff login and sign-out',weather:'Weather and alert views',gallery:'Gallery and featured photo',voting:'Existing photo voting page',board:'Staff message board',updates:'Version and update check'};
const status=t=>$('management-status').textContent=t;
const backupStatus=t=>$('management-backup-status').textContent=t;
let epoch=0,working=false,ready=false;
for(const [key,title] of Object.entries(tests)){
 const label=document.createElement('label');label.className='check';
 const input=document.createElement('input');input.type='checkbox';input.value=key;
 input.addEventListener('change',progress);label.append(input,document.createTextNode(title));$('management-checks').append(label);
}
function checks(){return [...$('management-checks').querySelectorAll('input:checked')].map(x=>x.value);}
function progress(){const n=checks().length;$('management-meter').value=n;$('management-progress').textContent=n+' / '+Object.keys(tests).length+' complete';}
function apply(data={}){$('management-focus').value=focuses.includes(data.focus)?data.focus:'general';const saved=data.release==='2.7'&&Array.isArray(data.checks)?data.checks:[];for(const input of $('management-checks').querySelectorAll('input'))input.checked=saved.includes(input.value);progress();}
function controls(enabled){ready=enabled;for(const id of ['management-save','management-export','management-import','management-focus'])$(id).disabled=!enabled;for(const input of $('management-checks').querySelectorAll('input'))input.disabled=!enabled;}
async function grant(){
 if($('dashboard').hidden)throw Error('Staff sign-in required.');
 const app=getApp('wny-admin'),auth=getAuth(app),db=getFirestore(app),user=auth.currentUser;
 if(!user?.emailVerified)throw Error('Verified account required.');
 const access=await getDocFromServer(doc(db,'staffAccess',user.uid));
 if(!access.exists()||access.data().active!==true||auth.currentUser?.uid!==user.uid||$('dashboard').hidden)throw Error('Staff access not authorized.');
 return {auth,db,uid:user.uid};
}
function current(gen,session){return gen===epoch&&!$('dashboard').hidden&&session.auth.currentUser?.uid===session.uid;}
function errorText(e){return e.code==='permission-denied'?'Access denied. Confirm the V2.7 rules are published in the admin Firebase project.':e.code==='unavailable'||!navigator.onLine?'Firebase unavailable. Reconnect and refresh.':'Unable to complete the action. Refresh access and try again.';}
async function refresh(){
 const gen=++epoch;controls(false);apply();backupStatus('');$('management-import').value='';
 $('management-access').textContent='Not checked';
 if($('dashboard').hidden){$('staff-management').hidden=true;return;}
 $('staff-management').hidden=false;status('Checking your workspace…');
 try{const session=await grant();if(!current(gen,session))return;$('management-access').textContent='Verified email · active staff grant confirmed';
 const snap=await getDocFromServer(doc(session.db,'staffWorkspace',session.uid));if(!current(gen,session))return;apply(snap.data());controls(true);status('Workspace loaded. All staff have equal portal permissions.');}
 catch(e){if(gen===epoch)status(errorText(e));}
}
$('management-refresh').onclick=()=>{if(!working)refresh();};
$('management-form').onsubmit=async event=>{
 event.preventDefault();if(working||!ready)return;working=true;const gen=epoch;const focus=$('management-focus').value,selected=checks();controls(false);
 try{if(!focuses.includes(focus)||!selected.every(k=>Object.hasOwn(tests,k)))throw Error('Invalid workspace');const session=await grant();if(!current(gen,session))return;
 await setDoc(doc(session.db,'staffWorkspace',session.uid),{focus,release:'2.7',checks:selected,updatedAt:serverTimestamp()});if(current(gen,session))status('Private workspace saved.');}
 catch(e){if(gen===epoch)status(errorText(e));}finally{working=false;if(gen===epoch&&!$('dashboard').hidden)controls(true);}
};
function validateSettings(data){
 if(!data||typeof data!=='object'||!Object.hasOwn(announcements,data.announcement)||!Array.isArray(data.hiddenPhotos)||data.hiddenPhotos.length>Object.keys(photoLabels).length||!data.hiddenPhotos.every(x=>typeof x==='string'&&Object.hasOwn(photoLabels,x))||new Set(data.hiddenPhotos).size!==data.hiddenPhotos.length)throw Error('Invalid backup settings.');
 return {announcement:data.announcement,hiddenPhotos:[...data.hiddenPhotos]};
}
function validateBackup(data){if(!data||data.format!=='wny-public-settings-v1'||Object.keys(data).sort().join(',')!=='format,settings'||!data.settings||Object.keys(data.settings).sort().join(',')!=='announcement,hiddenPhotos')throw Error('Invalid backup format.');return validateSettings(data.settings);}
$('management-export').onclick=async()=>{
 if(working||!ready)return;working=true;const gen=epoch;
 try{const session=await grant();const snap=await getDocFromServer(doc(session.db,'publicSettings','app'));if(!current(gen,session))return;const settings=validateSettings(snap.exists()?snap.data():{announcement:'none',hiddenPhotos:[]});
 const blob=new Blob([JSON.stringify({format:'wny-public-settings-v1',settings},null,2)+'\n'],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='wny-public-settings.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);backupStatus('Download requested. Check your Downloads folder.');}
 catch(e){if(gen===epoch)backupStatus(errorText(e));}finally{working=false;}
};
$('management-import').onchange=async()=>{
 const input=$('management-import'),file=input.files?.[0];input.value='';if(!file||working||!ready)return;working=true;const gen=epoch;
 try{if(file.size>16384)throw Error('Backup is too large.');const session=await grant();const data=validateBackup(JSON.parse(await file.text()));if(!current(gen,session))return;
 $('announcement').value=data.announcement;for(const c of $('photos').querySelectorAll('input'))c.checked=!data.hiddenPhotos.includes(c.dataset.photo);
 backupStatus('Backup loaded into the public settings form. Nothing has been published. Review the values before saving.');$('content').scrollIntoView({block:'start'});}
 catch(e){if(gen===epoch)backupStatus(e.code?errorText(e):'Backup not loaded. Select a valid WNY public settings JSON file.');}finally{working=false;}
};
new MutationObserver(refresh).observe($('dashboard'),{attributes:true,attributeFilter:['hidden']});
refresh();
