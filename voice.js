/* NegosyoPlan — Voice to Text (English, Filipino or Hiligaynon). Needs internet.
   1. Per field: every box has a small microphone. Tap it, answer, and the answer is written into that box.
   2. "Voice to Text" button: NegosyoPlan asks the questions of the page one by one; each answer is written
      into its box right away (edit, redo, skip or go back anytime).
   3. "Say everything at once" (inside step 2): one recording for the whole page, reviewed before saving.
   Audio → Apps Script → OpenAI (speech to text, then the answer is shaped for the field). */
(function (G) {
  'use strict';
  const A = () => G.GrowApp, S = () => A().S, API = () => G.GrowAPI, Store = () => G.GrowStore;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => G.GrowDocs.esc(s);
  const t = (s) => G.I18N.t(s);
  const MAX_SEC = 180;

  const supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && G.MediaRecorder);

  /* -------------------------------------------------- button shown on Passport, Plan and Finance pages */
  function button() {
    if (!supported()) return '';
    return `<button type="button" class="btn voice-btn" data-act="voiceAsk" title="${t('NegosyoPlan asks the questions one by one and writes your answers')}">
      <span class="vb-ic">${A().ic('mic')}</span><span>${t('Voice to Text')}</span>${unlocked() ? '' : `<span class="lock-badge" title="${t('Locked')}">${A().ic('lock')}</span>`}</button>`;
  }

  /* -------------------------------------------------- tips per page (what to say) */
  function tips() {
    const h = location.hash;
    if (/passport\/owner|passport$/.test(h)) return 'My name is Liza Santos Dela Peña, born May 14, 1980, married. I live in Poblacion, Zarraga, Iloilo. My number is 0917… I have run my eatery for 9 years.';
    if (/passport\/business/.test(h)) return 'My business is Nanay Liza\'s Batchoy House in the public market, started in 2015. It is a service business, single proprietorship, with 1 male and 1 female employee. Capital is 120,000 and yearly sales about 489,000.';
    if (/passport\/trainings/.test(h)) return 'I attended Basic Entrepreneurship Training by the LEDIP Center in March 2024, 16 hours, about business planning and bookkeeping.';
    if (/passport\/needs/.test(h)) return 'I want to learn digital marketing and costing and pricing.';
    if (/plan\/2/.test(h)) return 'We sell batchoy at 55 pesos per bowl, about 25 bowls a day, and puto at 6 pesos, 20 pieces a day. Our customers are market vendors, students and families near the market.';
    if (/plan\/5/.test(h)) return 'For batchoy, one batch costs 650 for materials, 300 for labor and 100 for gas, and makes 25 bowls. Stall rent is 2,000 a month and electricity 1,000.';
    if (/plan\/6/.test(h)) return 'I have 15,000 cash now. I expect sales to grow 1 percent a month. I take 6,000 a month for the household.';
    if (/plan\/7/.test(h)) return 'I will buy a chest freezer for 18,000 and 4 tables at 2,000 each using the loan. I am applying for 50,000 for equipment and working capital.';
    if (/plan\/9/.test(h)) return 'Prices of pork may go up, so I will buy from two suppliers. A typhoon may flood the market, so I keep stock in a high place.';
    if (/plan/.test(h)) return 'Describe this step in your own words — for example what you sell, who buys, how you promote, how you operate.';
    if (/finance/.test(h)) return 'Last year our sales were 489,600. Purchases were 279,000. Salaries 108,000, rent 24,000, electricity and water 12,240. We have 38,000 cash.';
    return 'Describe your business in your own words.';
  }

  /* -------------------------------------------------- read the fields on the current page */
  function labelOf(fld) {
    const l = fld && fld.querySelector(':scope > label');
    if (!l) return '';
    const c = l.cloneNode(true); $$('.req,.opt', c).forEach((x) => x.remove());
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  function collect() {
    const main = $('#main'); const fields = [], seen = {}, tables = [];
    let heading = (main.querySelector('h1') || {}).textContent || '';
    let section = '', heading2 = '';
    const nodes = $$('.form-card h2, .form-card h3, .sub-head b, .form-card [data-bind], .form-card [data-arr], .form-card .table-ed[data-cols], .form-card [data-voice-table]', main);
    nodes.forEach((el) => {
      if (/^H[23]$/.test(el.tagName)) { heading2 = el.textContent.replace(/\s+/g, ' ').trim(); return; }
      if (el.matches('.sub-head b')) { section = el.textContent.replace(/\s+/g, ' ').trim(); return; }
      if (el.matches('.table-ed[data-cols], [data-voice-table]')) {
        let cols = []; try { cols = JSON.parse(el.dataset.cols); } catch (e) { /* ignore */ }
        tables.push({ path: el.dataset.path || el.dataset.voiceTable, label: heading2 || el.dataset.label || '', columns: cols, tpl: el.dataset.tpl });
        return;
      }
      const path = el.dataset.bind || el.dataset.arr;
      if (!path || seen[path] || /certificateDocId$/.test(path)) return;
      if (el.closest('.table-ed')) {
        // existing row of a list: label = column, section = list + row
        const row = el.closest('.trow'); const first = row && row.querySelector('input[data-bind]');
        seen[path] = 1;
        fields.push({ path, label: el.getAttribute('aria-label') || '', group: heading2 + ' — row ' + (row ? row.querySelector('.rnum').textContent : '') + (first && first.value ? ' (' + first.value + ')' : ''), type: typeOf(el), options: optionsOf(el) });
        return;
      }
      const fld = el.closest('.fld'); seen[path] = 1;
      const sub = el.closest('.sub-card');
      fields.push({ path, label: labelOf(fld) || el.getAttribute('aria-label') || path, group: sub ? section : '', type: typeOf(el), options: optionsOf(el) });
    });
    const extra = ['.years .year.on', '.tabs .on', '.stepper li.on em'].map((q) => { const e = main.querySelector(q); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }).filter(Boolean);
    return { page: [heading.replace(/\s+/g, ' ').trim()].concat(extra).join(' — '), fields, tables };
  }
  function typeOf(el) {
    if (el.dataset.arr) return 'multi';
    if (el.type === 'radio' || el.tagName === 'SELECT') return 'choice';
    if (el.type === 'date') return 'date';
    if (el.tagName === 'TEXTAREA') return 'text';
    const pre = el.closest('.affix') && el.closest('.affix').querySelector('.pre');
    if ((pre && pre.textContent === '₱') || el.dataset.num || el.inputMode === 'decimal' || el.inputMode === 'numeric') return 'number';
    return 'short text';
  }
  function optionsOf(el) {
    if (el.dataset.arr) return $$(`[data-arr="${el.dataset.arr}"]`).map((x) => x.value);
    if (el.type === 'radio') return $$(`input[type=radio][data-bind="${el.dataset.bind}"]`).map((x) => x.value + '=' + x.nextElementSibling.textContent.trim()).filter((x) => x.charAt(0) !== '=');
    if (el.tagName === 'SELECT') return Array.from(el.options).filter((o) => o.value).map((o) => o.value + '=' + o.textContent.trim());
    return [];
  }

  /* -------------------------------------------------- consent */
  function hasConsent() { const c = S().profile.consent; return !!(c && c.voice); }
  function askConsent(then) {
    A().modal(`<h2>${A().ic('mic')} ${t('Voice to Text')}</h2>
      <p>Answer by speaking and NegosyoPlan writes your answers into the boxes for you.</p>
      <ul class="small"><li>Your recording is sent through OLEDIPO's server to <b>OpenAI</b>, an AI service outside the Philippines, to turn speech into text. The recording is <b>not saved</b> by OLEDIPO.</li>
        <li>Only the question (box name) and what you say are sent — not your other saved information.</li>
        <li>Always read what was written and correct it if needed. AI can make mistakes.</li>
        <li>Needs internet. You can stop using it anytime in ${t('Settings')}.</li></ul>
      <div class="btns"><button class="btn big" data-act="voiceAgree">${A().ic('check')} I agree</button><button class="btn ghost" data-act="closeModal">${t('Cancel')}</button></div>`);
    pendingAfterConsent = then;
  }
  let pendingAfterConsent = null;

  /* -------------------------------------------------- recording */
  let rec = null;
  function pickMime() {
    const c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
    for (const m of c) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) { /* ignore */ } }
    return '';
  }
  function start() {
    if (!API().configured()) return A().toast('Voice to Text needs the online server (config.js).', 'err');
    if (!unlocked()) return payModal();
    if (!navigator.onLine) return A().toast(t('Voice to Text needs internet. You can type your answers offline.'), 'err');
    if (!hasConsent()) return askConsent(start);
    const ctx = collect();
    if (!ctx.fields.length && !ctx.tables.length) return A().toast('There are no fields to fill on this page.', 'err');
    const out = S().settings.voiceOut || 'en';
    A().modal(`<div class="voice-rec"><h2>${A().ic('mic')} ${t('Voice to Text')}</h2>
      <p class="muted small">${esc(ctx.page)} · ${ctx.fields.length} field(s)</p>
      <button type="button" class="mic-big" id="micBig" data-act="voiceToggle" aria-label="Start recording">${A().ic('mic')}</button>
      <p class="rec-state" id="recState" aria-live="polite">${t('Tap the microphone and start talking')}</p>
      <div class="lvl" aria-hidden="true"><span id="recLvl"></span></div>
      <details class="example" open><summary>${A().ic('bulb')} ${t('You can say, for example')}</summary><p>“${esc(tips())}”</p></details>
      <div class="fld"><label>${t('Write my answers in')}</label><div class="chips">
        <label class="chip"><input type="radio" name="vout" value="en" ${out === 'en' ? 'checked' : ''}><span>English</span></label>
        <label class="chip"><input type="radio" name="vout" value="same" ${out === 'same' ? 'checked' : ''}><span>${t('The language I speak')}</span></label></div></div>
      <p class="muted small">English, Filipino or Hiligaynon · up to 3 minutes · speak naturally, numbers too (“singkwenta mil”).</p>
      <button type="button" class="link-btn" data-act="voiceAsk">${A().ic('arrowL')} ${t('Back to one question at a time')}</button></div>`, 'voice');
    $$('input[name=vout]').forEach((r) => (r.onchange = () => { S().settings.voiceOut = r.value; Store().setMeta('settings', S().settings); }));
    rec = { ctx, chunks: [], stream: null, mr: null, t0: 0, timer: null, ac: null };
  }
  async function toggle() {
    if (!rec) return;
    if (rec.mr && rec.mr.state === 'recording') return stop();
    try {
      rec.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      return setState(`<span class="err">${A().ic('alert')} Microphone not allowed. Allow the microphone for this site in your browser settings, then try again.</span>`);
    }
    const mime = pickMime();
    rec.mr = new MediaRecorder(rec.stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
    rec.chunks = [];
    rec.mr.ondataavailable = (e) => { if (e.data && e.data.size) rec.chunks.push(e.data); };
    rec.mr.onstop = send;
    rec.mr.start(1000);
    rec.t0 = Date.now();
    const mic = $('#micBig'); if (mic) { mic.classList.add('on'); mic.setAttribute('aria-label', 'Stop recording'); }
    level();
    rec.timer = setInterval(() => {
      const s = Math.floor((Date.now() - rec.t0) / 1000);
      setState(`<b class="rec-dot"></b> ${t('Listening…')} ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} — ${t('tap again when done')}`);
      if (s >= MAX_SEC) stop();
    }, 250);
  }
  function level() {
    try {
      const AC = G.AudioContext || G.webkitAudioContext; if (!AC) return;
      rec.ac = new AC(); const src = rec.ac.createMediaStreamSource(rec.stream), an = rec.ac.createAnalyser(); an.fftSize = 512; src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      const draw = () => { if (!rec || !rec.ac) return; an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); const el = $('#recLvl'); if (el) el.style.width = Math.min(100, m / 64 * 100) + '%'; requestAnimationFrame(draw); };
      draw();
    } catch (e) { /* level meter is optional */ }
  }
  function stop() {
    if (!rec || !rec.mr) return;
    clearInterval(rec.timer);
    if (rec.mr.state !== 'inactive') rec.mr.stop();
    rec.stream.getTracks().forEach((tr) => tr.stop());
    if (rec.ac) { try { rec.ac.close(); } catch (e) { /* ignore */ } rec.ac = null; }
    const mic = $('#micBig'); if (mic) { mic.classList.remove('on'); mic.disabled = true; }
  }
  function cancel() {
    if (rec) { rec.cancelled = true; if (rec.mr && rec.mr.state === 'recording') stop(); }
    rec = null;
  }
  function setState(html) { const el = $('#recState'); if (el) el.innerHTML = html; }

  async function deviceId() {
    let id = await Store().getMeta('deviceId');
    if (!id) { id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); await Store().setMeta('deviceId', id); }
    return id;
  }
  function blobToB64(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(blob); }); }

  async function send() {
    const R = rec; if (!R || R.cancelled) return;
    const secs = (Date.now() - R.t0) / 1000;
    if (secs < 1.2 || !R.chunks.length) { setState(t('That was too short. Tap the microphone and try again.')); const m = $('#micBig'); if (m) m.disabled = false; return; }
    setState(`<span class="spin"></span> ${t('Writing it down…')} <small class="muted">(10–30 seconds)</small>`);
    try {
      const blob = new Blob(R.chunks, { type: R.mr.mimeType || 'audio/webm' });
      const sess = S().session;
      const r = await API().call({
        action: 'voiceFill', audio: await blobToB64(blob), mime: blob.type, lang: S().settings.lang, outLang: S().settings.voiceOut || 'en',
        page: R.ctx.page, fields: R.ctx.fields, tables: R.ctx.tables.map(({ path, label, columns }) => ({ path, label, columns })),
        token: sess ? sess.token : '', deviceId: await deviceId(), voiceKey: vkey
      });
      if (rec !== R) return; // closed meanwhile
      review(R.ctx, r);
    } catch (e) {
      if (lockedErr(e)) return;
      setState(`<span class="err">${A().ic('alert')} ${esc(e.message)}</span>`);
      const m = $('#micBig'); if (m) m.disabled = false;
    }
  }

  /* -------------------------------------------------- review & apply */
  let pending = null;
  function shown(v, f) {
    if (v == null || v === '') return '<span class="muted">empty</span>';
    if (Array.isArray(v)) return esc(v.join(', ')) || '<span class="muted">empty</span>';
    const o = (f.options || []).find((x) => x.split('=')[0] === String(v));
    return esc(o ? o.split('=').slice(1).join('=') : v);
  }
  function normValue(f, v) {
    v = String(v).trim();
    if (f.type === 'number') { v = v.replace(/[₱,\s]/g, ''); return /^-?\d+(\.\d+)?$/.test(v) ? v : null; }
    if (f.type === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    if (f.type === 'choice') { const ok = f.options.map((o) => o.split('=')[0]); return ok.indexOf(v) >= 0 ? v : null; }
    if (f.type === 'multi') { const want = v.split('|').map((x) => x.trim()).filter((x) => f.options.indexOf(x) >= 0); return want.length ? want : null; }
    return v;
  }
  function review(ctx, r) {
    const P = S().profile;
    const items = [];
    (r.fills || []).forEach((x) => {
      const f = ctx.fields.find((y) => y.path === x.path); if (!f) return;
      const v = normValue(f, x.value); if (v == null) return;
      const old = A().getPath(P, f.path);
      if (f.type === 'multi') { const merged = Array.from(new Set((old || []).concat(v))); if (merged.length === (old || []).length) return; items.push({ f, v: merged, old }); return; }
      if (String(old == null ? '' : old) === String(v)) return;
      items.push({ f, v, old });
    });
    const rows = (r.rows || []).map((x) => ({ x, tb: ctx.tables.find((y) => y.path === x.table) })).filter((o) => o.tb);
    pending = { items, rows };
    const tx = r.transcript || '';
    const fieldHtml = items.map((it, i) => {
      const ed = it.f.type === 'multi' ? `<p class="vnew">${esc(it.v.join(', '))}</p>`
        : it.f.type === 'choice' ? `<p class="vnew">${shown(it.v, it.f)}</p>`
        : it.f.type === 'text' ? `<textarea data-vi="${i}" rows="3">${esc(it.v)}</textarea>`
        : `<input data-vi="${i}" value="${esc(it.v)}" ${it.f.type === 'number' ? 'inputmode="decimal"' : ''}>`;
      return `<li><label class="vchk"><input type="checkbox" data-vc="${i}" checked><span><b>${esc(it.f.label)}</b>${it.f.group ? `<small>${esc(it.f.group)}</small>` : ''}</span></label>
        ${ed}${it.old != null && it.old !== '' && !(Array.isArray(it.old) && !it.old.length) ? `<small class="muted">${t('Now')}: ${shown(it.old, it.f)} → ${t('will be replaced')}</small>` : ''}</li>`;
    }).join('');
    const rowHtml = rows.map((o, i) => `<li><label class="vchk"><input type="checkbox" data-vr="${i}" checked><span><b>${t('New row')}: ${esc(o.tb.label || o.tb.path)}</b>
      <small>${o.tb.columns.filter((c) => o.x.cells[c.k] != null).map((c) => esc(c.label) + ': ' + esc(o.x.cells[c.k])).join(' · ')}</small></span></label></li>`).join('');
    A().modal(`<h2>${A().ic('check')} ${t('Check before saving')}</h2>
      ${items.length || rows.length ? `<p class="muted small">${t('Uncheck anything wrong. You can edit the text here or later in the form.')}</p><ul class="vlist">${fieldHtml}${rowHtml}</ul>`
        : `<div class="hint">${A().ic('alert')} ${t('Nothing on this page matched what you said. Try again and mention the items on this page.')}</div>`}
      ${r.unused ? `<p class="small"><b>${t('Not used')}:</b> ${esc(r.unused)}</p>` : ''}
      <details class="small"><summary>${t('What NegosyoPlan heard')}</summary><p class="transcript">${esc(tx) || '—'}</p>${tx ? `<button type="button" class="btn sm ghost" data-act="voiceCopy">${t('Copy text')}</button>` : ''}</details>
      <p class="muted small">AI can make mistakes. Check names and numbers. Figures stay marked as self-reported.</p>
      <div class="btns">${items.length || rows.length ? `<button class="btn big" data-act="voiceApply">${A().ic('check')} ${t('Put in my form')}</button>` : ''}
        <button class="btn ghost" data-act="voiceStart">${A().ic('mic')} ${t('Record again')}</button><button class="btn ghost" data-act="closeModal">${t('Cancel')}</button></div>`, 'voice wide');
    pending.transcript = tx;
    rec = null;
  }
  function apply() {
    if (!pending) return;
    const P = S().profile; let n = 0;
    pending.items.forEach((it, i) => {
      const c = $(`[data-vc="${i}"]`); if (!c || !c.checked) return;
      const ed = $(`[data-vi="${i}"]`);
      let v = it.v;
      if (ed) { v = ed.value.trim(); if (it.f.type === 'number') { v = v.replace(/[₱,\s]/g, ''); if (!/^-?\d+(\.\d+)?$/.test(v)) return; } }
      A().setPath(P, it.f.path, v); n++;
    });
    pending.rows.forEach((o, i) => {
      const c = $(`[data-vr="${i}"]`); if (!c || !c.checked) return;
      const arr = A().getPath(P, o.tb.path) || [];
      const row = o.tb.tpl && A().TPL[o.tb.tpl] ? A().TPL[o.tb.tpl]() : {};
      o.tb.columns.forEach((col) => {
        let v = o.x.cells[col.k]; if (v == null) return; v = String(v).trim();
        if (col.options && col.options.length) { const ok = col.options.map((x) => x.split('=')[0]); if (ok.indexOf(v) < 0) return; }
        if (col.num) { v = v.replace(/[₱,\s]/g, ''); if (!/^-?\d+(\.\d+)?$/.test(v)) return; }
        row[col.k] = v;
      });
      // reuse an empty starter row (e.g. the blank first product) instead of adding below it
      const blank = arr.findIndex((x) => o.tb.columns.every((col) => col.options && col.options.length ? true : !String(x[col.k] == null ? '' : x[col.k]).trim()));
      if (blank >= 0) Object.assign(arr[blank], row, row.id ? { id: arr[blank].id || row.id } : {}); else arr.push(row);
      A().setPath(P, o.tb.path, arr); n++;
    });
    pending = null;
    A().closeModal(); A().touch(); A().route();
    A().toast(n ? `✓ ${n} ${t('item(s) filled in. Please check them.')}` : t('Nothing was changed.'), n ? 'ok' : '');
  }


  /* ================================================== PER-FIELD VOICE
     Shared one-shot recorder: start → stop → { blob, secs } */
  function recorder(maxSec, onTick) {
    let stream, mr, chunks = [], t0 = 0, timer, ac, resolveFn, rejectFn, stopped = false;
    const done = new Promise((res, rej) => { resolveFn = res; rejectFn = rej; });
    const api = {
      done,
      async start() {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        const mime = pickMime();
        mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
        mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        mr.onstop = () => { if (api.cancelled) return rejectFn(new Error('cancelled')); resolveFn({ blob: new Blob(chunks, { type: mr.mimeType || 'audio/webm' }), secs: (Date.now() - t0) / 1000 }); };
        mr.start(500); t0 = Date.now();
        try {
          const AC = G.AudioContext || G.webkitAudioContext;
          if (AC) { ac = new AC(); const an = ac.createAnalyser(); an.fftSize = 512; ac.createMediaStreamSource(stream).connect(an); const buf = new Uint8Array(512); api.level = () => { an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); return Math.min(1, m / 64); }; }
        } catch (e) { /* optional */ }
        timer = setInterval(() => { const s = (Date.now() - t0) / 1000; if (onTick) onTick(s, api.level ? api.level() : 0); if (s >= maxSec) api.stop(); }, 120);
      },
      stop() {
        if (stopped) return; stopped = true; clearInterval(timer);
        try { if (mr && mr.state !== 'inactive') mr.stop(); } catch (e) { /* ignore */ }
        if (stream) stream.getTracks().forEach((x) => x.stop());
        if (ac) { try { ac.close(); } catch (e) { /* ignore */ } }
      },
      cancel() { api.cancelled = true; api.stop(); },
      get recording() { return !!mr && !stopped; }
    };
    return api;
  }
  const micDenied = 'Microphone not allowed. Allow the microphone for this site in your browser settings, then try again.';
  function ready(then) {
    if (!supported()) { A().toast('This browser cannot record sound.', 'err'); return false; }
    if (!API().configured()) { A().toast('Voice to Text needs the online server (config.js).', 'err'); return false; }
    if (!unlocked()) { payModal(); return false; }
    if (!navigator.onLine) { A().toast(t('Voice to Text needs internet. You can type your answers offline.'), 'err'); return false; }
    if (!hasConsent()) { askConsent(then); return false; }
    return true;
  }

  /* info about one field on the page: label, help, type, options */
  function fieldInfo(path) {
    const ctx = collect(); const f = ctx.fields.find((x) => x.path === path);
    if (!f) return null;
    const el = $(`#main [data-bind="${CSS.escape(path)}"], #main [data-arr="${CSS.escape(path)}"]`);
    const fld = el && el.closest('.fld'); const h = fld && fld.querySelector(':scope > .help');
    return Object.assign({ page: ctx.page, help: h ? h.textContent.replace(/\s+/g, ' ').trim() : '' }, f);
  }

  /* send one answer for one field */
  async function askServer(f, blob) {
    const sess = S().session;
    const r = await API().call({
      action: 'voiceField', audio: await blobToB64(blob), mime: blob.type, lang: S().settings.lang, outLang: S().settings.voiceOut || 'en',
      field: { path: f.path, label: f.label, help: f.help, group: [f.page, f.group].filter(Boolean).join(' — '), type: f.type, options: f.options },
      token: sess ? sess.token : '', deviceId: await deviceId(), voiceKey: vkey
    });
    let v = r.understood ? normValue(f, r.value) : null;
    if (v != null && f.type === 'multi') v = Array.from(new Set((A().getPath(S().profile, f.path) || []).concat(v)));
    return { value: v, transcript: r.transcript || '', note: r.note || (r.understood ? 'The answer did not fit this box.' : '') };
  }
  function write(path, v) {
    const y = G.scrollY;
    A().setPath(S().profile, path, v); A().touch(); A().route();
    G.scrollTo(0, y);
  }
  function display(f, v) { return shown(v, f); }

  /* ---------------- 1. small microphone in each box ---------------- */
  let fieldRec = null, lastUndo = null;
  function fieldMic(path) {
    return `<button type="button" class="fmic${unlocked() ? '' : ' locked'}" data-act="voiceField" data-path="${esc(path)}" aria-label="${t('Answer by voice')}" title="${t('Answer by voice')}">${A().ic('mic')}${unlocked() ? '' : `<span class="fmic-lock">${A().ic('lock')}</span>`}</button>`;
  }
  function bubble(path, html, cls) {
    const el = $(`#main [data-bind="${CSS.escape(path)}"], #main [data-arr="${CSS.escape(path)}"]`); const fld = el && el.closest('.fld'); if (!fld) return;
    let b = fld.querySelector('.fmic-bubble');
    if (!b) { b = document.createElement('div'); b.className = 'fmic-bubble'; b.setAttribute('aria-live', 'polite'); fld.appendChild(b); }
    b.className = 'fmic-bubble ' + (cls || ''); b.innerHTML = html;
  }
  function micBtn(path) { return $(`#main .fmic[data-path="${CSS.escape(path)}"]`); }
  async function fieldVoice(path) {
    if (fieldRec) { const same = fieldRec.path === path; if (fieldRec.r.recording) fieldRec.r.stop(); if (same) return; }
    if (!ready(() => fieldVoice(path))) return;
    const f = fieldInfo(path); if (!f) return;
    const r = recorder(60, (s, lv) => { bubble(path, `<b class="rec-dot"></b> ${t('Listening…')} ${Math.floor(s)}s — ${t('tap the microphone again when done')}<span class="mini-lvl"><i style="width:${Math.round(lv * 100)}%"></i></span>`, 'rec'); });
    fieldRec = { path, r };
    try { await r.start(); } catch (e) { fieldRec = null; return bubble(path, `${A().ic('alert')} ${micDenied}`, 'err'); }
    const b = micBtn(path); if (b) b.classList.add('on');
    let res;
    try { res = await r.done; } catch (e) { fieldRec = null; return; }
    fieldRec = null; const b2 = micBtn(path); if (b2) b2.classList.remove('on');
    if (res.secs < 0.8) return bubble(path, t('That was too short. Tap the microphone and try again.'), 'err');
    bubble(path, `<span class="spin"></span> ${t('Writing it down…')}`, 'busy');
    try {
      const out = await askServer(f, res.blob);
      if (out.value == null) return bubble(path, `${A().ic('alert')} ${esc(out.note || 'Not clear.')} ${out.transcript ? `<small>(${t('heard')}: “${esc(out.transcript)}”)</small>` : ''} <button type="button" class="link-btn" data-act="voiceField" data-path="${esc(path)}">${t('Try again')}</button>`, 'err');
      lastUndo = { path, old: JSON.parse(JSON.stringify(A().getPath(S().profile, path) == null ? '' : A().getPath(S().profile, path))) };
      write(path, out.value);
      const el = $(`#main [data-bind="${CSS.escape(path)}"], #main [data-arr="${CSS.escape(path)}"]`); const fld = el && el.closest('.fld');
      if (fld) { fld.classList.add('voice-filled'); setTimeout(() => fld.classList.remove('voice-filled'), 2200); }
      bubble(path, `${A().ic('check')} ${t('Written. Please check it.')} <button type="button" class="link-btn" data-act="voiceUndo">${t('Undo')}</button>`, 'ok');
    } catch (e) { if (lockedErr(e)) return; bubble(path, `${A().ic('alert')} ${esc(e.message)}`, 'err'); }
  }

  /* ---------------- 2. NegosyoPlan asks the questions one by one ---------------- */
  let Q = null;
  function interview() {
    if (!ready(interview)) return;
    const ctx = collect();
    if (!ctx.fields.length) return A().toast('There are no fields to answer on this page.', 'err');
    const onlyEmpty = S().settings.voiceOnlyEmpty !== false;
    const P = S().profile;
    const isEmpty = (f) => { const v = A().getPath(P, f.path); return v == null || v === '' || (Array.isArray(v) && !v.length); };
    let list = ctx.fields.map((f) => fieldInfo(f.path)).filter(Boolean);
    if (onlyEmpty) list = list.filter(isEmpty);
    Q = { list, i: 0, filled: 0, page: ctx.page, total: ctx.fields.length, r: null, busy: false, onlyEmpty };
    if (!list.length) return qDone(true);
    qShow();
  }
  function qShow(extra) {
    const f = Q.list[Q.i]; const cur = A().getPath(S().profile, f.path);
    const hasCur = !(cur == null || cur === '' || (Array.isArray(cur) && !cur.length));
    const out = S().settings.voiceOut || 'en';
    const opts = f.options.length ? `<p class="q-opts">${t('Choices')}: ${f.options.map((o) => '<span>' + esc(o.includes('=') ? o.split('=').slice(1).join('=') : o) + '</span>').join('')}</p>` : '';
    const hint = { number: t('Say the amount or number.'), date: t('Say the day, month and year.'), multi: t('Say all that apply.') }[f.type] || '';
    A().modal(`<div class="voice-rec q">
      <div class="q-top"><span>${t('Question')} ${Q.i + 1} ${t('of')} ${Q.list.length}</span><div class="q-bar"><i style="width:${(Q.i / Q.list.length) * 100}%"></i></div></div>
      ${f.group ? `<p class="q-group">${esc(f.group)}</p>` : ''}
      <h2 class="q-label">${esc(f.label)}${f.type === 'number' ? ' <small>(₱ / no.)</small>' : ''}</h2>
      ${f.help ? `<p class="q-help">${esc(f.help)}</p>` : ''}${opts}${hint ? `<p class="muted small">${hint}</p>` : ''}
      <button type="button" class="mic-big" id="qMic" data-act="voiceQMic" aria-label="${t('Answer by voice')}">${A().ic('mic')}</button>
      <p class="rec-state" id="qState" aria-live="polite">${extra || (hasCur ? `${t('Now')}: <b>${display(f, cur)}</b> — ${t('tap the microphone to change it, or Next')}` : t('Tap the microphone and answer'))}</p>
      <div class="lvl" aria-hidden="true"><span id="qLvl"></span></div>
      <div id="qResult"></div>
      <div class="q-nav"><button type="button" class="btn ghost" data-act="voiceQBack" ${Q.i === 0 ? 'disabled' : ''}>${A().ic('arrowL')} ${t('Back')}</button>
        <button type="button" class="btn ghost" data-act="voiceQSkip">${t('Skip')}</button>
        <button type="button" class="btn" data-act="voiceQNext">${Q.i === Q.list.length - 1 ? t('Finish') : t('Next')} ${A().ic('arrowR')}</button></div>
      <details class="small q-more"><summary>${t('Options')}</summary>
        <div class="chips"><label class="chip"><input type="radio" name="qscope" value="empty" ${Q.onlyEmpty ? 'checked' : ''}><span>${t('Ask only empty boxes')}</span></label>
          <label class="chip"><input type="radio" name="qscope" value="all" ${!Q.onlyEmpty ? 'checked' : ''}><span>${t('Ask all boxes')}</span></label></div>
        <div class="chips"><label class="chip"><input type="radio" name="vout" value="en" ${out === 'en' ? 'checked' : ''}><span>${t('Write in English')}</span></label>
          <label class="chip"><input type="radio" name="vout" value="same" ${out === 'same' ? 'checked' : ''}><span>${t('Write in the language I speak')}</span></label></div>
        <button type="button" class="link-btn" data-act="voiceStart">${t('Or say everything at once')}</button></details></div>`, 'voice');
    $$('input[name=vout]').forEach((r) => (r.onchange = () => { S().settings.voiceOut = r.value; Store().setMeta('settings', S().settings); }));
    $$('input[name=qscope]').forEach((r) => (r.onchange = () => { S().settings.voiceOnlyEmpty = r.value === 'empty'; Store().setMeta('settings', S().settings); qStop(); interview(); }));
  }
  function qStop() { if (Q && Q.r) { Q.r.cancel(); Q.r = null; } }
  async function qMic() {
    if (!Q || Q.busy) return;
    if (Q.r && Q.r.recording) return Q.r.stop();
    const f = Q.list[Q.i], my = Q;
    const setSt = (h) => { const e = $('#qState'); if (e) e.innerHTML = h; };
    const r = recorder(90, (s, lv) => { setSt(`<b class="rec-dot"></b> ${t('Listening…')} ${Math.floor(s)}s — ${t('tap again when done')}`); const l = $('#qLvl'); if (l) l.style.width = Math.round(lv * 100) + '%'; });
    Q.r = r;
    try { await r.start(); } catch (e) { Q.r = null; return setSt(`<span class="err">${A().ic('alert')} ${micDenied}</span>`); }
    const m = $('#qMic'); if (m) m.classList.add('on');
    let res; try { res = await r.done; } catch (e) { return; }
    if (Q !== my || my.list[my.i] !== f) return;
    Q.r = null; const m2 = $('#qMic'); if (m2) { m2.classList.remove('on'); m2.disabled = true; }
    if (res.secs < 0.8) { if (m2) m2.disabled = false; return setSt(t('That was too short. Tap the microphone and try again.')); }
    Q.busy = true; setSt(`<span class="spin"></span> ${t('Writing it down…')}`);
    try {
      const out = await askServer(f, res.blob);
      if (Q !== my || my.list[my.i] !== f) return;
      if (out.value == null) {
        setSt(`<span class="err">${A().ic('alert')} ${esc(out.note || 'Not clear.')}</span>${out.transcript ? `<br><small class="muted">${t('heard')}: “${esc(out.transcript)}”</small>` : ''}<br>${t('Tap the microphone and try again, or Skip.')}`);
      } else {
        write(f.path, out.value); Q.filled++;
        setSt(`${A().ic('check')} <b>${t('Written in your form')}</b>`);
        const ed = f.type === 'text' ? `<textarea id="qEdit" rows="3">${esc(out.value)}</textarea>`
          : (f.type === 'number' || f.type === 'short text' || f.type === 'date') ? `<input id="qEdit" value="${esc(out.value)}" ${f.type === 'number' ? 'inputmode="decimal"' : ''}>`
          : `<p class="vnew">${display(f, out.value)}</p>`;
        $('#qResult').innerHTML = `<div class="q-answer">${ed}<small class="muted">${t('You can correct it here.')} ${t('heard')}: “${esc(out.transcript)}”</small></div>`;
        const e = $('#qEdit'); if (e) e.oninput = () => { let v = e.value; if (f.type === 'number') v = v.replace(/[₱,\s]/g, ''); A().setPath(S().profile, f.path, v); A().touch(); };
        const nb = $('[data-act=voiceQNext]'); if (nb) nb.focus();
      }
    } catch (e) { if (lockedErr(e)) return; setSt(`<span class="err">${A().ic('alert')} ${esc(e.message)}</span>`); }
    finally { Q.busy = false; const m3 = $('#qMic'); if (m3) m3.disabled = false; }
  }
  function qGo(d) {
    if (!Q || Q.busy) return; qStop();
    if (d === 'edit') { const e = $('#qEdit'); if (e) A().route(); }
    const ni = Q.i + (d === -1 ? -1 : 1);
    if (ni >= Q.list.length) return qDone();
    Q.i = Math.max(0, ni); A().route(); qShow();
  }
  function qDone(nothing) {
    const n = Q ? Q.filled : 0; qStop(); Q = null; A().route();
    A().modal(`<div class="voice-rec"><h2>${A().ic('check')} ${nothing ? t('All boxes on this page are already filled in.') : t('Done for this page!')}</h2>
      ${nothing ? '' : `<p>${n} ${t('box(es) filled in by voice.')} ${t('Please read them once and correct anything wrong.')}</p>`}
      <div class="btns"><button class="btn" data-act="closeModal">${t('Close')}</button>${nothing ? `<button class="btn ghost" data-act="voiceAskAll">${t('Ask all boxes')}</button>` : ''}</div></div>`, 'voice');
  }


  /* ================================================== LOCK + GCASH PAYMENT (₱700, one-time) */
  const PRICE = 700;
  let vkey = '', order = null, info = null;
  function unlocked() { return !!vkey; }
  async function init() {
    try { vkey = (await Store().getMeta('voiceKey')) || ''; order = (await Store().getMeta('voiceOrder')) || null; info = (await Store().getMeta('payInfo')) || null; } catch (e) { /* ignore */ }
    if (!vkey && order && navigator.onLine && API().configured()) checkStatus(true);
  }
  async function saveKey(k) { vkey = k || ''; await Store().setMeta('voiceKey', vkey); }
  async function saveOrder(o) { order = o; await Store().setMeta('voiceOrder', o); }
  function lockedErr(e) {
    if (!/^LOCKED:/.test(e.message || '')) return false;
    saveKey(''); A().route(); payModal(e.message.replace(/^LOCKED:\s*/, '')); return true;
  }
  async function loadInfo() {
    try { const r = await API().get({ action: 'services' }); info = { gcash: r.gcash, paymongo: r.paymongo, currency: r.currency || '₱', price: ((r.services || []).find((x) => x.id === 'voice') || {}).price || PRICE }; await Store().setMeta('payInfo', info); } catch (e) { /* keep cached */ }
    return info;
  }
  const peso = (n) => '₱' + Number(n || PRICE).toLocaleString('en-PH');
  function payModal(msg) {
    const p = S().profile, o = order, price = (info && info.price) || PRICE;
    const st = o ? o.status : '';
    const perks = `<ul class="perks"><li>${A().ic('check')} ${t('Every question of the MSME Enterprise Passport, Business Plan and Financial Statements')}</li>
      <li>${A().ic('check')} ${t('Speak in English, Filipino or Hiligaynon — NegosyoPlan writes it in the right box')}</li>
      <li>${A().ic('check')} ${t('One-time payment for your whole application')}</li></ul>`;
    let body;
    if (!o || st === 'Rejected' || st === 'Refunded') {
      body = `${st === 'Rejected' ? `<div class="issues"><ul><li class="sev-error">${t('Your last payment was not confirmed')}${o.notes ? ': ' + esc(o.notes) : '.'} ${t('Please try again.')}</li></ul></div>` : ''}
        <h3>1. ${t('Your details')}</h3>
        <div class="row"><div class="fld"><label for="payName">${t('Full name')}</label><input id="payName" value="${esc(G.GrowCalc.fullName(p.owner) || '')}" autocomplete="name"></div>
        <div class="fld"><label for="payMobile">${t('GCash mobile number')}</label><input id="payMobile" type="tel" inputmode="tel" value="${esc(p.owner.contact || '')}" placeholder="09XXXXXXXXX"></div></div>
        <div class="btns"><button class="btn big gcash" data-act="payCreate">${t('Continue to GCash')} ${A().ic('arrowR')}</button></div>`;
    } else if (st === 'Awaiting payment') {
      const g = (info && info.gcash) || {};
      body = `<h3>2. ${t('Send')} ${peso(o.amount || price)} ${t('by GCash')}</h3>
        <ol class="gsteps"><li>${t('Open GCash → Send Money → Express Send.')}</li>
          <li>${t('Send to')} <b class="gnum">${esc(g.number || '—')}</b> <small>(${esc(g.name || 'OLEDIPO')})</small></li>
          <li>${t('Amount')}: <b>${peso(o.amount || price)}</b> · ${t('Message')}: <b><code>${esc(o.orderId)}</code></b></li>
          <li>${t('After paying, copy the Ref. No. from your GCash receipt and enter it below.')}</li></ol>
        ${info && info.paymongo && o.hasCheckout ? `<p><button class="btn ghost" data-act="payCheck">${t('I paid with GCash checkout — check now')}</button></p>` : ''}
        <h3>3. ${t('Confirm your payment')}</h3>
        <div class="fld"><label for="payRef">${t('GCash Ref. No.')}</label><input id="payRef" inputmode="numeric" placeholder="e.g. 1234 567 890123" autocomplete="off"></div>
        <div class="fld"><label>${t('Screenshot of the GCash receipt')} <span class="opt">(${t('Optional')})</span></label><input id="payShot" type="file" accept="image/*"></div>
        <div class="btns"><button class="btn big gcash" data-act="payConfirm">${A().ic('check')} ${t('I have paid')}</button></div>
        <p class="muted small">${t('Order')} <code>${esc(o.orderId)}</code> · ${t('Keep your Order ID. You need it to unlock Voice to Text on another phone.')}</p>`;
    } else if (st === 'Payment submitted') {
      body = `<div class="pay-wait">${A().ic('cloud', 'big')}<h3>${t('Payment submitted — waiting for OLEDIPO to confirm')}</h3>
        <p>${t('Order')} <code>${esc(o.orderId)}</code> · GCash Ref. <b>${esc(o.gcashRef)}</b></p>
        <p class="muted small">${t('This is usually done within 1 working day. Voice to Text unlocks automatically after confirmation.')}</p>
        <div class="btns"><button class="btn" data-act="payCheck">${t('Check status')}</button></div></div>`;
    } else {
      body = `<div class="pay-wait"><p>${t('Payment confirmed.')}</p><div class="btns"><button class="btn" data-act="payCheck">${t('Unlock now')}</button></div></div>`;
    }
    A().modal(`<div class="paywall"><div class="pw-head"><span class="pw-ic">${A().ic('mic')}<i>${A().ic('lock')}</i></span>
        <div><h2>${t('Unlock Voice to Text')}</h2><p class="pw-price">${peso(price)} <small>${t('one-time · GCash')}</small></p></div></div>
      ${msg ? `<p class="hint">${A().ic('alert')} ${esc(msg)}</p>` : ''}${perks}${body}
      <p class="err" id="payErr" role="alert"></p>
      <details class="small"><summary>${t('Already paid on another phone?')}</summary>
        <div class="row"><div class="fld"><label for="rsOrder">${t('Order ID')}</label><input id="rsOrder" placeholder="ORD-…" autocomplete="off"></div>
        <div class="fld"><label for="rsMobile">${t('Mobile number used')}</label><input id="rsMobile" type="tel" inputmode="tel" value="${esc(p.owner.contact || '')}"></div></div>
        <button class="btn sm ghost" data-act="payRestore">${t('Unlock this phone')}</button></details>
      <p class="muted small">${t('Paid to the Provincial Government of Iloilo (OLEDIPO). Needs internet.')}</p></div>`, 'voice pay');
    if (!info) loadInfo().then(() => { if ($('.paywall') && order && order.status === 'Awaiting payment') payModal(msg); });
  }
  const err = (m) => { const e = $('#payErr'); if (e) e.textContent = m; };
  async function base() { const sess = S().session; return { token: sess ? sess.token : '', deviceId: await deviceId() }; }
  function needNet() { if (!API().configured()) { err('The online server is not configured (config.js).'); return false; } if (!navigator.onLine) { err(t('You need internet for this.')); return false; } return true; }
  async function busy(btn, fn) { if (btn) { btn.disabled = true; btn.dataset.l = btn.innerHTML; btn.innerHTML = '<span class="spin"></span> ' + t('Please wait…'); } try { await fn(); } catch (e) { err(e.message); } finally { if (btn && document.body.contains(btn)) { btn.disabled = false; btn.innerHTML = btn.dataset.l; } } }
  async function afterOrder(r, quiet) {
    if (r.info) { info = Object.assign(info || {}, { gcash: r.info.gcash, paymongo: r.info.paymongo }); await Store().setMeta('payInfo', info); }
    if (r.gcash) { info = Object.assign(info || {}, { gcash: r.gcash }); await Store().setMeta('payInfo', info); }
    const o = r.order || (r.orders || []).find((x) => x.serviceId === 'voice');
    if (o) await saveOrder(o);
    if (r.voiceKey) {
      await saveKey(r.voiceKey);
      A().closeModal(); A().route();
      A().modal(`<div class="voice-rec"><div class="unlock-pop">${A().ic('mic')}</div><h2>${t('Voice to Text is unlocked!')}</h2>
        <p>${t('Tap the green microphone beside any box, or the Voice to Text button, and start talking.')}</p><div class="btns"><button class="btn big" data-act="closeModal">${t('Start')}</button></div></div>`, 'voice');
      return;
    }
    if (!quiet) payModal();
  }
  async function checkStatus(quiet) { try { await afterOrder(await API().call(Object.assign({ action: 'myOrders' }, await base())), quiet || !$('.paywall')); } catch (e) { if (!quiet) err(e.message); } }

  async function payClick(a, b) {
    switch (a) {
      case 'payCreate': {
        if (!needNet()) return;
        const mobile = $('#payMobile').value, name = $('#payName').value;
        return busy(b, async () => {
          const r = await API().call(Object.assign({ action: 'orderCreate', serviceId: 'voice', mobile, name, returnUrl: location.href }, await base()));
          if (r.checkoutUrl) { await afterOrder(r); G.open(r.checkoutUrl, '_blank', 'noopener'); return; }
          await afterOrder(r);
        });
      }
      case 'payConfirm': {
        if (!needNet()) return;
        const ref = $('#payRef').value.replace(/\s/g, ''); if (!/^\d{8,20}$/.test(ref)) return err(t('Enter the GCash Ref. No. (numbers only).'));
        const f = $('#payShot').files[0];
        return busy(b, async () => {
          let receipt = null;
          if (f) { const data = await new Promise((res) => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.readAsDataURL(f); }); receipt = { data: await shrink(data), mime: 'image/jpeg' }; }
          await afterOrder(await API().call(Object.assign({ action: 'orderPay', orderId: order.orderId, gcashRef: ref, receipt }, await base())));
        });
      }
      case 'payCheck': if (!needNet()) return; return busy(b, () => checkStatus(false));
      case 'payRestore': {
        if (!needNet()) return;
        return busy(b, async () => { const r = await API().call(Object.assign({ action: 'voiceRestore', orderId: $('#rsOrder').value, mobile: $('#rsMobile').value }, await base())); await afterOrder(r); });
      }
      case 'payOpen': payModal(); return;
    }
  }
  function shrink(dataUrl) {
    return new Promise((res) => { const img = new Image(); img.onload = () => { const m = 1400, k = Math.min(1, m / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .8)); }; img.onerror = () => res(dataUrl); img.src = dataUrl; });
  }

  function onClick(a, b) {
    if (/^pay[A-Z]/.test(a)) { payClick(a, b); return true; }
    switch (a) {
      case 'voiceStart': qStop(); Q = null; cancel(); start(); return true;
      case 'voiceAsk': cancel(); qStop(); interview(); return true;
      case 'voiceAskAll': S().settings.voiceOnlyEmpty = false; Store().setMeta('settings', S().settings); interview(); return true;
      case 'voiceQMic': qMic(); return true;
      case 'voiceQNext': qGo(1); return true;
      case 'voiceQSkip': qGo(1); return true;
      case 'voiceQBack': qGo(-1); return true;
      case 'voiceField': fieldVoice(b.dataset.path); return true;
      case 'voiceUndo': { if (lastUndo) { write(lastUndo.path, lastUndo.old); A().toast(t('Undone.'), 'ok'); lastUndo = null; } return true; }
      case 'voiceToggle': toggle(); return true;
      case 'voiceAgree': {
        const c = S().profile.consent; c.voice = true; c.voiceAt = new Date().toISOString(); A().touch();
        A().closeModal(); const f = pendingAfterConsent; pendingAfterConsent = null; if (f) f(); return true;
      }
      case 'voiceApply': apply(); return true;
      case 'voiceCopy': { try { navigator.clipboard.writeText((pending && pending.transcript) || ''); A().toast('Copied.', 'ok'); } catch (e) { /* ignore */ } return true; }
      case 'voiceConsentOff': { const c = S().profile.consent; c.voice = false; c.voiceAt = ''; A().touch(); A().route(); A().toast('Voice to Text turned off.', 'ok'); return true; }
      case 'closeModal': cancel(); return false; // let the app close it
    }
    return false;
  }

  function cancelAll() { cancel(); if (Q) { const had = Q.filled; qStop(); Q = null; if (had) A().route(); } }
  G.GrowVoice = { button, fieldMic, onClick, supported, hasConsent, cancel: cancelAll, init, unlocked, payModal, status: () => (order ? order.status : '') };
})(window);
