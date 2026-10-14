/* NegosyoPlan — Marketplace: External Support Services and other merchants (list in config.js → MARKETPLACE),
   plus "Invite a merchant": share an invitation or send a subscription request to OLEDIPO (Merchants tab). */
(function (G) {
  'use strict';
  const A = () => G.GrowApp, API = () => G.GrowAPI, Store = () => G.GrowStore;
  const esc = (s) => G.GrowDocs.esc(s);
  const t = (s) => G.I18N.t(s);
  const $ = (s) => document.querySelector(s);
  const list = () => (G.GROW_CONFIG && G.GROW_CONFIG.MARKETPLACE) || [];
  let filter = '';

  function initials(n) { return n.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase(); }
  function contacts(m) {
    const c = [];
    if (m.phone) c.push(`<a class="btn sm" href="tel:${esc(m.phone.replace(/\s/g, ''))}">${A().ic('send')} ${t('Call')} ${esc(m.phone)}</a>`);
    if (m.email) c.push(`<a class="btn sm ghost" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Inquiry from NegosyoPlan')}">${t('Email')}</a>`);
    if (m.facebook) c.push(`<a class="btn sm ghost" href="${esc(/^https?:/.test(m.facebook) ? m.facebook : 'https://' + m.facebook)}" target="_blank" rel="noopener">Facebook</a>`);
    return c.length ? `<div class="btns">${c.join('')}</div>` : `<p class="muted small">${A().ic('alert')} ${t('Contact details coming soon. Ask the LEDIP Center (OLEDIPO) to connect you.')}</p>`;
  }
  function view() {
    const cats = Array.from(new Set(list().map((m) => m.category)));
    const shown = list().filter((m) => !filter || m.category === filter);
    return `<div class="page-head"><div><h1>${t('Marketplace')}</h1><p class="muted">${t('External Support Services and other merchants for your business')}</p></div>
        <div class="btns"><button class="btn" data-act="mkInvite">${A().ic('users')} ${t('Invite a merchant')}</button></div></div>
      <div class="tabs" role="tablist"><button class="${!filter ? 'on' : ''}" data-act="mkFilter" data-c="">${t('All')}</button>${cats.map((c) => `<button class="${filter === c ? 'on' : ''}" data-act="mkFilter" data-c="${esc(c)}">${esc(t(c))}</button>`).join('')}</div>
      <div class="mk-grid">${shown.map((m) => `<article class="card mk" style="--mk:${esc(m.color || '#123A8C')}">
        <div class="mk-top"><span class="mk-logo" aria-hidden="true">${initials(m.name)}</span><div><span class="mk-cat">${A().ic(m.icon || 'docs')} ${esc(t(m.category))}</span><h3>${esc(m.name)}</h3></div></div>
        <p class="mk-tag">${esc(m.tagline || '')}</p>
        <ul class="mk-svc">${(m.services || []).map((x) => `<li>${A().ic('check')} ${esc(x)}</li>`).join('')}</ul>
        ${m.address ? `<p class="small">${esc(m.address)}</p>` : ''}${contacts(m)}</article>`).join('')}
        <article class="card mk mk-join"><div class="mk-top"><span class="mk-logo plus" aria-hidden="true">+</span><div><span class="mk-cat">${t('For merchants')}</span><h3>${t('List your business here')}</h3></div></div>
          <p class="mk-tag">${t('Offer your services to micro-entrepreneurs and EMBRACE applicants across Iloilo.')}</p>
          <div class="btns"><button class="btn" data-act="mkInvite">${t('Subscribe as a merchant')}</button></div></article></div>
      <p class="disclaimer">${A().ic('alert')} ${t('Merchants are independent businesses. OLEDIPO lists them for your convenience and does not guarantee their services or fees. Agree on prices directly with the merchant.')}</p>`;
  }
  function inviteModal() {
    const link = location.href.split('#')[0] + '#market';
    A().modal(`<h2>${A().ic('users')} ${t('Invite merchants')}</h2>
      <p>${t('Know a business that can help micro-entrepreneurs — accountants, consultants, printers, suppliers, delivery? Invite them to subscribe to the NegosyoPlan Marketplace.')}</p>
      <div class="btns"><button class="btn ghost" data-act="mkShare">${A().ic('send')} ${t('Share invitation')}</button></div>
      <h3>${t('Merchant subscription request')}</h3><p class="muted small">${t('For the merchant (or you on their behalf, with their permission). OLEDIPO will contact them about subscription terms.')}</p>
      <div class="row"><div class="fld"><label for="mkBiz">${t('Business name')} *</label><input id="mkBiz"></div><div class="fld"><label for="mkWho">${t('Contact person')} *</label><input id="mkWho" autocomplete="name"></div></div>
      <div class="row"><div class="fld"><label for="mkMob">${t('Mobile number')} *</label><input id="mkMob" type="tel" inputmode="tel" placeholder="09XXXXXXXXX"></div><div class="fld"><label for="mkMail">${t('Email address')}</label><input id="mkMail" type="email"></div></div>
      <div class="fld"><label for="mkLoc">${t('Location')}</label><input id="mkLoc" placeholder="e.g. Iloilo City"></div>
      <div class="fld"><label for="mkSvc">${t('Services offered')}</label><textarea id="mkSvc" rows="2"></textarea></div>
      <div class="fld"><label for="mkMsg">${t('Message')} <span class="opt">(${t('Optional')})</span></label><textarea id="mkMsg" rows="2"></textarea></div>
      <label class="toggle"><input type="checkbox" id="mkOk"> ${t('The merchant agrees to be contacted by OLEDIPO about the Marketplace subscription.')}</label>
      <div class="btns"><button class="btn big" data-act="mkSend">${A().ic('send')} ${t('Send request')}</button></div><p class="err" id="mkErr" role="alert"></p>`);
    G._mkLink = link;
  }
  async function onClick(a, b) {
    switch (a) {
      case 'mkFilter': filter = b.dataset.c; A().route(); return true;
      case 'mkInvite': inviteModal(); return true;
      case 'mkShare': {
        const text = 'Invitation: list your business on the NegosyoPlan Marketplace of OLEDIPO Iloilo and reach micro-entrepreneurs and EMBRACE applicants. Subscribe here: ' + G._mkLink;
        try { if (navigator.share) await navigator.share({ title: 'NegosyoPlan Marketplace', text }); else { await navigator.clipboard.writeText(text); A().toast(t('Invitation copied. Paste it in Messenger, SMS or email.'), 'ok'); } } catch (e) { /* cancelled */ }
        return true;
      }
      case 'mkSend': {
        const err = (m) => { $('#mkErr').textContent = m; };
        if (!$('#mkOk').checked) return err(t('Please confirm the merchant agrees to be contacted.')), true;
        if (!API().configured() || !navigator.onLine) return err(t('You need internet for this.')), true;
        let dev = await Store().getMeta('deviceId'); if (!dev) { dev = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); await Store().setMeta('deviceId', dev); }
        b.disabled = true;
        try {
          await API().call({ action: 'merchantApply', deviceId: dev, merchant: { business: $('#mkBiz').value, contact: $('#mkWho').value, mobile: $('#mkMob').value, email: $('#mkMail').value, location: $('#mkLoc').value, services: $('#mkSvc').value, message: $('#mkMsg').value } });
          A().closeModal(); A().toast(t('Thank you! OLEDIPO will contact the merchant about the subscription.'), 'ok');
        } catch (e) { err(e.message); b.disabled = false; }
        return true;
      }
    }
    return false;
  }
  G.GrowMarket = { view, onClick };
})(window);
