(() => {
'use strict';

// ---------- Rhythm library ----------
// B = bass (center), S = slap (top edge), - = rest. `group` = steps per beat.
// Optional `bar` = steps per bar: each bar gets its own row and beat numbers restart at 1.
const LIBRARY = [
  { id: 'quarter',  name: '1 · Quarter notes',        group: 4, steps: 'B---S---B---S---' },
  { id: 'basic',    name: '2 · Basic rock beat',      group: 4, steps: 'B---S---B-B-S---' },
  { id: 'eighths',  name: '3 · Alternating eighths',  group: 4, steps: 'B-S-B-S-B-S-B-S-' },
  { id: 'funk',     name: '4 · Funk / pop groove',    group: 4, steps: 'B---S-B--B--S-S-' },
  { id: 'rumba',    name: '5 · Rumba (3-3-2 feel)',   group: 4, steps: 'B--S--B-S-B-S---' },
  { id: 'six8',     name: '6 · 6/8 groove',           group: 3, steps: 'B--S-S' },
  { id: 'buleria',  name: '7 · Bulerías (12 count)',  group: 3, steps: 'B--S--S-S-S-' },
  // Two bars of 2/4 in 16ths: surdo-style bass on each beat with a pickup, slaps fill the gaps.
  { id: 'samba',    name: '8 · Samba',                group: 4, bar: 8, steps: 'B-SBB-SSB-SBB-SS' },
  // Easier version: same two bars of 2/4, thinned to eighths (2 steps per beat), bass kept on every beat.
  { id: 'samba8',   name: '9 · Samba (8ths)',         group: 2, bar: 4, steps: 'BSBSBSBB' },
  // Bass on every beat, slaps on the bossa nova clave (3·6 | 10·13).
  { id: 'bossa',    name: '10 · Bossa nova',          group: 4, bar: 8, steps: 'B--SB-S-B-S-BS--' },
  // Same clave written in eighths over two bars of 4/4: same notes, half the speed at a given BPM.
  { id: 'bossa8',   name: '11 · Bossa nova (8ths)',   group: 2, bar: 8, steps: 'B--SB-S-B-S-BS--' },
];

const STORE_CUSTOM = 'cajon.custom.v1';
const STORE_SETTINGS = 'cajon.settings.v1';

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (_) { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) { /* storage unavailable */ }
  },
};

// ---------- State ----------
const settings = Object.assign({ bpm: 80, click: true, patSound: true, last: 'lib:basic' }, store.get(STORE_SETTINGS, {}));
let custom = store.get(STORE_CUSTOM, []);
let current = { key: '', name: '', group: 4, steps: [] };
let editing = false;
let playing = false;

function saveSettings() { store.set(STORE_SETTINGS, settings); }
function saveCustom() { store.set(STORE_CUSTOM, custom); }

// ---------- Audio ----------
let ctx = null;
const buffers = {};
let soundSource = 'synth';

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    buffers.B = synthBass(ctx);
    buffers.S = synthSlap(ctx);
    loadSamples();
  }
  if (ctx.state !== 'running') ctx.resume();
  return ctx;
}

function normalize(data, peak) {
  let m = 0;
  for (let i = 0; i < data.length; i++) m = Math.max(m, Math.abs(data[i]));
  if (m > 0) for (let i = 0; i < data.length; i++) data[i] *= peak / m;
}

function synthBass(c) {
  const sr = c.sampleRate, n = Math.floor(sr * 0.5);
  const buf = c.createBuffer(1, n, sr), d = buf.getChannelData(0);
  let phase = 0, lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    phase += 2 * Math.PI * (48 + 90 * Math.exp(-t * 28)) / sr;
    const tone = Math.sin(phase) * Math.exp(-t * 8) * (1 - Math.exp(-t * 1500));
    lp += 0.15 * ((Math.random() * 2 - 1) - lp);               // low-passed noise = wood thump
    d[i] = tone + lp * Math.exp(-t * 60) * 1.2;
  }
  normalize(d, 0.95);
  return buf;
}

function synthSlap(c) {
  const sr = c.sampleRate, n = Math.floor(sr * 0.25);
  const buf = c.createBuffer(1, n, sr), d = buf.getChannelData(0);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const noise = Math.random() * 2 - 1;
    const hp = noise - prev; prev = noise;                      // crude high-pass
    d[i] = hp * Math.exp(-t * 32) * 0.7
         + Math.sin(2 * Math.PI * 1900 * t) * Math.exp(-t * 70) * 0.35
         + Math.sin(2 * Math.PI * 320 * t) * Math.exp(-t * 45) * 0.25;
  }
  normalize(d, 0.9);
  return buf;
}

// Real samples: drop bass.ogg / slap.ogg (or .wav / .mp3) into /samples and they replace the synth sounds.
const SAMPLE_EXTS = ['ogg', 'wav', 'mp3'];

async function loadSample(name) {
  for (const ext of SAMPLE_EXTS) {
    try {
      const res = await fetch(`samples/${name}.${ext}`);
      if (!res.ok) continue;
      return await ctx.decodeAudioData(await res.arrayBuffer());
    } catch (_) { /* try next format */ }
  }
  return null;
}

async function loadSamples() {
  let loaded = 0;
  await Promise.all(['B', 'S'].map(async (k) => {
    const buf = await loadSample(k === 'B' ? 'bass' : 'slap');
    if (buf) { buffers[k] = buf; loaded++; }
  }));
  soundSource = loaded === 2 ? 'samples' : loaded === 1 ? 'mixed' : 'synth';
  updateStatus();
}

function updateStatus() {
  $('soundStatus').textContent = ctx ? `sounds: ${soundSource}` : 'tap to enable sound';
}

function playHit(kind, when) {
  const c = getCtx();
  const src = c.createBufferSource();
  src.buffer = buffers[kind];
  const g = c.createGain();
  g.gain.value = 1;
  src.connect(g).connect(c.destination);
  src.start(when || 0);
}

function playClick(accent, when) {
  const c = getCtx();
  const o = c.createOscillator(), g = c.createGain();
  o.frequency.value = accent ? 1600 : 1000;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(accent ? 0.35 : 0.2, when + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  o.connect(g).connect(c.destination);
  o.start(when);
  o.stop(when + 0.06);
}

// ---------- Scheduler ----------
const LOOKAHEAD = 0.12, TICK_MS = 25;
let timer = null, nextTime = 0, stepIdx = 0;
const visualQueue = [];

function scheduleStep(step, when) {
  const val = current.steps[step];
  if (settings.click && step % current.group === 0) playClick(step % (current.bar || current.steps.length) === 0, when);
  if (settings.patSound && val !== '-') playHit(val, when);
  visualQueue.push({ step, val, when });
}

function tick() {
  const c = getCtx();
  while (nextTime < c.currentTime + LOOKAHEAD) {
    if (stepIdx >= current.steps.length) stepIdx = 0;
    scheduleStep(stepIdx, nextTime);
    nextTime += 60 / settings.bpm / current.group;
    stepIdx = (stepIdx + 1) % current.steps.length;
  }
}

let wakeLock = null;
async function lockScreen(on) {
  try {
    if (on && navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    else if (wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (_) { /* not critical */ }
}

function start() {
  const c = getCtx();
  playing = true;
  stepIdx = 0;
  nextTime = c.currentTime + 0.06;
  timer = setInterval(tick, TICK_MS);
  tick();
  $('playBtn').classList.add('on');
  $('playBtn').textContent = '■';
  lockScreen(true);
}

function stop() {
  playing = false;
  clearInterval(timer);
  visualQueue.length = 0;
  $('playBtn').classList.remove('on');
  $('playBtn').textContent = '▶';
  clearNow();
  lockScreen(false);
}

// ---------- Visuals ----------
const pads = { B: document.querySelector('.pad.bass'), S: document.querySelector('.pad.slap') };
let nowCell = -1;

function clearNow() {
  document.querySelectorAll('.cell.now').forEach((el) => el.classList.remove('now'));
  nowCell = -1;
}

function flash(el, cls, ms) {
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

function frame() {
  if (ctx && visualQueue.length) {
    const t = ctx.currentTime;
    while (visualQueue.length && visualQueue[0].when <= t) {
      const ev = visualQueue.shift();
      const cells = $('grid').children;
      if (nowCell >= 0 && cells[nowCell]) cells[nowCell].classList.remove('now');
      nowCell = ev.step;
      if (cells[ev.step]) cells[ev.step].classList.add('now');
      if (ev.val !== '-') flash(pads[ev.val], 'cue', 130);
    }
  }
  requestAnimationFrame(frame);
}

function columns(n) { return n <= 8 ? n : Math.ceil(n / 2); }

function renderGrid() {
  const grid = $('grid');
  const n = current.steps.length;
  grid.style.gridTemplateColumns = `repeat(${current.bar || columns(n)}, 1fr)`;
  grid.classList.toggle('editing', editing);
  grid.classList.toggle('bars', !!current.bar);
  grid.innerHTML = '';
  current.steps.forEach((v, i) => {
    const cell = document.createElement('div');
    cell.className = 'cell' + (v !== '-' ? ' ' + v : '') + (i % current.group === 0 ? ' beat' : '');
    cell.textContent = v === '-' ? '·' : v;
    if (i % current.group === 0) {
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = (current.bar ? i % current.bar : i) / current.group + 1;
      cell.appendChild(num);
    }
    cell.addEventListener('pointerdown', () => onCellTap(i));
    grid.appendChild(cell);
  });
  nowCell = -1;
  $('hint').textContent = editing
    ? 'Tap a step to cycle: rest → B → S. Then Save.'
    : 'B = bass (center) · S = slap (top edge) · dot = rest';
}

function onCellTap(i) {
  if (!editing) return;
  const order = ['-', 'B', 'S'];
  const next = order[(order.indexOf(current.steps[i]) + 1) % 3];
  current.steps[i] = next;
  if (next !== '-') playHit(next);
  renderGrid();
}

// ---------- Pattern selection / editing ----------
function buildSelect() {
  const sel = $('patternSelect');
  sel.innerHTML = '';
  const g1 = document.createElement('optgroup');
  g1.label = 'Library';
  LIBRARY.forEach((p) => g1.appendChild(new Option(p.name, 'lib:' + p.id)));
  sel.appendChild(g1);
  if (custom.length) {
    const g2 = document.createElement('optgroup');
    g2.label = 'My rhythms';
    custom.forEach((p) => g2.appendChild(new Option(p.name, 'my:' + p.id)));
    sel.appendChild(g2);
  }
  sel.value = current.key;
}

function findPattern(key) {
  const [kind, id] = key.split(':');
  const list = kind === 'lib' ? LIBRARY : custom;
  const p = list.find((x) => x.id === id);
  return p ? { key, name: p.name, group: p.group, bar: p.bar, steps: p.steps.split('') } : null;
}

function selectPattern(key) {
  const p = findPattern(key) || findPattern('lib:basic');
  current = p;
  settings.last = p.key;
  saveSettings();
  $('patternSelect').value = p.key;
  $('deleteBtn').hidden = !p.key.startsWith('my:');
  renderGrid();
  renderStepButtons();
}

function renderStepButtons() {
  const box = $('stepsBtns');
  box.innerHTML = '';
  [6, 8, 12, 16].forEach((n) => {
    const b = document.createElement('button');
    b.textContent = n;
    b.className = current.steps.length === n ? 'on' : '';
    b.addEventListener('click', () => {
      const old = current.steps;
      current.steps = Array.from({ length: n }, (_, i) => old[i] || '-');
      current.group = n === 6 || n === 12 ? 3 : 4;
      delete current.bar;
      renderGrid();
      renderStepButtons();
    });
    box.appendChild(b);
  });
}

function setEditing(on) {
  editing = on;
  $('editBtn').setAttribute('aria-pressed', String(on));
  $('editBtn').textContent = on ? 'Done' : 'Edit';
  $('editTools').hidden = !on;
  renderGrid();
}

function saveCurrent() {
  const def = current.key.startsWith('my:') ? current.name : '';
  const name = (prompt('Name for this rhythm:', def) || '').trim();
  if (!name) return;
  const entry = { id: '', name, group: current.group, steps: current.steps.join('') };
  if (current.bar) entry.bar = current.bar;
  const existing = custom.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    entry.id = existing.id;
    delete existing.bar;
    Object.assign(existing, entry);
  } else {
    entry.id = Date.now().toString(36);
    custom.push(entry);
  }
  saveCustom();
  current.key = 'my:' + entry.id;
  current.name = name;
  buildSelect();
  selectPattern(current.key);
  setEditing(false);
}

function deleteCurrent() {
  if (!current.key.startsWith('my:') || !confirm(`Delete "${current.name}"?`)) return;
  const id = current.key.slice(3);
  custom = custom.filter((p) => p.id !== id);
  saveCustom();
  buildSelect();
  selectPattern('lib:basic');
  setEditing(false);
}

// ---------- Tempo ----------
function setBpm(v) {
  settings.bpm = Math.max(40, Math.min(220, Math.round(v)));
  $('bpmVal').textContent = settings.bpm;
  $('bpmRange').value = settings.bpm;
  saveSettings();
}

// ---------- Wiring ----------
function bindHold(btn, fn) {
  let rep = null, delay = null;
  const end = () => { clearTimeout(delay); clearInterval(rep); };
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    fn();
    delay = setTimeout(() => { rep = setInterval(fn, 80); }, 400);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, end));
}

function init() {
  buildSelect();
  selectPattern(settings.last);
  setBpm(settings.bpm);
  $('clickChk').checked = settings.click;
  $('soundChk').checked = settings.patSound;
  updateStatus();

  $('patternSelect').addEventListener('change', (e) => { selectPattern(e.target.value); });
  $('editBtn').addEventListener('click', () => setEditing(!editing));
  $('saveBtn').addEventListener('click', saveCurrent);
  $('deleteBtn').addEventListener('click', deleteCurrent);
  $('playBtn').addEventListener('click', () => (playing ? stop() : start()));
  bindHold($('bpmDown'), () => setBpm(settings.bpm - 1));
  bindHold($('bpmUp'), () => setBpm(settings.bpm + 1));
  $('bpmRange').addEventListener('input', (e) => setBpm(+e.target.value));
  $('clickChk').addEventListener('change', (e) => { settings.click = e.target.checked; saveSettings(); });
  $('soundChk').addEventListener('change', (e) => { settings.patSound = e.target.checked; saveSettings(); });

  Object.entries(pads).forEach(([kind, el]) => {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      playHit(kind);
      el.classList.add('hit');
      if (navigator.vibrate) navigator.vibrate(8);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) =>
      el.addEventListener(ev, () => el.classList.remove('hit')));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) stop();
    updateStatus();
  });

  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
})();
