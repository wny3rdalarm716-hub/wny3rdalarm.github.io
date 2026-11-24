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
    if (page === 'weather') loadWeather();
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
    const response = await fetch(url, {cache: 'no-store', headers: {Accept: 'application/geo+json'}});
    if (!response.ok) throw new Error('NWS unavailable');
    return response.json();
  }
  async function loadWeather() {
    const request = ++weatherRequest;
    $('weather-status').textContent = 'Checking NWS…';
    $('weather-current').textContent = 'Loading current conditions…';
    $('weather-alerts').textContent = 'Loading alerts…';
    $('weather-forecast').textContent = 'Loading forecast…';
    const api = 'https://api.weather.gov';
    const results = await Promise.allSettled([
      getJSON(api + '/stations/KBUF/observations/latest'),
      getJSON(api + '/alerts/active?zone=NYC029'),
      getJSON(api + '/points/42.8864,-78.8784').then(point => {
        const forecast = new URL(point.properties.forecast);
        if (forecast.origin !== api) throw new Error('Unexpected forecast source');
        return getJSON(forecast.href);
      })
    ]);
    if (request !== weatherRequest) return;
    const [current, alerts, forecast] = results;
    if (current.status === 'fulfilled') {
      const p = current.value.properties || {};
      const temp = p.temperature && p.temperature.value;
      $('weather-current').replaceChildren(text('div', Number.isFinite(temp) ? Math.round(temp * 9 / 5 + 32) + '°F' : 'Temperature unavailable', 'temperature'), text('p', p.textDescription || 'Condition unavailable'), text('small', p.timestamp && Number.isFinite(Date.parse(p.timestamp)) ? 'Observed ' + new Date(p.timestamp).toLocaleString() : 'Observation time unavailable'));
    } else $('weather-current').textContent = 'Current conditions unavailable. Check NWS Buffalo.';
    if (alerts.status === 'fulfilled' && Array.isArray(alerts.value.features)) {
      const items = alerts.value.features.slice(0, 12);
      $('weather-alerts').replaceChildren();
      if (!items.length) $('weather-alerts').textContent = 'No active NWS alerts reported for Erie County.';
      items.forEach(item => {
        const p = item.properties || {};
        const card = document.createElement('div'); card.className = 'weather-item';
        card.append(text('strong', p.event || 'Weather alert'), text('p', p.headline || 'See NWS for details.'));
        $('weather-alerts').appendChild(card);
      });
    } else $('weather-alerts').textContent = 'Alerts unavailable. Check NWS for official updates.';
    if (forecast.status === 'fulfilled' && Array.isArray(forecast.value.properties?.periods) && forecast.value.properties.periods.length) {
      $('weather-forecast').replaceChildren();
      forecast.value.properties.periods.slice(0, 4).forEach(period => {
        const item = document.createElement('div'); item.className = 'weather-item';
        item.append(text('strong', (period.name || 'Forecast') + ' · ' + period.temperature + '°' + period.temperatureUnit), text('p', period.shortForecast || ''));
        $('weather-forecast').appendChild(item);
      });
    } else $('weather-forecast').textContent = 'Forecast unavailable. Check NWS Buffalo.';
    $('weather-status').textContent = results.every(r => r.status === 'fulfilled') ? 'NWS checked ' + new Date().toLocaleTimeString() : 'Some NWS information unavailable';
  }
  $('refresh-weather').addEventListener('click', loadWeather);
  setInterval(() => { if (!$('weather').hidden) loadWeather(); }, 300000);
  window.addEventListener('offline', () => {
    ++incidentRequest; ++weatherRequest;
    $('incident-status').textContent = 'Offline';
    emptyIncidents('Reconnect to check for current public summaries.');
    $('weather-status').textContent = 'Offline';
    ['weather-current', 'weather-alerts', 'weather-forecast'].forEach(id => { $(id).textContent = 'Reconnect to see current NWS information.'; });
  });

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event;
    $('install-help').textContent = 'Install the app on this device, or use your browser’s install menu.';
  });
  $('install').addEventListener('click', async () => {
    if (installPrompt) {
      const prompt = installPrompt; installPrompt = null;
      try { await prompt.prompt(); await prompt.userChoice; } catch (_) { /* Browser menu instructions remain available. */ }
    }
    $('install-help').textContent = 'On iPhone: open in Safari, tap Share, then Add to Home Screen. On Android: use your browser’s Install app or Add to Home screen menu.';
  });
  window.addEventListener('appinstalled', () => { installPrompt = null; $('install-help').textContent = 'App installed.'; });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigate();
})();
