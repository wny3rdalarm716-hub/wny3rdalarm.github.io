import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getMessaging,isSupported,getToken,deleteToken,onMessage} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js';
const config={apiKey:'AIzaSyDp8RiAMM-MBaFw4VDGth3cFIF8pxvORPE',authDomain:'wny-photo-of-the-week.firebaseapp.com',projectId:'wny-photo-of-the-week',messagingSenderId:'982323538072',appId:'1:982323538072:web:5ee02ad7f43f83d77948ed'};
const vapidKey='BKpC3pDMub0BmFpxLvqZejgtr1_J8JCvvjsxyA_bkiHMHT4umFvyRFM-hFay7omQtlgHXR-Sauf4xlvvo-5EanM';
const $=id=>document.getElementById(id);
const status=t=>$('push-status').textContent=t;
let messaging, token, registration;
status(typeof Notification === 'undefined' ? 'Notifications unavailable in this browser.' : Notification.permission === 'granted' ? 'Browser permission granted. Enable notifications to verify Firebase registration.' : 'Enable notifications to register this device for remote testing.');
async function setup(){
 if(!await isSupported()) throw Error('Web push is not supported on this browser. On iPhone, install the app first.');
 if(!messaging){messaging=getMessaging(initializeApp(config));onMessage(messaging,async()=>{status('Test push received while the app was open.');try{const reg=await navigator.serviceWorker.ready;await reg.showNotification('WNY 3RD ALARM',{body:'Test notification received.',icon:new URL('./icons/icon-192.png',reg.scope).href,tag:'wny-test'});}catch(e){status('Test push received; notification display failed: '+e.message);}});}
 registration=await navigator.serviceWorker.ready;
 if(!registration.scope.endsWith('/app/')) throw Error('Unexpected service worker scope.');
}
async function register(){await setup();token=await getToken(messaging,{vapidKey,serviceWorkerRegistration:registration});if(!token)throw Error('No device token returned.');$('push-copy').hidden=false;status('Device registered. Ready for an authorized test push. Automatic alerts are not configured.');}
$('push-enable').onclick=async()=>{try{if(!('Notification' in window))throw Error('Notifications unsupported.');const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Notification permission was not granted.');await register();}catch(e){status(e.message);}};
$('push-disable').onclick=async()=>{try{await setup();await deleteToken(messaging);token=null;$('push-copy').hidden=true;status('Device registration removed. Browser permission can be changed in site settings.');}catch(e){status(e.message);}};
$('push-copy').onclick=async()=>{try{if(token){await navigator.clipboard.writeText(token);status('Private device token copied. Use only with your authorized test sender.');}}catch(e){status('Clipboard unavailable.');}};
