(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const get = (k,f='') => {try{return localStorage.getItem('wny-experience-'+k) ?? f;}catch(_){return f;}};
  const set = (k,v) => {try{localStorage.setItem('wny-experience-'+k,v);return true;}catch(_){return false;}};
  const themes=['dark','amoled','light'];
  const theme=themes.includes(get('theme'))?get('theme'):'dark';
  function applyTheme(value){document.documentElement.dataset.theme=value;document.querySelector('meta[name="theme-color"]').content=value==='light'?'#f4f5f7':value==='amoled'?'#000000':'#0c0e12';}
  $('appearance-theme').value=theme;applyTheme(theme);
  $('reduce-motion').checked=get('reduce')==='true';document.documentElement.dataset.reduceMotion=String($('reduce-motion').checked);
  $('appearance-theme').onchange=()=>{const value=$('appearance-theme').value;applyTheme(value);$('appearance-status').textContent=set('theme',value)?'Theme saved on this device.':'Theme changed for this session only.';};
  $('reduce-motion').onchange=()=>{const value=String($('reduce-motion').checked);document.documentElement.dataset.reduceMotion=value;$('appearance-status').textContent=set('reduce',value)?'Motion preference saved.':'Motion preference changed for this session only.';};
  $('welcome-card').hidden=get('welcome')==='seen';
  $('welcome-dismiss').onclick=()=>{$('welcome-card').hidden=true;set('welcome','seen');};
  $('welcome-show').onclick=()=>{$('welcome-card').hidden=false;location.hash='home';requestAnimationFrame(()=>$('welcome-card').scrollIntoView({block:'center'}));};
  let galleryReady=false,preferredPhoto=null,featuredOrder=['rescue7','scene','night','engine4','rescue','police'];
  function dailyPhoto(){
    if(!galleryReady)return;
    const list=[...document.querySelectorAll('#gallery figure[data-photo-id]')].filter(f=>!f.hidden&&f.querySelector('img')).sort((a,b)=>featuredOrder.indexOf(a.dataset.photoId)-featuredOrder.indexOf(b.dataset.photoId));
    $('daily-photo').hidden=true;
    $('daily-photo-status').hidden=false;
    if(!list.length){$('daily-photo-status').textContent='No featured photo is available.';return;}
    const now=new Date();const day=Math.floor(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000);
    const figure=list.find(f=>f.dataset.photoId===preferredPhoto)||list[day%list.length],image=figure.querySelector('img'), target=$('daily-photo-img');
    $('daily-photo-title').textContent=figure.querySelector('figcaption b')?.textContent||'Featured photograph';
    $('daily-photo-credit').textContent=figure.querySelector('figcaption span')?.textContent||'WNY 3RD ALARM';
    target.alt=image.alt;target.src=image.dataset.source||image.getAttribute('src');$('daily-photo').hidden=false;$('daily-photo-status').hidden=true;
  }
  $('daily-photo-img').onerror=()=>{$('daily-photo').hidden=true;$('daily-photo-status').hidden=false;$('daily-photo-status').textContent='Featured photograph unavailable. Explore the gallery instead.';};
  // Wait for public gallery preferences before showing a feature. If they cannot be read, leave the feature unavailable.
  document.addEventListener('wny-gallery-changed',()=>{galleryReady=true;dailyPhoto();});
  document.addEventListener('wny-gallery-order',e=>{preferredPhoto=e.detail?.featured||null;if(Array.isArray(e.detail?.order))featuredOrder=[...e.detail.order];dailyPhoto();});
  $('daily-photo-status').textContent='Featured photo appears after gallery preferences load.';
  $('feedback-open').onclick=()=>{const type=$('feedback-type').value;const allowed=['Bug report','Feature suggestion','Accessibility feedback'];if(!allowed.includes(type))return;const subject='WNY 3RD ALARM App V3.0 — '+type;const body='Please describe your feedback here. Avoid personal details, incident locations and credentials.\n\n';$('feedback-status').textContent='Your email app will open if configured. Review the message before sending.';location.href='mailto:wny3rdalarm716@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);};
  const opt=$('announcement-optin');opt.checked=get('news-optin')==='true';
  const newsStatus=$('announcement-notify-status');
  const newsText=$('staff-announcement-text');
  let checking=false;
  const allowedNews=new Set(['A new WNY 3RD ALARM app update is available. Check Settings for updates.','Explore our photography in the Gallery tab.','Some app features may be temporarily unavailable during maintenance.','Thank you for supporting WNY 3RD ALARM and your local fire departments.']);
  opt.onchange=async()=>{if(!opt.checked){set('news-optin','false');newsStatus.textContent='Announcement reminders disabled.';return;}try{if(!('Notification' in window)||!navigator.serviceWorker?.controller)throw Error('Notifications unavailable. Open the installed app.');if(await Notification.requestPermission()!=='granted')throw Error('Notification permission was not granted.');if(!set('news-optin','true'))throw Error('Preference could not be saved.');set('news-last',allowedNews.has(newsText.textContent)?newsText.textContent:'');newsStatus.textContent='Enabled for future announcements detected while the app is open.';}catch(e){opt.checked=false;set('news-optin','false');newsStatus.textContent=e.message;}};
  async function checkNews(){if(checking||!opt.checked||document.hidden||$('staff-announcement').hidden)return;const message=newsText.textContent;if(!allowedNews.has(message)||message===get('news-last'))return;checking=true;try{if(Notification.permission!=='granted')throw Error('Notifications are not permitted.');const reg=await navigator.serviceWorker.getRegistration();if(!reg?.active)throw Error('No active service worker.');await reg.showNotification('WNY 3RD ALARM · Organization news',{body:message,icon:new URL('./icons/icon-192.png',reg.scope).href,tag:'wny-org-news'});set('news-last',message);newsStatus.textContent='New announcement notification requested on this device.';}catch(_){newsStatus.textContent='Announcement notification unavailable. Read the homepage announcement.';}finally{checking=false;}}
  new MutationObserver(checkNews).observe($('staff-announcement'),{attributes:true,attributeFilter:['hidden'],subtree:true,childList:true,characterData:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkNews();});
})();
