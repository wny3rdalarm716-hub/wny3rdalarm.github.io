(() => {
  const $ = id => document.getElementById(id);
  const txt = (tag, value) => {const e = document.createElement(tag); e.textContent = value; return e;};
  let historyEpoch = 0;
  async function history() {
    if ($('notifications').hidden) return;
    const run = ++historyEpoch;
    try {
      const rows = await globalThis.wnyNotificationHistory.read();
      if (run !== historyEpoch) return;
      const list = $('notification-history'); list.replaceChildren();
      for (const item of rows) {
        const row = document.createElement('article'); row.className = 'connect-row';
        row.append(txt('strong',item.kind === 'local' ? 'Local device test' : 'Remote Firebase test'),txt('p',new Date(item.at).toLocaleString())); list.append(row);
      }
      if (!rows.length) list.append(txt('p','No recorded test notifications. Try a device test in Settings.'));
      $('history-status').textContent = `${rows.length} recent test notifications`;
    } catch (_) { $('history-status').textContent = 'Device history unavailable in this browser.'; }
  }
  $('history-refresh').onclick = history;
  $('history-clear').onclick = async () => {if (!confirm('Clear this device’s test notification history?')) return;try{await globalThis.wnyNotificationHistory.clear();await history();}catch(_){$('history-status').textContent='Could not clear device history.';}};
  document.addEventListener('wny-history-refresh', history);
  window.addEventListener('hashchange', history);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)history();});
  const radar=$('radar-image');
  $('radar-load').onclick=()=>{
    radar.hidden=true; $('radar-status').textContent='Requesting NWS radar…';
    radar.src='https://radar.weather.gov/ridge/lite/KBUF_loop.gif?t='+Date.now();
  };
  radar.onload=()=>{radar.hidden=false;$('radar-status').textContent='Radar image loaded '+new Date().toLocaleTimeString()+'. Check the embedded observation times.';};
  radar.onerror=()=>{radar.hidden=true;$('radar-status').textContent='Radar unavailable. Try the official NWS link.';};
  let healthEpoch=0;
  function health(){
    const run=++healthEpoch;
    $('health-online').textContent=navigator.onLine?'Browser reports online':'Browser reports offline';
    $('health-weather').textContent=$('weather-status').textContent;
    $('health-notify').textContent=typeof Notification==='undefined'?'Unsupported':Notification.permission;
    $('health-worker').textContent='Checking…';
    const worker=navigator.serviceWorker?.controller;
    if(!worker){$('health-worker').textContent='No active controller on this page';return;}
    const channel=new MessageChannel();
    const timeout=setTimeout(()=>{channel.port1.close();if(run===healthEpoch)$('health-worker').textContent='Version unavailable';},2000);
    channel.port1.onmessage=e=>{clearTimeout(timeout);channel.port1.close();if(run!==healthEpoch)return;$('health-worker').textContent='V'+String(e.data)+(e.data==='2.6'?' · matching':' · reload after update');};
    try{worker.postMessage('GET_VERSION',[channel.port2]);}catch(_){clearTimeout(timeout);channel.port1.close();if(run===healthEpoch)$('health-worker').textContent='Version unavailable';}
  }
  $('health-refresh').onclick=health;
  window.addEventListener('hashchange',()=>{if(location.hash==='#settings')health();});
  window.addEventListener('online',health);window.addEventListener('offline',health);
  if(location.hash==='#settings')health();history();
})();
