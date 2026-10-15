/* NegosyoPlan — splash (logo) → NegosyoPlan poster landing → install banner. 
   Images are plain files: assets/hero.jpg (poster), assets/hero-sm.jpg, assets/hero-blur.jpg, assets/logo-circle.png. */
(function (G) {
  'use strict';
  const CFG = () => G.GROW_CONFIG || {};

  /* logo for headers */
  function logo() {
    return '<span class="brand-logo" role="img" aria-label="NegosyoPlan"><img src="assets/logo-circle.png" alt="" width="44" height="44" draggable="false"></span>';
  }

  /* splash: the static #splash markup in index.html plays immediately; this ends it */
  function runSplash(after) {
    const splash = document.getElementById('splash');
    const reduce = G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!splash) { if (after) after(); return; }
    document.body.classList.add('is-splashing');
    let ended = false;
    const end = () => {
      if (ended) return; ended = true;
      splash.classList.add('leave'); document.body.classList.remove('is-splashing'); document.body.classList.add('reveal');
      setTimeout(() => splash.remove(), 800);
      if (after) after();
    };
    splash.addEventListener('click', end);
    setTimeout(end, reduce ? 300 : (CFG().SPLASH_MS || 2300));
  }

  /* full-screen poster landing */
  function show(onEnter, onStaff) {
    const splash = document.getElementById('splash');
    if (splash) splash.remove(); // keep it alive while the landing is drawn underneath
    document.body.innerHTML = `
    <div class="landing2" id="landing">
      <div class="lp-blur" aria-hidden="true"></div>
      <div class="lp-stage">
        <figure class="lp-poster">
          <img src="assets/hero.jpg" srcset="assets/hero-sm.jpg 512w, assets/hero.jpg 1024w" sizes="(max-width: 900px) 100vw, 600px" width="1024" height="1536" fetchpriority="high"
               alt="NegosyoPlan — Expanded Micro Business Recovery Assistance during Crisis and Emergency. Loan support for MSMEs and OFWs. Office of the Local Economic Development and Investment Promotion Officer, Iloilo Province.">
          <span class="lp-shine" aria-hidden="true"></span><span class="lp-sun" aria-hidden="true"></span>
          <span class="lp-spark k1" aria-hidden="true"></span><span class="lp-spark k2" aria-hidden="true"></span><span class="lp-spark k3" aria-hidden="true"></span>
          <span class="lp-spark k4" aria-hidden="true"></span><span class="lp-spark k5" aria-hidden="true"></span><span class="lp-spark k6" aria-hidden="true"></span>
        </figure>
        <div class="lp-panel">
          <button class="btn-enter" id="enterBtn"><span>Start NegosyoPlan</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
          <p class="lp-text">Prepare your <b>business plan</b> and <b>financial statements</b> step by step, keep your <b>MSME Enterprise Passport</b> and get your <b>EMBRACE loan requirements</b> ready — even without internet.</p>
          <div class="land-feats"><span>✓ Works offline</span><span>✓ English · Filipino · Hiligaynon</span></div>
          ${CFG().DEMO ? `<div class="demo-btns" role="group" aria-label="Demo">
            <button type="button" class="btn-demo" id="demoClient"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/></svg><span><b>Demo 1</b> Active borrower</span></button>
            <button type="button" class="btn-demo" id="demoNew"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22V11"/><path d="M12 11C12 6 8 3 3 3c0 5 4 8 9 8zM12 13c0-4 3-7 9-7 0 4-3 7-9 7z"/></svg><span><b>Demo 2</b> New applicant</span></button>
            <button type="button" class="btn-demo" id="demoBlank"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 12v6M9 15h6"/></svg><span><b>Demo 3</b> Blank — start from zero</span></button></div>` : ''}
          <p class="grow-by">Office of the Local Economic Development and Investment Promotion Officer · Iloilo Province<br>
            <button type="button" class="link-btn" id="installLink" hidden>Install app</button></p>
          <button type="button" class="ledip-btn on-dark" id="staffBtn" aria-label="NegosyoPlan Admin — log in"><img src="assets/ledip-icon.png" alt="" width="40" height="40" draggable="false"></button>
        </div>
      </div>
    </div><div id="toasts" aria-live="polite"></div>`;
    if (splash) document.body.appendChild(splash);
    const go = () => { if (G.GrowInstall) G.GrowInstall.hide(false); const l = document.getElementById('landing'); l.classList.add('leaving'); setTimeout(onEnter, G.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450); };
    document.getElementById('enterBtn').onclick = go;
    const demo = (kind) => { if (G.GrowInstall) G.GrowInstall.hide(false); const l = document.getElementById('landing'); l.classList.add('leaving'); setTimeout(() => G.GrowApp.startDemo(kind), 350); };
    const dc = document.getElementById('demoClient'), dv = document.getElementById('demoVoice');
    if (dc) dc.onclick = () => demo('client');
    const dn = document.getElementById('demoNew'); if (dn) dn.onclick = () => demo('new');
    const db = document.getElementById('demoBlank'); if (db) db.onclick = () => demo('blank');
    if (dv) dv.onclick = () => demo('voice');
    document.getElementById('staffBtn').onclick = (e) => { e.preventDefault(); if (G.GrowInstall) G.GrowInstall.hide(false); if (G.GrowAdmin && G.GrowAdmin.loginModal) G.GrowAdmin.loginModal(); else { location.hash = '#admin'; if (onStaff) onStaff(); } };
    const il = document.getElementById('installLink');
    if (G.GrowInstall && G.GrowInstall.available()) { il.hidden = false; il.onclick = () => G.GrowInstall.show(); }
    const land = document.getElementById('landing');
    land.addEventListener('pointermove', (e) => {
      land.style.setProperty('--px', (e.clientX / G.innerWidth - 0.5).toFixed(3)); land.style.setProperty('--py', (e.clientY / G.innerHeight - 0.5).toFixed(3));
    });
    runSplash(() => { setTimeout(() => { if (G.GrowInstall && document.getElementById('landing')) G.GrowInstall.maybeShow(); }, 1400); });
  }

  G.GrowLanding = { show, logo, runSplash };
})(window);
