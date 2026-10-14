/*
 * rw-billing.js — plans UI (subscription + 0% transaction fee, Principal 2026-10-14).
 * Loaded on demand by runwaejs/util.js (rwRequirePlan / rwMountPlanSection) and by /plans.
 * Plain, readable JS (not part of the obfuscated runwaejs build). All text goes in
 * with textContent; prices come from GET /api/billing/plans (api/lib/billing-config.js).
 *
 *   RwBilling.paywall({ action: 'post'|'apply', role, info, plan })
 *   RwBilling.mountPlanSection(uid, user, info)     account page, section#billing
 *   RwBilling.startCheckout(buttonEl)               -> Stripe Checkout (promo codes accepted there)
 *   RwBilling.openPortal(buttonEl)                  -> Stripe customer portal
 *   RwBilling.renderPlanCards(container, info, role)  /plans page
 */
(function () {
  'use strict';
  if (window.RwBilling) return;

  var ACTIVE = ['active', 'trialing'];
  var GRACE_MS = 3 * 24 * 60 * 60 * 1000;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function planForRole(info, role) {
    var list = (info && info.plans) || [];
    for (var i = 0; i < list.length; i++) if (list[i].role === role) return list[i];
    return null;
  }
  function priceText(p) { return '$' + p.amount_usd + ' / ' + (p.interval === 'year' ? 'year' : 'month'); }
  function isActive(plan) {
    if (!plan || ACTIVE.indexOf(plan.status) === -1) return false;
    var end = Number(plan.current_period_end);
    return isFinite(end) && end + GRACE_MS > Date.now();
  }
  function fmtDate(ms) {
    var n = Number(ms);
    if (!isFinite(n) || n <= 0) return '';
    return new Date(n).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function api(path) {
    var user = window.firebase && firebase.auth && firebase.auth().currentUser;
    if (!user) {
      window.location.href = '/login?signup';
      return Promise.reject(new Error('signed out'));
    }
    return user.getIdToken().then(function (token) {
      return fetch('/api/billing/' + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: '{}'
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { d.httpStatus = r.status; return d; });
    });
  }

  function go(path, btn, errEl) {
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
    return api(path).then(function (d) {
      if (d.url && /^https:\/\/(checkout|billing)\.stripe\.com\//.test(d.url)) { window.location.href = d.url; return; }
      if (d.error === 'already_subscribed') return openPortal(btn, errEl);
      throw new Error(d.message || 'Something went wrong. Please try again.');
    }).catch(function (e) {
      if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
      if (errEl && e && e.message !== 'signed out') errEl.textContent = e.message;
    });
  }
  function startCheckout(btn, errEl) { return go('checkout', btn, errEl); }
  function openPortal(btn, errEl) { return go('portal', btn, errEl); }

  // ---------- styles (rw tokens; only what rw.css does not already cover) ----------
  function ensureStyle() {
    if (document.getElementById('rwBillingStyle')) return;
    var st = el('style');
    st.id = 'rwBillingStyle';
    st.textContent =
      '.rw-paywall{border:1px solid var(--rw-line,#e6e6ee);border-radius:var(--rw-radius,14px);padding:0;max-width:440px;width:calc(100% - 32px);background:var(--rw-bg,#fff);color:var(--rw-text,#2b2c36)}' +
      '.rw-paywall::backdrop{background:rgba(18,18,24,.45)}' +
      '.rw-paywall__body{padding:24px}' +
      '.rw-paywall h2,.rw-plan h3{font-family:var(--rw-font-display,inherit);color:var(--rw-ink,#000);margin:0 0 8px}' +
      '.rw-plan__price{font-family:var(--rw-font-display,inherit);font-size:1.75rem;color:var(--rw-ink,#000);margin:8px 0}' +
      '.rw-plan ul{margin:12px 0 20px;padding-left:18px}.rw-plan li{margin:4px 0}' +
      '.rw-plan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}' +
      '.rw-plan--yours{border-color:var(--rw-accent,#9389ff)}' +
      '.rw-billing-actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:16px}' +
      '.rw-billing-err{color:var(--rw-danger,#c62f2f);min-height:1.2em;margin-top:8px}' +
      '.rw-plan > .rw-btn{margin-top:12px}#billing{margin-bottom:24px}#billing .rw-dl{margin:12px 0}';
    document.head.appendChild(st);
  }

  var BENEFITS = {
    marketer: ['Post campaigns', 'Hire creators and manage agreements', 'Pay creators securely; 100% of each gig price goes to the creator'],
    influencer: ['Apply to campaigns', 'List your services', 'Get paid the full gig price: Runwae takes no cut']
  };

  function planCard(p, opts) {
    var card = el('section', 'rw-card rw-plan' + (opts.yours ? ' rw-plan--yours' : ''));
    card.appendChild(el('p', 'rw-eyebrow', p.role === 'marketer' ? 'For brands' : 'For creators'));
    card.appendChild(el('h3', null, p.name));
    card.appendChild(el('p', 'rw-plan__price', priceText(p)));
    var ul = el('ul');
    (BENEFITS[p.role] || [p.unlocks]).forEach(function (b) { ul.appendChild(el('li', null, b)); });
    card.appendChild(ul);
    card.appendChild(el('p', 'rw-muted rw-small', 'Cancel anytime from your account. Have an early-access promo code? Enter it at checkout.'));
    return card;
  }

  // ---------- paywall ----------
  function paywall(opts) {
    ensureStyle();
    var info = opts.info || {};
    var p = planForRole(info, opts.role);
    var old = document.getElementById('rwPaywall');
    if (old) old.remove();
    var dlg = el('dialog', 'rw-paywall');
    dlg.id = 'rwPaywall';
    dlg.setAttribute('aria-labelledby', 'rwPaywallTitle');
    var body = el('div', 'rw-paywall__body');
    var verb = opts.action === 'apply' ? 'apply to campaigns' : (opts.role === 'marketer' ? 'post a campaign' : 'list a service');
    var h = el('h2', null, p ? 'Choose the ' + p.name + ' to ' + verb : 'A plan is needed to ' + verb);
    h.id = 'rwPaywallTitle';
    body.appendChild(h);
    if (opts.plan && opts.plan.status === 'past_due') {
      body.appendChild(el('p', null, 'Your last plan payment didn’t go through. Update your card to keep going.'));
    }
    var err = el('p', 'rw-billing-err');
    err.setAttribute('role', 'alert');
    var actions = el('div', 'rw-billing-actions');
    if (p) {
      body.appendChild(planCard(p, { yours: true }));
      var cta = el('button', 'rw-btn', 'Continue to checkout');
      cta.type = 'button';
      cta.addEventListener('click', function () {
        if (opts.plan && opts.plan.status === 'past_due') openPortal(cta, err); else startCheckout(cta, err);
      });
      if (opts.plan && opts.plan.status === 'past_due') cta.textContent = 'Update payment method';
      actions.appendChild(cta);
    } else {
      body.appendChild(el('p', null, 'Set your account to brand or creator first.'));
    }
    var compare = el('a', 'rw-btn rw-btn--text', 'Compare plans');
    compare.href = '/plans';
    actions.appendChild(compare);
    var close = el('button', 'rw-btn rw-btn--quiet', 'Not now');
    close.type = 'button';
    close.addEventListener('click', function () { dlg.close(); dlg.remove(); });
    actions.appendChild(close);
    body.appendChild(actions);
    body.appendChild(err);
    dlg.appendChild(body);
    document.body.appendChild(dlg);
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    return dlg;
  }

  // ---------- account page: Plan section ----------
  function mountPlanSection(uid, user, info) {
    ensureStyle();
    var sec = document.getElementById('billing');
    if (!sec) {
      sec = el('section', 'ui-block rw-card');
      sec.id = 'billing';
      var anchor = document.getElementById('account');
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(sec, anchor);
      else (document.getElementById('main-content') || document.body).appendChild(sec);
    }
    sec.textContent = '';
    sec.setAttribute('aria-labelledby', 'rwPlanTitle');
    var h = el('h2', null, 'Plan');
    h.id = 'rwPlanTitle';
    sec.appendChild(h);
    var plan = user.plan || null;
    var p = planForRole(info, user.role);
    var dl = el('dl', 'rw-dl');
    function row(k, v) { if (!v) return; dl.appendChild(el('dt', null, k)); dl.appendChild(el('dd', null, v)); }
    var err = el('p', 'rw-billing-err');
    err.setAttribute('role', 'alert');
    var actions = el('div', 'rw-billing-actions');

    if (plan && plan.status && plan.status !== 'canceled' && plan.status !== 'incomplete_expired') {
      var mine = null;
      (info.plans || []).forEach(function (x) { if (x.tier === plan.tier) mine = x; });
      row('Plan', mine ? mine.name + ' · ' + priceText(mine) : 'Runwae plan');
      var status = isActive(plan) ? (plan.cancel_at_period_end ? 'Active until the end of this period' : 'Active')
        : plan.status === 'past_due' ? 'Payment failed: update your card' : 'Inactive';
      row('Status', status);
      row(plan.cancel_at_period_end ? 'Ends on' : 'Renews on', fmtDate(plan.current_period_end));
      sec.appendChild(dl);
      var manage = el('button', 'rw-btn', 'Manage billing');
      manage.type = 'button';
      manage.addEventListener('click', function () { openPortal(manage, err); });
      actions.appendChild(manage);
      actions.appendChild(el('span', 'rw-muted rw-small', 'Update your card, see invoices or cancel on Stripe.'));
    } else if (p) {
      sec.appendChild(el('p', null, 'You don’t have a plan yet. The ' + p.name + ' (' + priceText(p) + ') lets you ' + p.unlocks.toLowerCase() + '.'));
      var choose = el('button', 'rw-btn', 'Choose plan');
      choose.type = 'button';
      choose.addEventListener('click', function () { startCheckout(choose, err); });
      actions.appendChild(choose);
      var link = el('a', 'rw-btn rw-btn--text', 'Compare plans');
      link.href = '/plans';
      actions.appendChild(link);
    } else {
      sec.appendChild(el('p', null, 'Plans are available for brand and creator accounts.'));
    }
    sec.appendChild(actions);
    sec.appendChild(err);
    if (/[?&]plan=started/.test(window.location.search)) {
      sec.insertBefore(el('p', 'rw-banner', 'Thanks! Your plan starts as soon as Stripe confirms the payment (usually a few seconds). Refresh to see it.'), dl.parentNode ? dl : actions);
    }
  }

  // ---------- /plans page ----------
  function renderPlanCards(container, info, role) {
    ensureStyle();
    container.textContent = '';
    var grid = el('div', 'rw-plan-grid');
    (info.plans || []).forEach(function (p) {
      var card = planCard(p, { yours: role === p.role });
      var err = el('p', 'rw-billing-err');
      err.setAttribute('role', 'alert');
      var btn;
      if (!role) {
        btn = el('a', 'rw-btn', 'Sign up to start');
        btn.href = '/login?signup';
      } else if (role === p.role) {
        btn = el('button', 'rw-btn', 'Continue to checkout');
        btn.type = 'button';
        btn.addEventListener('click', function () { startCheckout(btn, err); });
      } else {
        btn = el('p', 'rw-muted rw-small', 'Your account is a ' + (role === 'marketer' ? 'brand' : 'creator') + ' account.');
      }
      card.appendChild(btn);
      card.appendChild(err);
      grid.appendChild(card);
    });
    container.appendChild(grid);
  }

  window.RwBilling = {
    paywall: paywall,
    mountPlanSection: mountPlanSection,
    startCheckout: startCheckout,
    openPortal: openPortal,
    renderPlanCards: renderPlanCards,
    isActive: isActive
  };
})();
