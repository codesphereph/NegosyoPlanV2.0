/* NegosyoPlan Admin — Dashboard (summary cards, today's interviews, weekly online submissions)
   and Insights (funnel, follow-ups, timing, 24/7 usage, districts, loan portfolio, Voice to Text).
   One backend call (adminDashboard); everything else is computed here. Charts: one hue, labelled, with table view. */
(function (G) {
  'use strict';
  const A = () => G.GrowApp, C = () => G.GrowCalc;
  const esc = (s) => G.GrowDocs.esc(s);
  const ic = (k) => A().ic(k);
  const DAY = 864e5;
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const PIPE = ['Pending Upon Review', 'Submitted Documents on Review', 'Scheduled for Interview', 'For TWG Evaluation', 'Approved', 'Released', 'Fully Paid'];

  /* ---------- helpers */
  const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });
  const pesoK = (n) => { n = Number(n || 0); return n >= 1e6 ? '₱' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e4 ? '₱' + Math.round(n / 1e3) + 'K' : peso(n); };
  const num = (n) => Number(n || 0).toLocaleString('en-PH');
  const d0 = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const sunday = (d) => { const x = d0(d); x.setDate(x.getDate() - x.getDay()); return x; };
  const sameDay = (a, b) => a && b && d0(a).getTime() === d0(b).getTime();
  const ymd = (d) => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const fdate = (d, o) => new Date(d).toLocaleDateString('en-PH', o || { month: 'short', day: 'numeric' });
  const submitted = (a) => a.submittedAt && a.status !== 'Draft';
  const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
  const stage = (s) => (s === 'Disapproved' ? PIPE.indexOf('For TWG Evaluation') : PIPE.indexOf(s));

  const CT = { Active: 'ct-active', 'Fully Paid': 'ct-paid', 'New Applicant': 'ct-new' };
  const ctBadge = (t) => (t ? `<span class="ct-badge ${CT[t] || ''}">${esc(t)}</span>` : '');
  function tile(label, value, sub, opts) {
    opts = opts || {};
    return `<${opts.act ? 'button' : 'div'} class="dtile ${opts.cls || ''}" ${opts.act ? `data-act="${opts.act}" data-s="${esc(opts.s || '')}"` : ''}>
      <span class="dt-label">${opts.icon ? ic(opts.icon) : ''}${esc(label)}</span><b class="dt-value">${value}</b>${sub ? `<span class="dt-sub">${sub}</span>` : ''}</${opts.act ? 'button' : 'div'}>`;
  }
  function delta(cur, prev, label) {
    if (!prev && !cur) return `<span class="muted">no change ${label}</span>`;
    const d = cur - prev, sign = d > 0 ? '+' : d < 0 ? '−' : '±';
    return `<span class="dlt ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${sign}${Math.abs(d)}</span> ${label}`;
  }

  /* horizontal bar list — one hue, value at the tip in text ink, hover = title + tooltip */
  function hbars(rows, opts) {
    opts = opts || {};
    const max = Math.max(1, ...rows.map((r) => r.v));
    return `<ul class="hbars" role="list">${rows.map((r) => `<li title="${esc(r.label)}: ${esc(r.tip || num(r.v))}">
      <span class="hb-l">${esc(r.label)}</span><span class="hb-track"><i style="width:${r.v ? Math.max(2, r.v / max * 100) : 0}%"></i></span><span class="hb-v">${r.text != null ? r.text : num(r.v)}</span></li>`).join('')}</ul>`;
  }

  /* weekly column chart: Sun..Sat */
  function weekChart(counts, days, todayIdx, title) {
    const W = 640, H = 220, pl = 34, pr = 10, pt = 22, pb = 40, bw = 24;
    const max = Math.max(4, ...counts), step = max <= 5 ? 1 : Math.ceil(max / 4);
    const top = Math.ceil(max / step) * step, ih = H - pt - pb, iw = W - pl - pr, slot = iw / 7;
    const y = (v) => pt + ih - (v / top) * ih;
    let grid = '';
    for (let v = 0; v <= top; v += step) grid += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="g"/><text x="${pl - 6}" y="${y(v) + 4}" class="ax" text-anchor="end">${v}</text>`;
    const bars = counts.map((c, i) => {
      const cx = pl + slot * i + slot / 2, x = cx - bw / 2, h = c ? Math.max(3, (c / top) * ih) : 0, yy = pt + ih - h, future = todayIdx >= 0 && i > todayIdx;
      const r = Math.min(4, h);
      const path = h ? `M${x},${pt + ih} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + bw - r} Q${x + bw},${yy} ${x + bw},${yy + r} V${pt + ih} Z` : '';
      return `<g class="col${i === todayIdx ? ' today' : ''}${future ? ' future' : ''}" data-tip="${esc(DOW[i] + ', ' + fdate(days[i]) + ': ' + c + ' submission' + (c === 1 ? '' : 's'))}">
        <rect x="${cx - slot / 2}" y="${pt}" width="${slot}" height="${ih + pb}" class="hit"/>
        ${path ? `<path d="${path}" class="bar"/>` : `<line x1="${x}" x2="${x + bw}" y1="${pt + ih}" y2="${pt + ih}" class="zero"/>`}
        ${c ? `<text x="${cx}" y="${yy - 6}" text-anchor="middle" class="val">${c}</text>` : ''}
        <text x="${cx}" y="${H - pb + 18}" text-anchor="middle" class="ax ${i === todayIdx ? 'on' : ''}">${DOW[i]}</text>
        <text x="${cx}" y="${H - pb + 32}" text-anchor="middle" class="ax sm">${fdate(days[i], { day: 'numeric' })}</text></g>`;
    }).join('');
    return `<figure class="wchart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${grid}<line x1="${pl}" x2="${W - pr}" y1="${pt + ih}" y2="${pt + ih}" class="base"/>${bars}</svg>
      <div class="ctip" hidden></div></figure>`;
  }
  function bindTips(root) {
    root.querySelectorAll('.wchart').forEach((fig) => {
      const tip = fig.querySelector('.ctip');
      fig.querySelectorAll('.col').forEach((g) => {
        const show = (e) => { tip.hidden = false; tip.textContent = g.dataset.tip; const r = fig.getBoundingClientRect(), b = g.querySelector('.hit').getBoundingClientRect();
          tip.style.left = (b.left - r.left + b.width / 2) + 'px'; tip.style.top = '0px'; fig.querySelectorAll('.col').forEach((x) => x.classList.toggle('hov', x === g)); };
        g.addEventListener('mouseenter', show); g.addEventListener('focus', show); g.addEventListener('click', show);
        g.setAttribute('tabindex', '0');
      });
      fig.addEventListener('mouseleave', () => { tip.hidden = true; fig.querySelectorAll('.col').forEach((x) => x.classList.remove('hov')); });
    });
  }

  /* ================================================== DASHBOARD */
  function dashboard(data, ui) {
    const now = new Date(data.now || Date.now()), apps = data.applicants || [], loans = data.loans || [];
    const subs = apps.filter(submitted);
    const wk = new Date(sunday(now).getTime() + (ui.week || 0) * 7 * DAY);
    const days = Array.from({ length: 7 }, (_, i) => new Date(wk.getTime() + i * DAY));
    const counts = days.map((d) => subs.filter((a) => sameDay(a.submittedAt, d)).length);
    const prevCounts = days.map((d) => subs.filter((a) => sameDay(a.submittedAt, new Date(d.getTime() - 7 * DAY))).length);
    const todayIdx = days.findIndex((d) => sameDay(d, now));
    const thisWeek = counts.reduce((s, x) => s + x, 0), lastWeekSame = prevCounts.slice(0, todayIdx >= 0 ? todayIdx + 1 : 7).reduce((s, x) => s + x, 0);
    const sc = {}; apps.forEach((a) => { sc[a.status] = (sc[a.status] || 0) + 1; });
    const ivDay = ui.ivDay ? new Date(ui.ivDay + 'T00:00:00') : d0(now);
    const ivs = apps.filter((a) => a.interview && a.interview.at && sameDay(a.interview.at, ivDay)).sort((a, b) => String(a.interview.at).localeCompare(String(b.interview.at)));
    const out = loans.filter((l) => l.balance > 0), pastDue = out.filter((l) => /Past due|Default/.test(l.status));
    const toVerify = (data.orders || []).filter((o) => o.status === 'Payment submitted').length;
    const signupsWeek = apps.filter((a) => a.createdAt && new Date(a.createdAt) >= sunday(now)).length;
    const ivToday = apps.filter((a) => a.interview && a.interview.at && sameDay(a.interview.at, now)).length;
    const wkLabel = fdate(days[0], { month: 'long', day: 'numeric' }) + ' – ' + fdate(days[6], { month: 'long', day: 'numeric', year: 'numeric' });
    const inPipe = subs.filter((a) => ['Approved', 'Released', 'Fully Paid', 'Disapproved'].indexOf(a.status) < 0);
    const newApps = inPipe.filter((a) => a.clientType === 'New Applicant').length, reloanBlocked = inPipe.filter((a) => a.clientType === 'Active');
    const activeBorrowers = loans.filter((l) => l.balance > 0.5).length;
    const ptsPending = (data.points || []).filter((x) => x.status === 'Pending').length;
    const fee = data.fee || { total: 100, codesphere: 70, oledipo: 30 };
    const feeCount = subs.length;

    return `<div class="page-head"><div><h1>Dashboard</h1><p class="muted">${esc(now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))} · NegosyoPlan is open 24/7</p></div>
        <div class="btns"><button class="btn ghost" data-act="adDashRefresh">${ic('cloud')} Refresh</button></div></div>
      <div class="dtiles">
        ${tile('Online applications', num(subs.length), `${num(thisWeek)} this week · ${delta(thisWeek, lastWeekSame, 'vs last week')}`, { icon: 'send', cls: 'dt-hero' })}
        ${tile('Pending Upon Review', num(sc['Pending Upon Review'] || 0), 'waiting for first review', { icon: 'alert', act: 'adGoStatus', s: 'Pending Upon Review' })}
        ${tile('Documents on Review', num(sc['Submitted Documents on Review'] || 0), 'being checked', { icon: 'docs', act: 'adGoStatus', s: 'Submitted Documents on Review' })}
        ${tile('Interviews today', num(ivToday), `${num(sc['Scheduled for Interview'] || 0)} scheduled in total`, { icon: 'users', act: 'adGoStatus', s: 'Scheduled for Interview' })}
        ${tile('New Applicants', num(newApps), 'first-time applicants in process', { icon: 'sprout', act: 'adGoType', s: 'New Applicant' })}
        ${tile('Active borrowers', num(activeBorrowers), reloanBlocked.length ? `<b>${reloanBlocked.length}</b> applied again with a balance — reloan not allowed` : 'outstanding balance · no reloan until paid', { icon: 'loan', cls: reloanBlocked.length ? 'warn' : '', act: 'adGoType', s: 'Active' })}
        ${tile('New sign-ups this week', num(signupsWeek), `${num(apps.length)} accounts in total`, { icon: 'id' })}
        ${tile('Outstanding loans', pesoK(out.reduce((s, l) => s + l.balance, 0)), `${num(out.length)} active loan${out.length === 1 ? '' : 's'}`, { icon: 'loan', act: 'adTabS', s: 'loans' })}
        ${tile('Past due', num(pastDue.length), pastDue.length ? peso(pastDue.reduce((s, l) => s + l.arrears, 0)) + ' unpaid amortizations' : 'all loans on time', { icon: 'alert', cls: pastDue.length ? 'warn' : '', act: 'adTabS', s: 'loans' })}
        ${tile('Purchases to verify', num(ptsPending), 'Marketplace receipts for loan points', { icon: 'store', cls: ptsPending ? 'warn' : '', act: 'adTabS', s: 'points' })}
        ${tile('Processing fees', peso(feeCount * fee.total), `${num(feeCount)} × ₱${fee.total} · ₱${num(feeCount * fee.codesphere)} CodeSphere · ₱${num(feeCount * fee.oledipo)} OLEDIPO · collected at release`, { icon: 'loan' })}
        ${tile('GCash to verify', num(toVerify), 'Voice to Text payments', { icon: 'check', cls: toVerify ? 'warn' : '', act: 'adTabS', s: 'orders' })}
      </div>
      <section class="form-card"><div class="sec-head"><h2>${ic('users')} Scheduled Interviews for ${sameDay(ivDay, now) ? 'Today' : 'the Day'}</h2>
          <div class="row-inline"><button class="icon-btn" data-act="adIvDay" data-d="-1" aria-label="Previous day">${ic('arrowL')}</button>
          <input type="date" id="adIvDate" value="${ymd(ivDay)}" aria-label="Interview date"><button class="icon-btn" data-act="adIvDay" data-d="1" aria-label="Next day">${ic('arrowR')}</button></div></div>
        <p class="muted small">${esc(ivDay.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))} · ${ivs.length} interview${ivs.length === 1 ? '' : 's'}</p>
        <div class="scroll"><table class="tbl admin"><tr><th>Time</th><th>Applicant</th><th>Business</th><th>Mobile</th><th class="r">Loan</th><th>Venue</th><th>Status</th><th></th></tr>
        ${ivs.map((a) => `<tr><td><b>${esc(new Date(a.interview.at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }))}</b></td><td>${esc(a.name || '—')} ${ctBadge(a.clientType)}${a.no ? `<br><small>No. ${esc(a.no)}</small>` : ''}</td>
          <td>${esc(a.business || '—')}</td><td>${a.mobile ? `<a href="tel:${esc(a.mobile)}">${esc(a.mobile)}</a>` : '—'}</td><td class="r">${a.amount ? peso(a.amount) : ''}</td>
          <td>${esc(a.interview.venue || '')}</td><td><span class="st st-${esc(String(a.status).replace(/\s/g, ''))}">${esc(a.status)}</span></td>
          <td><button class="btn sm" data-act="adOpen" data-id="${esc(a.id)}">Open</button></td></tr>`).join('') || `<tr><td colspan="8" class="muted">No interviews scheduled for this day.</td></tr>`}</table></div></section>
      <section class="form-card"><div class="sec-head"><div><h2>${ic('chart')} Online submissions — daily, week starting Sunday</h2><p class="muted small">${esc(wkLabel)} · <b>${num(thisWeek)}</b> submitted${ui.week ? '' : ' so far'}</p></div>
          <div class="row-inline"><button class="icon-btn" data-act="adWeek" data-d="-1" aria-label="Previous week">${ic('arrowL')}</button>
          <button class="btn sm ghost" data-act="adWeek" data-d="0" ${!ui.week ? 'disabled' : ''}>This week</button>
          <button class="icon-btn" data-act="adWeek" data-d="1" aria-label="Next week" ${ui.week >= 0 ? 'disabled' : ''}>${ic('arrowR')}</button></div></div>
        ${weekChart(counts, days, ui.week ? -1 : todayIdx, 'Online submissions per day, ' + wkLabel)}
        <details class="small"><summary>Table view</summary><table class="tbl"><tr><th>Day</th>${days.map((d, i) => `<th class="r">${DOW[i]} ${fdate(d)}</th>`).join('')}<th class="r">Total</th></tr>
          <tr><td>This week</td>${counts.map((c) => `<td class="r">${c}</td>`).join('')}<td class="r"><b>${thisWeek}</b></td></tr>
          <tr><td>Week before</td>${prevCounts.map((c) => `<td class="r">${c}</td>`).join('')}<td class="r">${prevCounts.reduce((s, x) => s + x, 0)}</td></tr></table></details></section>
      <section class="form-card"><h2>${ic('send')} Application pipeline</h2>
        ${hbars(['Draft'].concat(PIPE.slice(0, 5), ['Disapproved', 'Released', 'Fully Paid']).map((s) => ({ label: s, v: sc[s] || 0 })))}
        <p class="muted small">Draft = signed up but not yet submitted. Tap a summary card to open that list.</p></section>`;
  }

  /* ================================================== INSIGHTS */
  function insights(data) {
    const now = new Date(data.now || Date.now()), apps = data.applicants || [], loans = data.loans || [], orders = data.orders || [];
    const subs = apps.filter(submitted);
    const drafts = apps.filter((a) => a.status === 'Draft');
    // funnel: reached at least this stage
    const reached = (i) => subs.filter((a) => stage(a.status) >= i).length;
    const funnel = [{ label: 'Accounts created', v: apps.length }, { label: 'Submitted online', v: subs.length },
      { label: 'Documents reviewed', v: reached(1) }, { label: 'Interviewed / scheduled', v: reached(2) }, { label: 'Approved', v: subs.filter((a) => stage(a.status) >= 4 && a.status !== 'Disapproved').length },
      { label: 'Released', v: subs.filter((a) => stage(a.status) >= 5).length }];
    funnel.forEach((f, i) => { f.text = num(f.v) + (i ? ` <small>${pct(f.v, funnel[i - 1].v)}%</small>` : ''); f.tip = num(f.v) + (i ? ` (${pct(f.v, funnel[i - 1].v)}% of previous step)` : ''); });
    // waiting too long
    const waitDays = (a) => { const h = (a.history || []).filter((x) => x.status === a.status).pop(); const since = h ? h.at : a.submittedAt; return since ? Math.floor((now - new Date(since)) / DAY) : 0; };
    const stuck = subs.filter((a) => ['Pending Upon Review', 'Submitted Documents on Review'].indexOf(a.status) >= 0).map((a) => Object.assign({ wait: waitDays(a) }, a)).filter((a) => a.wait >= 3).sort((a, b) => b.wait - a.wait);
    // ready drafts (nudge to submit)
    const ready = drafts.filter((a) => a.completeness >= 80).sort((a, b) => b.completeness - a.completeness);
    // top missing items among drafts
    const miss = {}; drafts.forEach((a) => a.missing.split(';').map((x) => x.trim()).filter(Boolean).forEach((m) => { miss[m] = (miss[m] || 0) + 1; }));
    const topMiss = Object.entries(miss).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => ({ label: k, v, tip: v + ' applicant(s)' }));
    // time to interview
    const t2i = subs.map((a) => { const h = (a.history || []).find((x) => x.status === 'Scheduled for Interview'); return h && a.submittedAt ? (new Date(h.at) - new Date(a.submittedAt)) / DAY : null; }).filter((x) => x != null && x >= 0).sort((a, b) => a - b);
    const median = t2i.length ? t2i[Math.floor(t2i.length / 2)] : null;
    // 24/7 usage
    const off = subs.filter((a) => { const d = new Date(a.submittedAt), h = d.getHours(), w = d.getDay(); return w === 0 || w === 6 || h < 8 || h >= 17; }).length;
    const byDow = DOW.map((d, i) => ({ label: d, v: subs.filter((a) => new Date(a.submittedAt).getDay() === i).length }));
    const slots = [['12 MN – 6 AM', 0, 6], ['6 AM – 8 AM', 6, 8], ['8 AM – 12 NN', 8, 12], ['12 NN – 5 PM', 12, 17], ['5 PM – 9 PM', 17, 21], ['9 PM – 12 MN', 21, 24]];
    const byHour = slots.map(([l, a, b]) => ({ label: l, v: subs.filter((x) => { const h = new Date(x.submittedAt).getHours(); return h >= a && h < b; }).length }));
    // districts
    const byDist = ['1', '2', '3', '4', '5'].map((d) => ({ label: 'District ' + d, v: apps.filter((a) => a.district === d).length }));
    const noDist = apps.filter((a) => !a.district).length; if (noDist) byDist.push({ label: 'Not stated', v: noDist });
    // demand
    const pipeAmt = subs.filter((a) => ['Approved', 'Released', 'Fully Paid', 'Disapproved'].indexOf(a.status) < 0).reduce((s, a) => s + a.amount, 0);
    const amts = subs.map((a) => a.amount).filter((x) => x > 0);
    // portfolio
    const rel = loans.reduce((s, l) => s + l.amount, 0), coll = loans.reduce((s, l) => s + l.paid, 0), outB = loans.reduce((s, l) => s + l.balance, 0);
    const pd = loans.filter((l) => /Past due|Default/.test(l.status)), par = outB ? pd.reduce((s, l) => s + l.balance, 0) / outB * 100 : 0;
    const lst = {}; loans.forEach((l) => { lst[l.status] = (lst[l.status] || 0) + 1; });
    const maturing = loans.filter((l) => l.balance > 0 && l.maturity && new Date(l.maturity) - now < 60 * DAY && new Date(l.maturity) >= d0(now));
    // voice
    const vPaid = orders.filter((o) => o.service === 'voice' && (o.status === 'Paid' || o.status === 'Completed'));
    const vRev = vPaid.reduce((s, o) => s + o.amount, 0);
    const sampleNote = loans.some((l) => l.sample) ? '<p class="hint small">' + ic('alert') + ' Loan figures include SAMPLE data. Delete the SAMPLE rows before going live.</p>' : '';

    // client type: New Applicant / Active (outstanding balance) / Fully Paid
    const ctRows = ['New Applicant', 'Active', 'Fully Paid'].map((t) => ({ label: t === 'Active' ? 'Active (outstanding balance)' : t === 'Fully Paid' ? 'Fully Paid (may reloan)' : t, v: subs.filter((a) => a.clientType === t).length }));
    const blocked = subs.filter((a) => a.clientType === 'Active' && ['Approved', 'Released', 'Fully Paid', 'Disapproved'].indexOf(a.status) < 0);
    const newShare = pct(ctRows[0].v, subs.length);
    // marketplace purchases & loan points
    const PT = data.points || [], req = data.pointsRequired || 100, ppp = data.pesosPerPoint || 100;
    const ptsV = PT.filter((x) => x.status === 'Verified'), buy = ptsV.reduce((t, x) => t + x.amount, 0);
    const byMer = {}; ptsV.forEach((x) => { byMer[x.merchant] = (byMer[x.merchant] || 0) + x.amount; });
    const merRows = Object.entries(byMer).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => ({ label: k, v, text: peso(v), tip: peso(v) }));
    const ptsReached = apps.filter((a) => (a.points || 0) >= req).length, ptsClose = apps.filter((a) => a.status === 'Draft' && (a.points || 0) >= req * 0.5 && (a.points || 0) < req);
    const feeD = data.fee || { total: 100, codesphere: 70, oledipo: 30 };
    // key insights in plain language
    const K = [];
    if (ptsV.length) K.push(`Applicants bought <b>${peso(buy)}</b> from Marketplace merchants to earn loan points; <b>${num(ptsReached)}</b> applicant${ptsReached === 1 ? ' has' : 's have'} reached ${req} points. This is the sales story to attract more merchants.`);
    if (ptsClose.length) K.push(`<b>${num(ptsClose.length)}</b> draft applicant${ptsClose.length === 1 ? ' is' : 's are'} halfway or more to ${req} points. Merchant promos could help them finish.`);
    if (subs.length) K.push(`Online processing fees: <b>${peso(subs.length * feeD.total)}</b> to collect at release (₱${num(subs.length * feeD.codesphere)} CodeSphere PH, ₱${num(subs.length * feeD.oledipo)} OLEDIPO).`);
    if (subs.length) K.push(`<b>${newShare}%</b> of online applications come from <b>New Applicants</b> (first EMBRACE loan); ${num(ctRows[2].v)} from fully paid borrowers applying again.`);
    if (blocked.length) K.push(`<b>${num(blocked.length)}</b> application${blocked.length === 1 ? ' is' : 's are'} from <b>Active</b> borrowers who still have an outstanding balance. Reloans are not allowed until full payment, so these should not be processed.`);
    if (apps.length) K.push(`<b>${pct(subs.length, apps.length)}%</b> of accounts have submitted an application (${num(subs.length)} of ${num(apps.length)}).`);
    if (ready.length) K.push(`<b>${num(ready.length)}</b> applicant${ready.length === 1 ? ' has' : 's have'} a draft that is at least 80% complete but not submitted yet. A reminder call could turn these into submissions.`);
    if (stuck.length) K.push(`<b>${num(stuck.length)}</b> submitted application${stuck.length === 1 ? ' is' : 's are'} waiting 3 days or more for review (longest: ${stuck[0].wait} days).`);
    if (subs.length) K.push(`<b>${pct(off, subs.length)}%</b> of applications were sent outside office hours (before 8 AM, after 5 PM or on weekends), which shows the value of a 24/7 app.`);
    if (median != null) K.push(`Median time from submission to a scheduled interview: <b>${median < 1 ? 'less than a day' : Math.round(median) + ' day' + (Math.round(median) === 1 ? '' : 's')}</b>.`);
    if (topMiss.length) K.push(`The most common missing item in drafts is “${esc(topMiss[0].label)}” (${topMiss[0].v} applicant${topMiss[0].v === 1 ? '' : 's'}). Consider a help session or a short guide on it.`);
    if (outB) K.push(`Portfolio at risk: <b>${par.toFixed(1)}%</b> of the outstanding balance is past due (${num(pd.length)} loan${pd.length === 1 ? '' : 's'}).`);
    if (maturing.length) K.push(`<b>${num(maturing.length)}</b> loan${maturing.length === 1 ? ' matures' : 's mature'} within 60 days. Plan the final collection and a possible repeat loan.`);

    return `<div class="page-head"><div><h1>Insights</h1><p class="muted">What the numbers say, and where OLEDIPO can act · updated ${esc(now.toLocaleString('en-PH'))}</p></div>
        <div class="btns"><button class="btn ghost" data-act="adDashRefresh">${ic('cloud')} Refresh</button></div></div>
      <section class="form-card insight-key"><h2>${ic('bulb')} Key insights</h2>${K.length ? `<ul>${K.map((k) => `<li>${k}</li>`).join('')}</ul>` : '<p class="muted">Not enough data yet.</p>'}</section>
      <div class="grid2">
        <section class="form-card"><h2>${ic('send')} Application funnel</h2>${hbars(funnel)}<p class="muted small">Each step counts applicants who reached at least that stage; the % is the share of the previous step.</p></section>
        <section class="form-card"><h2>${ic('users')} Who is applying</h2>${hbars(ctRows)}
          <p class="muted small">New Applicant = no EMBRACE loan yet · Active = has an outstanding balance (reloan not allowed until fully paid) · Fully Paid = previous loan completed.</p>
          ${blocked.length ? `<h3>Active borrowers who applied again</h3><ul class="flist">${blocked.slice(0, 6).map((a) => `<li><button class="link-btn" data-act="adOpen" data-id="${esc(a.id)}">${esc(a.name || a.id)}</button> <span class="muted">balance ${peso(a.balance)} · ${esc(a.status)}</span></li>`).join('')}</ul>` : ''}</section>
      </div>
      <div class="grid2">
        <section class="form-card"><h2>${ic('alert')} Needs follow-up</h2>
          <h3>Waiting 3+ days for review</h3>${stuck.length ? `<ul class="flist">${stuck.slice(0, 6).map((a) => `<li><button class="link-btn" data-act="adOpen" data-id="${esc(a.id)}">${esc(a.name || a.id)}</button> <span class="muted">${esc(a.status)} · ${a.wait} days</span></li>`).join('')}</ul>` : '<p class="muted small">None. Reviews are on time.</p>'}
          <h3>Ready drafts to remind (≥ 80% complete)</h3>${ready.length ? `<ul class="flist">${ready.slice(0, 6).map((a) => `<li><b>${esc(a.name || a.id)}</b> <span class="muted">${a.completeness}%${a.mobile ? ` · <a href="tel:${esc(a.mobile)}">${esc(a.mobile)}</a>` : ''}</span></li>`).join('')}</ul>` : '<p class="muted small">None right now.</p>'}</section>
      </div>
      <div class="grid2">
        <section class="form-card"><h2>${ic('chart')} When applicants submit</h2>
          <div class="dtiles mini">${tile('Outside office hours', pct(off, subs.length) + '%', num(off) + ' of ' + num(subs.length))}${tile('Median days to interview', median == null ? '—' : (median < 1 ? '< 1' : String(Math.round(median))), t2i.length + ' applicant(s) measured')}</div>
          <h3>By day of the week</h3>${hbars(byDow)}<h3>By time of day</h3>${hbars(byHour)}</section>
        <section class="form-card"><h2>${ic('globe')} Where applicants are</h2>${hbars(byDist)}
          <h2 class="mt">${ic('docs')} Most common missing items (drafts)</h2>${topMiss.length ? hbars(topMiss) : '<p class="muted small">No missing items recorded.</p>'}</section>
      </div>
      <div class="grid2">
        <section class="form-card"><h2>${ic('loan')} Loan portfolio</h2>${sampleNote}
          <div class="dtiles mini">${tile('Released', pesoK(rel), num(loans.length) + ' loans')}${tile('Collected', pesoK(coll), pct(coll, rel) + '% of released')}${tile('Outstanding', pesoK(outB), '')}${tile('Portfolio at risk', par.toFixed(1) + '%', 'past-due balance ÷ outstanding', { cls: par > 10 ? 'warn' : '' })}</div>
          <h3>Loans by status</h3>${hbars(['Grace period', 'Current', 'Past due', 'Default', 'Fully Paid'].map((s) => ({ label: s, v: lst[s] || 0 })))}
          ${maturing.length ? `<h3>Maturing within 60 days</h3><ul class="flist">${maturing.map((l) => `<li><b>${esc(l.name)}</b> <span class="muted">${esc(fdate(l.maturity, { month: 'short', day: 'numeric', year: 'numeric' }))} · balance ${peso(l.balance)}</span></li>`).join('')}</ul>` : ''}</section>
        <section class="form-card"><h2>${ic('plan')} Loan demand</h2>
          <div class="dtiles mini">${tile('In the pipeline', pesoK(pipeAmt), 'requested, not yet decided')}${tile('Average request', amts.length ? peso(amts.reduce((s, x) => s + x, 0) / amts.length) : '—', amts.length + ' application(s)')}</div>
          <h3>Requested amounts</h3>${hbars([['₱20K – 39K', 2e4, 4e4], ['₱40K – 59K', 4e4, 6e4], ['₱60K – 79K', 6e4, 8e4], ['₱80K – 100K', 8e4, 100001]].map(([l, a, b]) => ({ label: l, v: amts.filter((x) => x >= a && x < b).length })))}
          <h2 class="mt">${ic('store')} Marketplace purchases (loan points)</h2><div class="dtiles mini">${tile('Verified purchases', pesoK(buy), num(ptsV.length) + ' receipts')}${tile('Reached ' + req + ' points', num(ptsReached), '1 point per ₱' + ppp)}</div>
          ${merRows.length ? hbars(merRows) : '<p class="muted small">No verified purchases yet.</p>'}
          <h2 class="mt">${ic('loan')} Online processing fees</h2><div class="dtiles mini">${tile('To collect at release', peso(subs.length * feeD.total), num(subs.length) + ' online applications')}${tile('CodeSphere PH / OLEDIPO', '₱' + num(subs.length * feeD.codesphere) + ' / ₱' + num(subs.length * feeD.oledipo), '₱' + feeD.codesphere + ' + ₱' + feeD.oledipo + ' each')}</div>
          <h2 class="mt">${ic('mic')} Voice to Text</h2><div class="dtiles mini">${tile('Unlocked', num(vPaid.length), 'paid ₱700 orders')}${tile('Collected', peso(vRev), 'via GCash')}</div></section>
      </div>`;
  }

  G.GrowAdminDash = { dashboard, insights, bindTips };
})(window);
