const form = document.querySelector('#search-form');
const query = document.querySelector('#query');
const status = document.querySelector('#status');
const sound = document.querySelector('#sound');
const map = L.map('map', { zoomControl: false }).setView([0, 0], 2);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
const icon = L.divIcon({
  className: '', html: '<div class="pin"></div>',
  iconSize: [34, 34], iconAnchor: [17, 34]
});
let marker;
let requestId = 0;
function show(id, value) {
  document.getElementById(id).textContent = value || '--';
}
async function track(value = '') {
  const current = ++requestId;
  status.textContent = 'Searching...';
  try {
    const url = 'https://ipapi.co/' + (value ? encodeURIComponent(value) + '/' : '') + 'json/';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Request failed');
    const data = await response.json();
    if (data.error) throw new Error('Invalid address');
    if (current !== requestId) return;
    show('ip', data.ip);
    show('location', [data.city, data.region, data.postal]
      .filter(Boolean).join(', '));
    show('timezone', 'UTC ' + (data.utc_offset ? data.utc_offset.replace(/([+-]\d{2})(\d{2})/, '$1:$2') : '--'));
    show('isp', data.org);
    const point = [data.latitude, data.longitude];
    if (marker) marker.setLatLng(point);
    else marker = L.marker(point, { icon }).addTo(map);
    map.setView(point, 13);
    if (innerWidth <= 768) map.panBy([0, -85]);
    status.textContent = '';
  } catch (error) {
    if (current === requestId) {
      status.textContent = 'Lookup failed. Check IP or API access.';
    }
  }
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  let value = query.value.trim();
  if (!value) return track();
  // Resolve domain names using DNS over HTTPS.
  if (/[a-z]/i.test(value) && !value.includes(':')) {
    const current = ++requestId;
    status.textContent = 'Resolving domain...';
    try {
      const url = 'https://dns.google/resolve?type=A&name=';
      const response = await fetch(url + encodeURIComponent(value));
      if (!response.ok) throw new Error('DNS failed');
      const data = await response.json();
      const answer = data.Answer?.find(item => item.type === 1);
      if (!answer) throw new Error('Domain not found');
      if (current !== requestId) return;
      value = answer.data;
    } catch (error) {
      if (current === requestId) status.textContent = 'Domain not found.';
      return;
    }
  }
  track(value);
});
let audio;
let enabled = false;
sound.addEventListener('click', async () => {
  try {
 audio ||= new AudioContext();
    await audio.resume();
    enabled = !enabled;
    sound.textContent = enabled ? 'Sound: on' : 'Sound: off';
    sound.setAttribute('aria-pressed', String(enabled));
  } catch (error) { status.textContent = 'Audio unavailable.'; }
});
function tick() {
  if (!enabled || !audio || audio.state !== 'running') return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  oscillator.frequency.setValueAtTime(950, now);
  oscillator.frequency.exponentialRampToValueAtTime(450, now + .04);
  gain.gain.setValueAtTime(.035, now);
  gain.gain.exponentialRampToValueAtTime(.001, now + .05);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + .055);
}
document.querySelectorAll('h1, h2, article p, form button')
  .forEach(element => element.addEventListener('mouseenter', tick));
track();