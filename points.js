/* NegosyoPlan — Loan points.
   Applicants earn 1 point for every ₱100 (config POINTS.pesosPerPoint) they spend at NegosyoPlan Marketplace merchants,
   and need 100 points (POINTS.required) before they can submit an online loan application.
   A purchase is recorded with its receipt / OR number; OLEDIPO verifies it with the merchant before the points count.
   The server is the source of truth (Points tab); a copy is kept encrypted on the device for offline viewing. */
(function (G) {
  'use strict';
  const A = () => G.GrowApp, S = () => A().S, API = () => G.GrowAPI, Store = () => G.GrowStore;
  const esc = (s) => G.GrowDocs.esc(s);
  const ic = (k) => A().ic(k);
  const $ = (s) => document.querySelector(s);
  const CFG = () => (G.GROW_CONFIG && G.GROW_CONFIG.POINTS) || { required: 100, pesosPerPoint: 100 };
  const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 });
  let cache = null, loading = false;

  /* demo accounts keep their points on the device (nothing is sent online) */
  function demoState() {
    const p = S().profile; p.demoPoints = p.demoPoints || { claims: [] };
    const claims = p.demoPoints.claims;
    return { points: claims.filter((c) => c.status === 'Verified').reduce((t, c) => t + c.points, 0), required: CFG().required, pesosPerPoint: CFG().pesosPerPoint, claims, demo: true };
  }
  async function load(force) {
    if (S().demo) { cache = demoState(); return cache; }
    if (!cache) cache = await Store().getSecure('points').catch(() => null);
    if ((force || !cache || Date.now() - (cache.at || 0) > 120000) && S().session && navigator.onLine && API().configured() && !loading) {
      loading = true;
      try { const r = await API().call({ action: 'pointsMine', token: S().session.token }); cache = { at: Date.now(), points: r.points, required: r.required, pesosPerPoint: r.pesosPerPoint, claims: r.claims }; await Store().setSecure('points', cache); }
      catch (e) { /* keep cached */ }
      loading = false;
    }
    return cache;
  }
  function state() { return S().demo ? demoState() : (cache || { points: 0, required: CFG().required, pesosPerPoint: CFG().pesosPerPoint, claims: [] }); }
  function eligible() { const s = state(); return s.points >= s.required; }

  /* ---------- the points card (Apply page + Marketplace) */
  function card(where) {
    const s = state(), pct = Math.min(100, Math.round(s.points / s.required * 100)), need = Math.max(0, s.required - s.points);
    const pending = (s.claims || []).filter((c) => c.status === 'Pending');
    const ok = need === 0;
    return `<section class="form-card pts-card ${ok ? 'pts-ok' : ''}">
      <div class="pts-head"><div class="pts-ring" style="--p:${pct}"><b>${s.points}</b><small>/ ${s.required}</small></div>
        <div class="pts-txt"><h2>${ic('check')} Loan points</h2>
          <p>${ok ? `<b>You have enough points to apply online.</b>` : `You need <b>${need} more point${need === 1 ? '' : 's'}</b> to apply online, about <b>${peso(need * s.pesosPerPoint)}</b> of purchases.`}</p>
          <p class="muted small">Earn <b>1 point for every ${peso(s.pesosPerPoint)}</b> you spend at NegosyoPlan Marketplace merchants. Record each purchase with its receipt; OLEDIPO verifies it with the merchant.${pending.length ? ` <b>${pending.length}</b> purchase${pending.length === 1 ? ' is' : 's are'} waiting for verification (${pending.reduce((t, c) => t + c.points, 0)} pts).` : ''}</p></div></div>
      <div class="pts-bar" role="img" aria-label="${s.points} of ${s.required} points"><i style="width:${pct}%"></i></div>
      <div class="btns"><button type="button" class="btn" data-act="ptsClaim">${ic('plus')} Record a purchase</button>${where !== 'market' ? `<a class="btn ghost" href="#market">${ic('store')} Go to Marketplace</a>` : ''}${S().session && !s.demo ? `<button type="button" class="btn ghost" data-act="ptsRefresh">${ic('cloud')} Refresh</button>` : ''}</div>
      ${(s.claims || []).length ? `<details class="pts-list"><summary>My purchases (${s.claims.length})</summary><div class="scroll"><table class="tbl"><tr><th>Date</th><th>Merchant</th><th>Receipt</th><th class="r">Amount</th><th class="r">Points</th><th>Status</th></tr>
        ${s.claims.map((c) => `<tr><td>${esc(c.date || '')}</td><td>${esc(c.merchant)}</td><td>${esc(c.orNo || '')}</td><td class="r">${peso(c.amount)}</td><td class="r">${c.points}</td><td><span class="pst pst-${esc(String(c.status).toLowerCase())}">${esc(c.status)}</span>${c.notes ? `<br><small class="muted">${esc(c.notes)}</small>` : ''}</td></tr>`).join('')}</table></div></details>` : ''}
    </section>`;
  }

  /* ---------- record a purchase */
  function claimModal(merchantId) {
    const list = (G.GROW_CONFIG && G.GROW_CONFIG.MARKETPLACE) || [];
    const today = new Date().toISOString().slice(0, 10);
    A().modal(`<h2>${ic('plus')} Record a Marketplace purchase</h2>
      <p class="muted small">1 point for every ${peso(CFG().pesosPerPoint)}. Points count after OLEDIPO verifies the receipt with the merchant.</p>
      <div class="fld"><label for="ptMerchant">Merchant</label><select id="ptMerchant">${list.map((m) => `<option value="${esc(m.id)}" ${m.id === merchantId ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></div>
      <div class="row"><div class="fld"><label for="ptDate">Date of purchase</label><input id="ptDate" type="date" value="${today}" max="${today}"></div>
        <div class="fld"><label for="ptAmount">Amount paid</label><div class="affix"><span class="pre">₱</span><input id="ptAmount" inputmode="decimal" placeholder="e.g. 2,500"></div></div></div>
      <div class="fld"><label for="ptOr">Receipt / OR number</label><input id="ptOr" autocomplete="off" placeholder="as printed on the receipt"></div>
      <div class="fld"><label for="ptPhoto">Photo of the receipt <span class="opt">(recommended)</span></label><input id="ptPhoto" type="file" accept="image/*"></div>
      <p class="pts-preview" id="ptPreview">You will earn <b>0</b> points.</p>
      <div class="btns"><button class="btn big" data-act="ptsSend">${ic('check')} Submit purchase</button></div><p class="err" id="ptErr" role="alert"></p>`);
    const amt = $('#ptAmount');
    amt.oninput = () => { const v = Number(String(amt.value).replace(/[₱,\s]/g, '')) || 0; $('#ptPreview').innerHTML = `You will earn <b>${Math.floor(v / CFG().pesosPerPoint)}</b> point${Math.floor(v / CFG().pesosPerPoint) === 1 ? '' : 's'}.`; };
    amt.focus();
  }
  function shrink(file) {
    return new Promise((res) => { const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => { const m = 1400, k = Math.min(1, m / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.8)); }; img.onerror = () => res(r.result); img.src = r.result; }; r.readAsDataURL(file); });
  }
  async function send(btn) {
    const err = (m) => { $('#ptErr').textContent = m; };
    const sel = $('#ptMerchant'), merchant = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '';
    const amount = Number(String($('#ptAmount').value).replace(/[₱,\s]/g, '')) || 0, orNo = $('#ptOr').value.trim(), date = $('#ptDate').value;
    if (amount < CFG().pesosPerPoint) return err('Enter the amount paid (at least ' + peso(CFG().pesosPerPoint) + ').');
    if (!orNo) return err('Enter the receipt / OR number.');
    const claim = { merchantId: sel.value, merchant, date, amount, orNo };
    if (S().demo) {   // demo: verified at once so the presenter can show points growing
      const st = demoState(); st.claims.unshift(Object.assign({ id: 'DEMO-' + Date.now(), points: Math.floor(amount / CFG().pesosPerPoint), status: 'Verified', notes: 'Demo — auto-verified' }, claim));
      A().touch(); A().closeModal(); A().route(); A().toast(`+${Math.floor(amount / CFG().pesosPerPoint)} points (demo)`, 'ok'); return;
    }
    if (!API().configured() || !navigator.onLine) return err('You need internet to record a purchase.');
    if (!S().session) { A().closeModal(); A().toast('Create your online account first so OLEDIPO can verify your purchases.', 'err'); return A().accountDialog('register'); }
    btn.disabled = true;
    try {
      const f = $('#ptPhoto').files[0]; if (f) claim.receipt = { data: await shrink(f), mime: 'image/jpeg' };
      const r = await API().call({ action: 'pointsClaim', token: S().session.token, claim });
      cache = { at: Date.now(), points: r.points, required: r.required, pesosPerPoint: r.pesosPerPoint, claims: r.claims }; await Store().setSecure('points', cache);
      A().closeModal(); A().route(); A().toast(`Purchase recorded: ${Math.floor(amount / CFG().pesosPerPoint)} points after verification.`, 'ok');
    } catch (e) { err(e.message); btn.disabled = false; }
  }
  function onClick(a, b) {
    switch (a) {
      case 'ptsClaim': claimModal(b.dataset.m); return true;
      case 'ptsSend': send(b); return true;
      case 'ptsRefresh': load(true).then(() => A().route()); return true;
    }
    return false;
  }
  function setDemo(p, points) {   // used by the demo accounts (p = the demo profile)
    const per = CFG().pesosPerPoint, merchants = ((G.GROW_CONFIG && G.GROW_CONFIG.MARKETPLACE) || []).map((m) => m.name);
    const claims = []; let left = points, k = 0;
    while (left > 0) { const pts = Math.min(left, [40, 35, 25, 30][k % 4]); claims.push({ id: 'DEMO-' + k, merchant: merchants[k % merchants.length] || 'Marketplace merchant', merchantId: '', date: new Date(Date.now() - (k + 1) * 9 * 864e5).toISOString().slice(0, 10), amount: pts * per, orNo: String(40211 + k * 7), points: pts, status: 'Verified', notes: '' }); left -= pts; k++; }
    p.demoPoints = { claims };
  }
  G.GrowPoints = { load, state, eligible, card, onClick, setDemo };
})(window);
