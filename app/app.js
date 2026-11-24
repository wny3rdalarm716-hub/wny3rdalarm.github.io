(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const pages = ['home', 'incidents', 'weather', 'gallery', 'settings'];
  let installPrompt = null;
  let incidentRequest = 0;
  let weatherRequest = 0;

  function navigate() {
    const name = location.hash.slice(1);
    const page = pages.includes(name) ? name : 'home';
    pages.forEach(id => { $(id).hidden = id !== page; });
    document.querySelectorAll('.bottom-nav a').forEach(link => {
      if (link.dataset.page === page) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    if (page === 'incidents') loadIncidents();
    if (page === 'home' || page === 'weather') loadWeather();
  }
  window.addEventListener('hashchange', navigate);

  function text(tag, value, className) {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    return element;
  }
  function emptyIncidents(message) {
    const card = document.createElement('div');
    card.className = 'card empty';
    card.append(text('span', 'PUBLIC FEED', 'card-label'), text('h2', 'No reviewed updates available'), text('p', message));
    $('incident-list').replaceChildren(card);
  }
  // Never render free-form feed content. A publisher must explicitly review an
  // item and set reviewed: true; only these exact public categories are shown.
  const categories = new Map([
    ['STRUCTURE FIRE', 'Structure fire'], ['VEHICLE FIRE', 'Vehicle fire'],
    ['BRUSH FIRE', 'Brush fire'], ['OUTSIDE FIRE', 'Outside fire'], ['FIRE', 'Fire']
  ]);
  async function loadIncidents() {
    const request = ++incidentRequest;
    $('incident-status').textContent = 'Checking the public feed…';
    $('incident-list').replaceChildren();
    try {
      const response = await fetch('./reviewed-incidents.json', {cache: 'no-store'});
      if (!response.ok) throw new Error('Feed unavailable');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid feed');
      if (request !== incidentRequest) return;
      const now = Date.now();
      const entries = data.filter(item => item && item.reviewed === true && typeof item.type === 'string' && categories.has(item.type.trim().toUpperCase()) && typeof item.time === 'string' && Number.isFinite(Date.parse(item.time)) && Date.parse(item.time) <= now + 300000 && Date.parse(item.time) >= now - 86400000).sort((a,b) => Date.parse(b.time) - Date.parse(a.time)).slice(0, 15);
      if (!entries.length) emptyIncidents('The feed has no recent, reviewed public summaries to display.');
      else entries.forEach(item => {
        const card = document.createElement('article');
        card.className = 'card incident-card';
        card.append(text('span', 'REVIEWED PUBLIC SUMMARY', 'card-label'), text('h2', categories.get(item.type.trim().toUpperCase())), text('p', 'Western New York · Reviewed ' + new Date(item.time).toLocaleString()));
        $('incident-list').appendChild(card);
      });
      $('incident-status').textContent = 'Feed checked ' + new Date().toLocaleTimeString();
    } catch (_) {
      if (request !== incidentRequest) return;
      emptyIncidents('The feed could not be reached. Reconnect and try again.');
      $('incident-status').textContent = 'Public feed unavailable';
    }
  }
  $('refresh-incidents').addEventListener('click', loadIncidents);
  setInterval(() => { if (!$('incidents').hidden) loadIncidents(); }, 60000);


  const counties = {
    erie: {name: 'Erie', zone: 'NYC029', station: 'KBUF', point: '42.8864,-78.8784'},
    niagara: {name: 'Niagara', zone: 'NYC063', station: 'KIAG', point: '43.0962,-79.0377'},
    chautauqua: {name: 'Chautauqua', zone: 'NYC013', station: 'KJHW', point: '42.0970,-79.2353'},
    cattaraugus: {name: 'Cattaraugus', zone: 'NYC009', station: 'KOLE', point: '42.0776,-78.4297'},
    allegany: {name: 'Allegany', zone: 'NYC003', station: 'KELZ', point: '42.1220,-77.9481'},
    genesee: {name: 'Genesee', zone: 'NYC037', station: 'KGVQ', point: '42.9981,-78.1875'},
    orleans: {name: 'Orleans', zone: 'NYC073', station: 'KGVQ', point: '43.2464,-78.1936'},
    wyoming: {name: 'Wyoming', zone: 'NYC121', station: 'KGVQ', point: '42.7401,-78.1328'}
  };
  function readLocal(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; } }
  function writeLocal(key, value) { try { localStorage.setItem(key, value); return true; } catch (_) { return false; } }
  const countyKey = 'wny-app-weather-county';
  const savedCounty = readLocal(countyKey, 'erie');
  $('weather-county').value = Object.prototype.hasOwnProperty.call(counties, savedCounty) ? savedCounty : 'erie';
  $('weather-county').addEventListener('change', () => {
    $('weather-preference-status').textContent = writeLocal(countyKey, $('weather-county').value) ? 'Selection saved on this device.' : 'Selection could not be saved on this device.';
    loadWeather();
  });
  ['incidents', 'weather'].forEach(kind => {
    const checkbox = $('pref-' + kind), key = 'wny-app-notification-' + kind;
    checkbox.checked = readLocal(key, 'false') === 'true';
    checkbox.addEventListener('change', () => {
      $('notification-status').textContent = writeLocal(key, String(checkbox.checked)) ? 'Preference saved on this device. Automatic category delivery is not configured.' : 'Preference could not be saved. Automatic category delivery is not configured.';
    });
  });
  function weatherIcon(description) {
    const condition = (description || '').toLowerCase();
    if (/thunder|storm/.test(condition)) return '⛈';
    if (/snow|sleet|ice|freez/.test(condition)) return '❄';
    if (/rain|shower|drizzle/.test(condition)) return '☂';
    if (/fog|haze|smoke/.test(condition)) return '≋';
    if (/cloud|overcast/.test(condition)) return '☁';
    if (/sun|clear/.test(condition)) return '☀';
    return '◌';
  }

  async function getJSON(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {cache: 'no-store', headers: {Accept: 'application/geo+json'}, signal: controller.signal});
      if (!response.ok) throw new Error('NWS unavailable');
      const data = await response.json();
      if (!data || typeof data !== 'object') throw new Error('Invalid NWS response');
      return data;
    } finally { clearTimeout(timeout); }
  }
  async function loadWeather() {
    const request = ++weatherRequest;
    const api = 'https://api.weather.gov';
    const county = counties[$('weather-county').value] || counties.erie;
    const countyLabel = county.name.toUpperCase() + ' COUNTY';
    ['home-weather-location', 'weather-alerts-location', 'weather-forecast-location'].forEach(id => { $(id).textContent = countyLabel; });
    $('weather-observation-location').textContent = countyLabel + ' · NEARBY STATION ' + county.station;
    $('home-weather-icon').textContent = '◌';
    let observationDescription = '';
    let forecastDescription = '';
    function updateHomeCondition() {
      if (request !== weatherRequest) return;
      $('home-weather-condition').textContent = observationDescription || (forecastDescription ? 'Forecast: ' + forecastDescription : 'Current condition unavailable. Tap for details.');
      $('home-weather-icon').textContent = weatherIcon(observationDescription || forecastDescription);
    }
    $('weather-status').textContent = 'Loading current NWS information…';
    $('weather-current').textContent = 'Loading current conditions…';
    $('weather-alerts').textContent = 'Loading alerts…';
    $('weather-forecast').textContent = 'Loading forecast…';
    $('home-weather-temp').textContent = 'Checking weather…';
    $('home-weather-condition').textContent = 'Loading current conditions…';
    $('home-weather-time').textContent = '';

    // Render each response independently so a slow forecast cannot block the preview.
    const observation = getJSON(api + '/stations/' + county.station + '/observations/latest').then(data => {
      if (request !== weatherRequest) return;
      const p = data.properties;
      if (!p || typeof p !== 'object') throw new Error('Invalid observation');
      const temp = p.temperature && p.temperature.value;
      const degrees = Number.isFinite(temp) ? Math.round(temp * 9 / 5 + 32) + '°F' : 'Temperature unavailable';
      observationDescription = typeof p.textDescription === 'string' ? p.textDescription.trim() : '';
      const condition = observationDescription || 'Current condition unavailable';
      const observed = p.timestamp && Number.isFinite(Date.parse(p.timestamp)) ? 'Observed ' + new Date(p.timestamp).toLocaleString() : 'Observation time unavailable';
      $('home-weather-temp').textContent = degrees;
      updateHomeCondition();
      $('home-weather-time').textContent = observed;
      $('weather-current').replaceChildren(text('div', degrees, 'temperature'), text('p', condition), text('small', observed));
    }).catch(error => {
      if (request === weatherRequest) {
        $('home-weather-temp').textContent = 'Weather unavailable';
        updateHomeCondition();
        $('home-weather-time').textContent = '';
        $('weather-current').textContent = 'Current conditions unavailable. Refresh or check NWS Buffalo.';
      }
      throw error;
    });
    const alerts = getJSON(api + '/alerts/active?zone=' + county.zone).then(data => {
      if (request !== weatherRequest) return;
      if (!Array.isArray(data.features)) throw new Error('Invalid alerts');
      const items = data.features.slice(0, 12);
      $('weather-alerts').replaceChildren();
      if (!items.length) $('weather-alerts').textContent = 'No active NWS alerts reported for ' + county.name + ' County.';
      items.forEach(item => {
        const p = item && item.properties || {};
        const card = document.createElement('div'); card.className = 'weather-item';
        card.append(text('strong', p.event || 'Weather alert'), text('p', p.headline || 'See NWS for details.'));
        $('weather-alerts').appendChild(card);
      });
    }).catch(error => {
      if (request === weatherRequest) $('weather-alerts').textContent = 'Alerts unavailable. Refresh or check NWS for official updates.';
      throw error;
    });
    const forecast = getJSON(api + '/points/' + county.point).then(point => {
      const url = new URL(point.properties.forecast);
      if (url.origin !== api) throw new Error('Unexpected forecast source');
      return getJSON(url.href);
    }).then(data => {
      if (request !== weatherRequest) return;
      const periods = data.properties && data.properties.periods;
      if (!Array.isArray(periods) || !periods.length) throw new Error('Invalid forecast');
      forecastDescription = typeof periods[0].shortForecast === 'string' ? periods[0].shortForecast.trim() : '';
      updateHomeCondition();
      $('weather-forecast').replaceChildren();
      periods.slice(0, 10).forEach(period => {
        const item = document.createElement('div'); item.className = 'weather-item';
        const icon = text('span', weatherIcon(period.shortForecast), 'weather-symbol'); icon.setAttribute('aria-hidden', 'true');
        item.append(icon, text('strong', (period.name || 'Forecast') + ' · ' + period.temperature + '°' + period.temperatureUnit), text('p', period.shortForecast || ''));
        $('weather-forecast').appendChild(item);
      });
    }).catch(error => {
      if (request === weatherRequest) $('weather-forecast').textContent = 'Forecast unavailable. Refresh or check NWS Buffalo.';
      throw error;
    });
    const results = await Promise.allSettled([observation, alerts, forecast]);
    if (request !== weatherRequest) return;
    $('weather-status').textContent = results.every(result => result.status === 'fulfilled') ? 'NWS checked ' + new Date().toLocaleTimeString() : 'Some NWS information unavailable. Try refreshing.';
  }
  $('refresh-weather').addEventListener('click', loadWeather);
  setInterval(() => { if (!$('weather').hidden || !$('home').hidden) loadWeather(); }, 300000);
  window.addEventListener('offline', () => {
    ++incidentRequest; ++weatherRequest;
    $('incident-status').textContent = 'Offline';
    emptyIncidents('Reconnect to check for current public summaries.');
    $('weather-status').textContent = 'Offline';
    $('home-weather-temp').textContent = 'Weather unavailable';
    $('home-weather-condition').textContent = 'Reconnect to see current NWS information.';
    $('home-weather-time').textContent = '';
    ['weather-current', 'weather-alerts', 'weather-forecast'].forEach(id => { $(id).textContent = 'Reconnect to see current NWS information.'; });
  });

  window.addEventListener('online', () => { if (!$('home').hidden || !$('weather').hidden) loadWeather(); });

  // Browsers do not reliably expose installations to an ordinary browser tab.
  const appModes = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].map(mode => window.matchMedia('(display-mode: ' + mode + ')'));
  let installedThisSession = false;
  function isInstalledView() {
    return installedThisSession || navigator.standalone === true || appModes.some(mode => mode.matches) || document.referrer.startsWith('android-app://');
  }
  function updateInstallVisibility() { $('install-card').hidden = isInstalledView(); }
  appModes.forEach(mode => {
    if (mode.addEventListener) mode.addEventListener('change', updateInstallVisibility);
    else if (mode.addListener) mode.addListener(updateInstallVisibility);
  });
  updateInstallVisibility();
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    if (isInstalledView()) return;
    installPrompt = event;
    $('install-help').textContent = 'Install the app on this device, or use your browser’s install menu.';
  });
  $('install').addEventListener('click', async () => {
    if (installPrompt) {
      const prompt = installPrompt; installPrompt = null;
      try { await prompt.prompt(); await prompt.userChoice; } catch (_) { /* Browser menu instructions remain available. */ }
    }
    $('install-help').textContent = 'On iPhone: open in Safari, tap Share, then Add to Home Screen. On Android: use your browser’s Install app or Add to Home screen menu.';
  });
  window.addEventListener('appinstalled', () => { installPrompt = null; installedThisSession = true; updateInstallVisibility(); });

  $('share-app').addEventListener('click', async () => {
    const url = new URL('./', location.href).href;
    const status = $('share-status');
    const fallback = $('share-fallback');
    status.textContent = '';
    fallback.hidden = true;
    if (navigator.share) {
      try {
        await navigator.share({title: 'WNY 3RD ALARM', text: 'Capturing the action. Supporting those who respond.', url});
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      status.textContent = 'App link copied.';
    } catch (_) {
      $('share-url').value = url;
      fallback.hidden = false;
      status.textContent = 'Copy the app link below to share it.';
      $('share-url').focus();
      $('share-url').select();
    }
  });

  const viewer = $('photo-viewer');
  const viewerPhoto = $('viewer-photo');
  const photoButtons = Array.from(document.querySelectorAll('.photo-open'));
  let photoIndex = 0;
  function retryURL(source) {
    const url = new URL(source, location.href);
    url.searchParams.set('retry', String(Date.now()));
    return url.href;
  }
  photoButtons.forEach(button => {
    const image = button.querySelector('img');
    image.dataset.source = image.getAttribute('src');
    const frame = document.createElement('div'); frame.className = 'photo-frame';
    button.before(frame); frame.appendChild(button);
    const message = text('span', 'Loading photo…', 'image-message');
    message.setAttribute('role', 'status'); frame.appendChild(message);
    const retry = text('button', 'Retry photo', 'image-retry'); retry.type = 'button'; retry.hidden = true;
    retry.setAttribute('aria-label', 'Retry ' + image.alt); frame.after(retry);
    function success() { message.hidden = true; retry.hidden = true; }
    function failure() { message.hidden = false; message.textContent = 'Photo unavailable'; retry.hidden = false; }
    image.addEventListener('load', success); image.addEventListener('error', failure);
    if (image.complete) { if (image.naturalWidth) success(); else if (image.currentSrc) failure(); }
    retry.addEventListener('click', () => { message.textContent = 'Loading photo…'; message.hidden = false; retry.hidden = true; image.src = retryURL(image.dataset.source); });
  });
  function viewerLoading() { $('viewer-load').textContent = 'Loading photo…'; $('viewer-load').hidden = false; $('viewer-retry').hidden = true; }
  viewerPhoto.addEventListener('load', () => { $('viewer-load').hidden = true; $('viewer-retry').hidden = true; });
  viewerPhoto.addEventListener('error', () => { $('viewer-load').textContent = 'Photo unavailable'; $('viewer-load').hidden = false; $('viewer-retry').hidden = false; });
  $('viewer-retry').addEventListener('click', () => { viewerLoading(); viewerPhoto.src = retryURL(photoButtons[photoIndex].querySelector('img').dataset.source); });
  function showPhoto(index) {
    photoIndex = index;
    const figure = photoButtons[index].closest('figure');
    const image = figure.querySelector('img');
    viewerLoading(); viewerPhoto.src = image.src; viewerPhoto.alt = image.alt;
    if (viewerPhoto.complete && viewerPhoto.naturalWidth) $('viewer-load').hidden = true;
    $('photo-caption').textContent = figure.querySelector('figcaption').innerText.replace(/\s+/g, ' ').trim() + ' · ' + (index + 1) + ' / ' + photoButtons.length;
    $('viewer-prev').disabled = index === 0;
    $('viewer-next').disabled = index === photoButtons.length - 1;
  }
  photoButtons.forEach((button, index) => button.addEventListener('click', () => {
    showPhoto(index); viewer.showModal(); $('viewer-close').focus();
  }));
  $('viewer-close').addEventListener('click', () => viewer.close());
  $('viewer-prev').addEventListener('click', () => { if (photoIndex > 0) showPhoto(photoIndex - 1); });
  $('viewer-next').addEventListener('click', () => { if (photoIndex < photoButtons.length - 1) showPhoto(photoIndex + 1); });
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' && photoIndex > 0) { event.preventDefault(); showPhoto(photoIndex - 1); }
    if (event.key === 'ArrowRight' && photoIndex < photoButtons.length - 1) { event.preventDefault(); showPhoto(photoIndex + 1); }
  });
  let touchStart = null;
  const viewerImage = viewer.querySelector('.viewer-image');
  viewerImage.addEventListener('touchstart', event => {
    if (event.touches.length === 1) touchStart = {x: event.touches[0].clientX, y: event.touches[0].clientY};
    else touchStart = null;
  }, {passive: true});
  viewerImage.addEventListener('touchend', event => {
    if (!touchStart || event.changedTouches.length !== 1) { touchStart = null; return; }
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    if (dx < 0 && photoIndex < photoButtons.length - 1) showPhoto(photoIndex + 1);
    if (dx > 0 && photoIndex > 0) showPhoto(photoIndex - 1);
  }, {passive: true});
  viewerImage.addEventListener('touchcancel', () => { touchStart = null; });

  let registration = null;
  const hadController = 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
  function checkWorkerVersion(worker) {
    if (!worker) return Promise.resolve(null);
    return new Promise(resolve => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); resolve(null); }, 1500);
      channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
      worker.postMessage('GET_VERSION', [channel.port2]);
    });
  }
  async function indicateWorker(worker) {
    const version = await checkWorkerVersion(worker);
    if (version !== '2.3') showUpdate();
    else if ($('reload-update').hidden) $('update-status').textContent = 'App is running V2.3.';
  }
  function showUpdate() {
    $('update-status').textContent = 'An update is ready. Reload to use it.';
    $('reload-update').hidden = false;
  }
  $('reload-update').addEventListener('click', () => location.reload());
  $('check-update').addEventListener('click', async () => {
    if (!registration) { $('update-status').textContent = 'Update checks are unavailable in this browser.'; return; }
    $('update-status').textContent = 'Checking for updates…';
    try {
      await registration.update();
      if (registration.waiting) await indicateWorker(registration.waiting);
      else if (registration.installing) $('update-status').textContent = 'An update is being prepared…';
      else if ($('reload-update').hidden) $('update-status').textContent = 'Update check complete.';
    } catch (_) { $('update-status').textContent = 'Could not check for updates. Check your connection and try again.'; }
  });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) indicateWorker(navigator.serviceWorker.controller); });
    navigator.serviceWorker.register('./sw.js', {updateViaCache: 'none'}).then(reg => {
      registration = reg;
      if (reg.waiting && navigator.serviceWorker.controller) indicateWorker(reg.waiting);
      reg.addEventListener('updatefound', () => {
        if (!reg.installing) return;
        reg.installing.addEventListener('statechange', event => {
          if (event.target.state === 'installed' && navigator.serviceWorker.controller) indicateWorker(event.target);
        });
      });
      reg.update().catch(() => {});
    }).catch(() => { $('update-status').textContent = 'Update checks are unavailable.'; });
  } else $('update-status').textContent = 'Update checks are unavailable in this browser.';
  navigate();
})();
