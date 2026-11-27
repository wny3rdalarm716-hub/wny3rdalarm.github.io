import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getFirestore,doc,getDocFromServer} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {config,configured,photoLabels} from './admin-config.js?v=2.4';
const original=Object.keys(photoLabels);let db,reading=false;
function valid(order){return Array.isArray(order)&&order.length===original.length&&new Set(order).size===original.length&&original.every(id=>order.includes(id));}
async function refresh(){if(!configured||reading||document.hidden)return;reading=true;try{db??=getFirestore(initializeApp(config,'wny-gallery-order'));const snap=await getDocFromServer(doc(db,'gallerySettings','app'));const data=snap.data()||{};document.dispatchEvent(new CustomEvent('wny-gallery-order',{detail:{order:valid(data.order)?data.order:original,featured:original.includes(data.featured)?data.featured:null}}));}catch(_){/* Keep existing order if settings cannot be read. */}finally{reading=false;}}
// Wait until deferred gallery and feature listeners are installed.
if(document.readyState==='complete')refresh();else window.addEventListener('load',refresh,{once:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});window.addEventListener('online',refresh);
