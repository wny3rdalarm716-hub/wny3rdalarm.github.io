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
      const response = await fetch('../incidents.json', {cache: 'no-store'});
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
        card.append(text('span', 'REVIEWED PUBLIC SUMMARY', 'card-label'), text('h2', categories.get(item.type.trim().toUpperCase())), text('p', 'Western New York · ' + new Date(item.time).toLocaleString()));
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
    let observationDescription = '';
    let forecastDescription = '';
    function updateHomeCondition() {
      if (request !== weatherRequest) return;
      $('home-weather-condition').textContent = observationDescription || (forecastDescription ? 'Forecast: ' + forecastDescription : 'Current condition unavailable. Tap for details.');
    }
    $('weather-status').textContent = 'Loading current NWS information…';
    $('weather-current').textContent = 'Loading current conditions…';
    $('weather-alerts').textContent = 'Loading alerts…';
    $('weather-forecast').textContent = 'Loading forecast…';
    $('home-weather-temp').textContent = 'Checking weather…';
    $('home-weather-condition').textContent = 'Loading current conditions…';
    $('home-weather-time').textContent = '';

    // Render each response independently so a slow forecast cannot block the preview.
    const observation = getJSON(api + '/stations/KBUF/observations/latest').then(data => {
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
    const alerts = getJSON(api + '/alerts/active?zone=NYC029').then(data => {
      if (request !== weatherRequest) return;
      if (!Array.isArray(data.features)) throw new Error('Invalid alerts');
      const items = data.features.slice(0, 12);
      $('weather-alerts').replaceChildren();
      if (!items.length) $('weather-alerts').textContent = 'No active NWS alerts reported for Erie County.';
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
    const forecast = getJSON(api + '/points/42.8864,-78.8784').then(point => {
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
      periods.slice(0, 4).forEach(period => {
        const item = document.createElement('div'); item.className = 'weather-item';
        item.append(text('strong', (period.name || 'Forecast') + ' · ' + period.temperature + '°' + period.temperatureUnit), text('p', period.shortForecast || ''));
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
  const photoButtons = Array.from(document.querySelectorAll('.photo-open'));
  let photoIndex = 0;
  function showPhoto(index) {
    photoIndex = index;
    const figure = photoButtons[index].closest('figure');
    const image = figure.querySelector('img');
    $('viewer-photo').src = image.src;
    $('viewer-photo').alt = image.alt;
    $('photo-caption').textContent = figure.querySelector('figcaption').innerText.replace(/\s+/g, ' ').trim() + ' · ' + (index + 1) + ' / ' + photoButtons.length;
    $('viewer-prev').disabled = index === 0;
    $('viewer-next').disabled = index === photoButtons.length - 1;
  }
  photoButtons.forEach((button, index) => button.addEventListener('click', () => {
    showPhoto(index);
    viewer.showModal();
    $('viewer-close').focus();
  }));
  $('viewer-close').addEventListener('click', () => viewer.close());
  $('viewer-prev').addEventListener('click', () => { if (photoIndex > 0) showPhoto(photoIndex - 1); });
  $('viewer-next').addEventListener('click', () => { if (photoIndex < photoButtons.length - 1) showPhoto(photoIndex + 1); });
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' && photoIndex > 0) { event.preventDefault(); showPhoto(photoIndex - 1); }
    if (event.key === 'ArrowRight' && photoIndex < photoButtons.length - 1) { event.preventDefault(); showPhoto(photoIndex + 1); }
  });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', {updateViaCache: 'none'})
      .then(registration => registration.update().catch(() => {})).catch(() => {});
  }
  navigate();
})();
