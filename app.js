'use strict';

/* ================= Dane (zapis w telefonie) ================= */
const KEY = 'trening.v1';

function loadDb() {
  try {
    const db = JSON.parse(localStorage.getItem(KEY));
    if (db && Array.isArray(db.sessions)) return db;
  } catch (e) { /* uszkodzone dane – zaczynamy od zera */ }
  return { sessions: [] };
}
let db = loadDb();
function saveDb() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { alert('Nie udało się zapisać danych w telefonie.'); }
}

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtDate = (s) => { const [y, m, d] = s.split('-'); return `${d}.${m}.${y}`; };
const fmtShort = (s) => { const [, m, d] = s.split('-'); return `${d}.${m}`; };
const num = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const fmtNum = (n) => (Math.round(n * 10) / 10).toLocaleString('pl-PL');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const finished = () => db.sessions.filter((s) => s.finished)
  .sort((a, b) => a.date.localeCompare(b.date) || a.created - b.created);
const draft = () => db.sessions.find((s) => !s.finished);
const allExercises = () => Object.values(PLAN).flatMap((d) => d.blocks.flatMap((b) => b.ex));
const exById = (id) => allExercises().find((e) => e.id === id);

// Ostatni zakończony trening danego dnia (przed bieżącym)
function lastSessionOfDay(day, excludeId) {
  const list = finished().filter((s) => s.day === day && s.id !== excludeId);
  return list[list.length - 1] || null;
}
// Ostatnie wyniki danego ćwiczenia
function lastLog(exId, excludeId) {
  const list = finished().filter((s) => s.id !== excludeId && s.log[exId] && s.log[exId].some((x) => x.r !== null || x.w !== null));
  const s = list[list.length - 1];
  return s ? { date: s.date, sets: s.log[exId] } : null;
}

// Miara progresu: średni ciężar × suma powtórzeń (dla ćwiczeń bez ciężaru: suma powtórzeń)
function metric(ex, sets) {
  if (!sets) return null;
  const withReps = sets.filter((x) => x.r !== null && x.r > 0);
  if (!withReps.length) return null;
  const totalReps = withReps.reduce((a, x) => a + x.r, 0);
  if (ex.bw) return { value: totalReps, avgW: null, totalReps };
  const weights = withReps.filter((x) => x.w !== null && x.w > 0);
  if (!weights.length) return null;
  const avgW = weights.reduce((a, x) => a + x.w, 0) / weights.length;
  return { value: avgW * totalReps, avgW, totalReps };
}

/* ================= Nawigacja ================= */
const app = document.getElementById('app');
let state = { screen: 'home' };
function go(next) {
  state = next;
  render();
  window.scrollTo(0, 0);
}
function render() {
  ({ home: renderHome, setup: renderSetup, block: renderBlock, done: renderDone, progress: renderProgress })[state.screen]();
}

/* ================= Start ================= */
function renderHome() {
  releaseWakeLock();
  const d = draft();
  const last = finished().slice(-1)[0];
  app.innerHTML = `
    <header class="hero">
      <h1>Trening</h1>
      <p class="muted">${last ? `Ostatni trening: ${fmtDate(last.date)} · ${PLAN[last.day].name}` : 'Jeszcze bez historii – czas zacząć.'}</p>
    </header>
    ${d ? `
      <section class="card resume">
        <p><strong>Niedokończony trening</strong><br><span class="muted">${fmtDate(d.date)} · ${PLAN[d.day].name}</span></p>
        <div class="row">
          <button class="btn primary" data-act="resume">Dokończ</button>
          <button class="btn ghost" data-act="discard">Usuń</button>
        </div>
      </section>` : ''}
    <div class="big-actions">
      <button class="btn big primary" data-act="new">🏋️ Nowy trening</button>
      <button class="btn big" data-act="progress">📈 Analiza progresu</button>
    </div>
    <details class="card backup">
      <summary>Kopia zapasowa</summary>
      <p class="muted small">Historia jest zapisana tylko w tym telefonie. Co jakiś czas zapisz kopię (np. wyślij ją sobie mailem).</p>
      <div class="row">
        <button class="btn" data-act="export">Zapisz kopię</button>
        <label class="btn">Wczytaj kopię<input type="file" accept=".json,application/json" hidden id="importFile"></label>
      </div>
    </details>`;
  app.onclick = (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'new') {
      if (d && !confirm('Masz niedokończony trening. Zacząć nowy i usunąć tamten?')) return;
      if (d) { db.sessions = db.sessions.filter((s) => s !== d); saveDb(); }
      go({ screen: 'setup', date: todayStr(), day: null, sets: 3 });
    }
    if (act === 'resume') go({ screen: 'block', id: d.id, idx: d.blockIndex || 0 });
    if (act === 'discard' && confirm('Usunąć niedokończony trening?')) {
      db.sessions = db.sessions.filter((s) => s !== d); saveDb(); render();
    }
    if (act === 'progress') go({ screen: 'progress' });
    if (act === 'export') exportBackup();
  };
  document.getElementById('importFile').onchange = importBackup;
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `trening-kopia-${todayStr()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  file.text().then((txt) => {
    const data = JSON.parse(txt);
    if (!data || !Array.isArray(data.sessions)) throw new Error('format');
    if (!confirm(`Wczytać kopię (${data.sessions.length} treningów)? Obecna historia zostanie zastąpiona.`)) return;
    db = data; saveDb(); render();
    alert('Kopia wczytana.');
  }).catch(() => alert('To nie jest poprawny plik kopii.'));
}

/* ================= Ustawienia treningu ================= */
function renderSetup() {
  const s = state;
  const last = s.day ? lastSessionOfDay(s.day) : null;
  app.innerHTML = `
    <div class="topbar"><button class="btn ghost" data-act="back">← Wróć</button><span>Nowy trening</span></div>
    <section class="card">
      <label class="field"><span>Data treningu</span><input type="date" id="date" value="${s.date}" max="${todayStr()}"></label>
    </section>
    <section class="card">
      <span class="label">Który trening?</span>
      <div class="seg">
        ${[1, 2].map((d) => `<button class="seg-btn ${s.day === d ? 'on' : ''}" data-day="${d}">${PLAN[d].name}<small>${PLAN[d].blocks.length} bloków</small></button>`).join('')}
      </div>
    </section>
    ${s.day ? `
    <section class="card">
      <span class="label">Ile serii dzisiaj?</span>
      <p class="muted small">${last ? `Ostatnio (${fmtDate(last.date)}): <strong>${last.sets} ${last.sets === 1 ? 'seria' : last.sets < 5 ? 'serie' : 'serii'}</strong>` : 'To będzie pierwszy taki trening. Plan zakłada 3 serie.'}</p>
      <div class="stepper">
        <button class="btn round" data-act="minus" aria-label="Mniej serii">−</button>
        <output id="sets">${s.sets}</output>
        <button class="btn round" data-act="plus" aria-label="Więcej serii">+</button>
      </div>
    </section>
    <button class="btn big primary" data-act="start">Zaczynamy →</button>` : ''}`;
  document.getElementById('date').onchange = (e) => { s.date = e.target.value; };
  app.onclick = (e) => {
    const t = e.target.closest('[data-act],[data-day]');
    if (!t) return;
    if (t.dataset.day) {
      s.day = +t.dataset.day;
      const l = lastSessionOfDay(s.day);
      s.sets = l ? l.sets : 3;
      renderSetup();
    }
    const act = t.dataset.act;
    if (act === 'back') go({ screen: 'home' });
    if (act === 'minus' && s.sets > 1) { s.sets--; document.getElementById('sets').textContent = s.sets; }
    if (act === 'plus' && s.sets < 8) { s.sets++; document.getElementById('sets').textContent = s.sets; }
    if (act === 'start') {
      if (!s.date) { alert('Wpisz datę treningu.'); return; }
      startSession(s);
    }
  };
}

function startSession({ date, day, sets }) {
  const id = 's' + Date.now();
  const log = {};
  PLAN[day].blocks.forEach((b) => b.ex.forEach((ex) => {
    const prev = lastLog(ex.id);
    log[ex.id] = Array.from({ length: sets }, (_, i) => {
      const p = prev ? (prev.sets[i] || prev.sets[prev.sets.length - 1]) : null;
      const planReps = /^\d+$/.test(ex.reps) ? +ex.reps : null;
      return { w: ex.bw ? null : (p ? p.w : null), r: p && p.r !== null ? p.r : planReps, done: false };
    });
  }));
  db.sessions.push({ id, created: Date.now(), date, day, sets, log, blockIndex: 0, finished: false });
  saveDb();
  unlockAudio();
  go({ screen: 'block', id, idx: 0 });
}

/* ================= Para ćwiczeń ================= */
function renderBlock() {
  requestWakeLock();
  const sess = db.sessions.find((s) => s.id === state.id);
  if (!sess) { go({ screen: 'home' }); return; }
  const blocks = PLAN[sess.day].blocks;
  const idx = state.idx;
  const block = blocks[idx];
  sess.blockIndex = idx; saveDb();
  const isLast = idx === blocks.length - 1;
  const lasts = Object.fromEntries(block.ex.map((ex) => [ex.id, lastLog(ex.id, sess.id)]));

  const exCard = (ex) => `
    <article class="ex">
      <div class="ex-imgs">${ex.img.map((src) => `<img src="${src}" alt="${esc(ex.pl)}" loading="lazy">`).join('')}</div>
      <div class="ex-body">
        <span class="tag">${block.id}${block.ex.length > 1 ? block.ex.indexOf(ex) + 1 : ''}</span>
        <h3>${esc(ex.pl)}</h3>
        <p class="muted small">${esc(ex.en)}</p>
        <p class="small plan">Plan: <strong>${ex.sets}×${ex.reps}</strong> · tempo ${ex.tempo} · przerwa ${ex.rest} s</p>
        <p class="small last">${lasts[ex.id] ? `Ostatnio (${fmtShort(lasts[ex.id].date)}): ${lasts[ex.id].sets.map((x) => setTxt(ex, x)).join(', ')}` : 'Ostatnio: brak – pierwszy raz'}</p>
      </div>
    </article>`;

  const setRow = (ex, i) => {
    const v = sess.log[ex.id][i];
    const prev = lasts[ex.id] ? lasts[ex.id].sets[i] : null;
    return `
      <div class="set ${v.done ? 'done' : ''}" data-ex="${ex.id}" data-i="${i}">
        <span class="set-name">${block.id}${block.ex.length > 1 ? block.ex.indexOf(ex) + 1 : ''}</span>
        ${ex.bw ? '<span class="bw">bez ciężaru</span>' : `
        <label class="inp"><input type="text" inputmode="decimal" data-f="w" value="${v.w === null ? '' : String(v.w).replace('.', ',')}" placeholder="${prev && prev.w !== null ? fmtNum(prev.w) : '–'}" aria-label="Ciężar, seria ${i + 1}"><span>kg</span></label>`}
        <label class="inp"><input type="text" inputmode="numeric" data-f="r" value="${v.r ?? ''}" placeholder="${prev && prev.r !== null ? prev.r : '–'}" aria-label="Powtórzenia, seria ${i + 1}"><span>powt.</span></label>
        <button class="check" data-act="check" aria-label="Seria zrobiona">${v.done ? '✓' : '○'}</button>
      </div>`;
  };

  app.innerHTML = `
    <div class="topbar">
      <button class="btn ghost" data-act="prev">${idx === 0 ? '← Start' : '← Wstecz'}</button>
      <span>${PLAN[sess.day].name} · ${fmtDate(sess.date)}</span>
    </div>
    <div class="progressbar" aria-label="Postęp treningu"><i style="width:${(idx / blocks.length) * 100}%"></i></div>
    <p class="muted small center">Blok ${block.id} · ${idx + 1} z ${blocks.length} · ${block.ex.length > 1 ? 'para – ćwiczenia naprzemiennie' : 'pojedyncze ćwiczenie'}</p>
    ${block.ex.map(exCard).join('')}
    <section class="sets">
      ${Array.from({ length: sess.sets }, (_, i) => `
        <div class="round-box">
          <h4>Seria ${i + 1}</h4>
          ${block.ex.map((ex) => setRow(ex, i)).join('')}
        </div>`).join('')}
    </section>
    <button class="btn big primary" data-act="next">${isLast ? 'Zakończ trening 🎉' : 'Następna para →'}</button>`;

  app.oninput = (e) => {
    const inp = e.target.closest('input[data-f]');
    if (!inp) return;
    const row = inp.closest('.set');
    sess.log[row.dataset.ex][+row.dataset.i][inp.dataset.f] = num(inp.value);
    saveDb();
  };
  app.onclick = (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    if (act === 'check') {
      unlockAudio();
      const row = t.closest('.set');
      const ex = exById(row.dataset.ex);
      const v = sess.log[ex.id][+row.dataset.i];
      v.done = !v.done;
      saveDb();
      row.classList.toggle('done', v.done);
      t.textContent = v.done ? '✓' : '○';
      if (v.done) startRest(ex.rest, ex.pl);
    }
    if (act === 'prev') {
      if (idx === 0) go({ screen: 'home' }); else go({ screen: 'block', id: sess.id, idx: idx - 1 });
    }
    if (act === 'next') {
      const empty = block.ex.some((ex) => sess.log[ex.id].some((x) => x.r === null || (!ex.bw && x.w === null)));
      if (empty && !confirm('Nie wszystkie okienka są uzupełnione. Przejść dalej?')) return;
      stopRest();
      if (isLast) finishSession(sess);
      else go({ screen: 'block', id: sess.id, idx: idx + 1 });
    }
  };
}
const setTxt = (ex, x) => ex.bw ? `${x.r ?? '–'}` : `${x.w !== null ? fmtNum(x.w) : '–'}×${x.r ?? '–'}`;

function finishSession(sess) {
  sess.finished = true;
  delete sess.blockIndex;
  saveDb();
  go({ screen: 'done', id: sess.id });
}

/* ================= Koniec ================= */
function renderDone() {
  releaseWakeLock();
  const sess = db.sessions.find((s) => s.id === state.id);
  const exs = PLAN[sess.day].blocks.flatMap((b) => b.ex);
  let volume = 0, better = 0, compared = 0;
  exs.forEach((ex) => {
    sess.log[ex.id].forEach((x) => { if (!ex.bw && x.w && x.r) volume += x.w * x.r; });
    const now = metric(ex, sess.log[ex.id]);
    const prev = lastLog(ex.id, sess.id);
    const before = prev ? metric(ex, prev.sets) : null;
    if (now && before) { compared++; if (now.value > before.value) better++; }
  });
  const totalSessions = finished().length;
  app.innerHTML = `
    <div class="done-screen">
      <div class="trophy" aria-hidden="true">🏆</div>
      <h1>Brawo, trening zrobiony!</h1>
      <p class="muted">${PLAN[sess.day].name} · ${fmtDate(sess.date)}</p>
      <div class="stats">
        <div><strong>${fmtNum(volume)} kg</strong><span>łącznie podniesione</span></div>
        <div><strong>${compared ? `${better}/${compared}` : '–'}</strong><span>ćwiczeń lepiej niż ostatnio</span></div>
        <div><strong>${totalSessions}</strong><span>${totalSessions === 1 ? 'trening' : 'treningów'} w historii</span></div>
      </div>
      <button class="btn big primary" data-act="home">Na start</button>
    </div>`;
  confetti();
  celebrateSound();
  app.onclick = (e) => { if (e.target.closest('[data-act="home"]')) go({ screen: 'home' }); };
}

function confetti() {
  const colors = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6'];
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < 80; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = Math.random() * 0.8 + 's';
    p.style.animationDuration = 2 + Math.random() * 1.5 + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 4000);
}

/* ================= Minutnik przerwy (dźwięk + wibracja) ================= */
let audioCtx = null;
function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { /* brak dźwięku */ }
}
// Planuje sygnał z wyprzedzeniem w zegarze dźwięku – zagra nawet gdy przeglądarka spowolni liczniki.
function scheduleBeeps(delaySec, pattern) {
  if (!audioCtx) return [];
  const nodes = [];
  const t0 = audioCtx.currentTime + Math.max(0, delaySec);
  pattern.forEach(([offset, freq, len]) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + offset);
    gain.gain.exponentialRampToValueAtTime(0.5, t0 + offset + 0.01);
    gain.gain.setValueAtTime(0.5, t0 + offset + len - 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + len);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0 + offset);
    osc.stop(t0 + offset + len + 0.02);
    nodes.push(osc);
  });
  return nodes;
}
const END_BEEP = [[0, 880, 0.25], [0.4, 880, 0.25], [0.8, 1320, 0.6]];
const WARN_BEEP = [[0, 660, 0.12]];

let rest = null;
function startRest(seconds, name) {
  stopRest();
  const bar = document.createElement('div');
  bar.className = 'restbar';
  bar.innerHTML = `
    <div class="rest-info"><span class="small">Przerwa po: ${esc(name)}</span><strong id="restTime"></strong></div>
    <div class="rest-track"><i id="restFill"></i></div>
    <div class="row">
      <button class="btn" data-r="add">+15 s</button>
      <button class="btn" data-r="skip">Pomiń</button>
    </div>`;
  document.body.appendChild(bar);
  rest = { bar, total: seconds, end: Date.now() + seconds * 1000, nodes: [], timer: null, rang: false };
  arm();
  bar.onclick = (e) => {
    const r = e.target.closest('[data-r]')?.dataset.r;
    if (r === 'skip') stopRest();
    if (r === 'add') { rest.end += 15000; rest.total += 15; arm(); }
  };
  tick();
  rest.timer = setInterval(tick, 250);
}
function arm() {
  rest.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* już zatrzymany */ } });
  const left = (rest.end - Date.now()) / 1000;
  rest.nodes = [
    ...(left > 6 ? scheduleBeeps(left - 3, WARN_BEEP) : []),
    ...scheduleBeeps(left, END_BEEP),
  ];
  rest.rang = false;
}
function tick() {
  if (!rest) return;
  const left = Math.max(0, Math.ceil((rest.end - Date.now()) / 1000));
  const t = document.getElementById('restTime');
  if (t) t.textContent = left > 0 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Do roboty! 💪';
  const f = document.getElementById('restFill');
  if (f) f.style.width = `${(1 - (rest.end - Date.now()) / (rest.total * 1000)) * 100}%`;
  if (left === 0 && !rest.rang) {
    rest.rang = true;
    if (!audioCtx || audioCtx.state !== 'running') { unlockAudio(); scheduleBeeps(0, END_BEEP); }
    if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 600]);
    rest.bar.classList.add('ring');
    setTimeout(stopRest, 4000);
  }
}
function stopRest() {
  if (!rest) return;
  clearInterval(rest.timer);
  if (!rest.rang) rest.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* już zatrzymany */ } });
  rest.bar.remove();
  rest = null;
}
function celebrateSound() {
  unlockAudio();
  scheduleBeeps(0.1, [[0, 523, 0.15], [0.15, 659, 0.15], [0.3, 784, 0.15], [0.45, 1047, 0.5]]);
}

// Ekran nie gaśnie w trakcie treningu (żeby minutnik i dźwięk działały)
let wakeLock = null;
async function requestWakeLock() {
  try { if ('wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen'); wakeLock?.addEventListener('release', () => { wakeLock = null; }); }
  catch (e) { /* niedostępne */ }
}
function releaseWakeLock() { if (wakeLock) { wakeLock.release(); wakeLock = null; } }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (state.screen === 'block') requestWakeLock();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    tick();
  }
});

/* ================= Analiza progresu ================= */
function renderProgress() {
  const fin = finished();
  if (!state.from) {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    const threeMonths = d.toISOString().slice(0, 10);
    state.from = fin.length && fin[0].date > threeMonths ? fin[0].date : threeMonths;
    state.to = todayStr();
  }
  const inRange = fin.filter((s) => s.date >= state.from && s.date <= state.to);

  const blockCard = (day, block) => {
    const groups = [block.ex.filter((e) => !e.bw), block.ex.filter((e) => e.bw)].filter((g) => g.length);
    const charts = groups.map((exs) => {
      const series = exs.map((ex) => ({
        ex,
        pts: inRange.filter((s) => s.day === day && s.log[ex.id])
          .map((s) => ({ date: s.date, m: metric(ex, s.log[ex.id]), sets: s.log[ex.id] }))
          .filter((p) => p.m),
      }));
      return chartHtml(series, exs[0].bw ? 'powt.' : 'kg × powt.');
    }).join('');
    return `
      <section class="card chart-card">
        <h3>${block.id} · ${block.ex.map((e) => esc(e.pl)).join(' + ')}</h3>
        ${charts}
      </section>`;
  };

  app.innerHTML = `
    <div class="topbar"><button class="btn ghost" data-act="back">← Start</button><span>Analiza progresu</span></div>
    <section class="card range">
      <label class="field"><span>Od</span><input type="date" id="from" value="${state.from}"></label>
      <label class="field"><span>Do</span><input type="date" id="to" value="${state.to}"></label>
    </section>
    <p class="muted small explain">Wykres pokazuje <strong>średni ciężar × liczbę wszystkich powtórzeń</strong> z treningu. Rośnie, gdy dokładasz ciężaru, powtórzeń albo serii. Dotknij wykresu, żeby zobaczyć szczegóły.</p>
    ${inRange.length ? '' : '<p class="card muted center">Brak treningów w tym zakresie dat.</p>'}
    ${[1, 2].map((day) => `
      <h2>${PLAN[day].name}</h2>
      ${PLAN[day].blocks.map((b) => blockCard(day, b)).join('')}`).join('')}
    <details class="card history">
      <summary>Historia treningów (${fin.length})</summary>
      ${fin.slice().reverse().map((s) => `
        <div class="hist-row"><span>${fmtDate(s.date)} · ${PLAN[s.day].name} · ${s.sets} serie</span>
        <button class="btn ghost small" data-del="${s.id}">Usuń</button></div>`).join('') || '<p class="muted">Pusto.</p>'}
    </details>`;

  document.getElementById('from').onchange = (e) => { state.from = e.target.value; renderProgress(); };
  document.getElementById('to').onchange = (e) => { state.to = e.target.value; renderProgress(); };
  app.onclick = (e) => {
    if (e.target.closest('[data-act="back"]')) go({ screen: 'home' });
    const del = e.target.closest('[data-del]');
    if (del) {
      const s = db.sessions.find((x) => x.id === del.dataset.del);
      if (s && confirm(`Usunąć trening z ${fmtDate(s.date)}? Tego nie da się cofnąć.`)) {
        db.sessions = db.sessions.filter((x) => x !== s); saveDb(); renderProgress();
      }
    }
  };
  app.querySelectorAll('.chart').forEach(attachTooltip);
}

const SERIES_CLASS = ['s1', 's2'];
function chartHtml(series, unit) {
  const all = series.flatMap((s) => s.pts);
  const legend = series.length > 1 ? `<div class="legend">${series.map((s, i) => `<span><i class="sw ${SERIES_CLASS[i]}"></i>${esc(s.ex.pl)}</span>`).join('')}</div>` : '';
  if (!all.length) return `${legend}<p class="muted small empty">Brak danych w wybranym zakresie.</p>`;

  const W = 340, H = 200, L = 44, R = 12, T = 24, B = 26;
  const dates = [...new Set(all.map((p) => p.date))].sort();
  const t = (d) => new Date(d + 'T12:00:00').getTime();
  const t0 = t(dates[0]), t1 = t(dates[dates.length - 1]);
  const x = (d) => (t1 === t0 ? L + (W - L - R) / 2 : L + ((t(d) - t0) / (t1 - t0)) * (W - L - R));
  const maxV = Math.max(...all.map((p) => p.m.value));
  const minV = Math.min(...all.map((p) => p.m.value));
  const { lo, hi, step } = niceScale(minV, maxV);
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);

  let grid = '';
  for (let v = lo; v <= hi + step / 2; v += step) {
    grid += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${fmtNum(v)}</text>`;
  }
  const xTicks = pickTicks(dates, 4).map((d) => `<text class="axis" x="${x(d)}" y="${H - 6}" text-anchor="middle">${fmtShort(d)}</text>`).join('');
  const lines = series.map((s, i) => {
    if (!s.pts.length) return '';
    const path = s.pts.map((p, j) => `${j ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.m.value).toFixed(1)}`).join('');
    const dots = s.pts.map((p) => `<circle class="dot ${SERIES_CLASS[i]}" cx="${x(p.date)}" cy="${y(p.m.value)}" r="4"/>`).join('');
    return `<path class="line ${SERIES_CLASS[i]}" d="${path}"/>${dots}`;
  }).join('');

  const data = { dates, xs: dates.map(x), unit, series: series.map((s) => ({ name: s.ex.pl, bw: !!s.ex.bw, pts: Object.fromEntries(s.pts.map((p) => [p.date, { v: p.m.value, avgW: p.m.avgW, reps: p.m.totalReps, sets: p.sets }])) })) };
  const table = `<details class="table-view"><summary>Pokaż jako tabelę</summary><table>
    <thead><tr><th>Data</th>${series.map((s) => `<th>${esc(s.ex.pl)}</th>`).join('')}</tr></thead>
    <tbody>${dates.map((d) => `<tr><td>${fmtShort(d)}</td>${data.series.map((s) => `<td>${s.pts[d] ? fmtNum(s.pts[d].v) : '–'}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;

  return `${legend}
    <div class="chart" data-chart='${esc(JSON.stringify(data))}'>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Wykres progresu, jednostka ${unit}">
        <text class="axis unit" x="0" y="10">${unit}</text>
        ${grid}${xTicks}
        <line class="cross" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/>
        ${lines}
      </svg>
      <div class="tip" hidden></div>
    </div>${table}`;
}
function niceScale(min, max) {
  if (min === max) { min = min * 0.8; max = max * 1.2 || 1; }
  const pad = (max - min) * 0.1;
  min = Math.max(0, min - pad); max += pad;
  const raw = (max - min) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  return { lo: Math.floor(min / step) * step, hi: Math.ceil(max / step) * step, step };
}
function pickTicks(dates, n) {
  if (dates.length <= n) return dates;
  const out = [];
  for (let i = 0; i < n; i++) out.push(dates[Math.round((i * (dates.length - 1)) / (n - 1))]);
  return [...new Set(out)];
}
function attachTooltip(el) {
  const data = JSON.parse(el.dataset.chart);
  const svg = el.querySelector('svg');
  const tip = el.querySelector('.tip');
  const cross = el.querySelector('.cross');
  const show = (ev) => {
    const r = svg.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * 340;
    let best = 0;
    data.xs.forEach((xv, i) => { if (Math.abs(xv - px) < Math.abs(data.xs[best] - px)) best = i; });
    const d = data.dates[best];
    cross.setAttribute('x1', data.xs[best]); cross.setAttribute('x2', data.xs[best]);
    cross.setAttribute('visibility', 'visible');
    tip.innerHTML = `<strong>${fmtDate(d)}</strong>` + data.series.map((s, i) => {
      const p = s.pts[d];
      if (!p) return `<div><i class="sw ${SERIES_CLASS[i]}"></i>${esc(s.name)}: –</div>`;
      const detail = s.bw ? `${p.reps} powt.` : `${fmtNum(p.avgW)} kg śr. × ${p.reps} powt.`;
      return `<div><i class="sw ${SERIES_CLASS[i]}"></i>${esc(s.name)}<br><b>${fmtNum(p.v)}</b> <span class="muted">(${detail})</span></div>`;
    }).join('');
    tip.hidden = false;
    const left = (data.xs[best] / 340) * r.width;
    tip.style.left = Math.min(Math.max(left - tip.offsetWidth / 2, 0), r.width - tip.offsetWidth) + 'px';
  };
  el.addEventListener('pointerdown', show);
  el.addEventListener('pointermove', (ev) => { if (ev.pointerType === 'mouse' || ev.buttons) show(ev); });
  el.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse') { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); } });
}

/* ================= Start aplikacji ================= */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
render();
