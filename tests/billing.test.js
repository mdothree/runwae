/**
 * Billing tests (subscription + 0% transaction fee). MOCKED Stripe client + MOCKED
 * firebase-admin: no network, no credentials, no live writes. The real `stripe`
 * package is used ONLY for webhook signature signing/verification (pure crypto).
 *
 * Run (xps, never the laptop):  NODE_PATH=<dir with node_modules/stripe> node --test tests/billing.test.js
 */
'use strict';

require('./_billing-guard'); // refuses to run with a live key in the env (must stay first)

const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { Readable } = require('stream');
const { spawnSync } = require('child_process');
const RealStripe = require('stripe');

const ROOT = path.join(__dirname, '..');
const WEBHOOK_SECRET = 'whsec_test_' + 'a'.repeat(32);
const realStripe = new RealStripe('sk_test_' + 'mock'.repeat(6));

// ---------------- in-memory RTDB ----------------
function makeDb(initial) {
  let tree = JSON.parse(JSON.stringify(initial || {}));
  let pushN = 0;
  const writes = [];
  const parts = (p) => String(p || '').split('/').filter(Boolean);
  const get = (p) => parts(p).reduce((n, k) => (n && typeof n === 'object' ? n[k] : undefined), tree);
  const setAt = (p, v) => {
    const ks = parts(p);
    writes.push(ks.join('/'));
    if (!ks.length) { tree = v == null ? {} : JSON.parse(JSON.stringify(v)); return; }
    let n = tree;
    for (let i = 0; i < ks.length - 1; i++) {
      if (!n[ks[i]] || typeof n[ks[i]] !== 'object') n[ks[i]] = {};
      n = n[ks[i]];
    }
    if (v == null) delete n[ks[ks.length - 1]];
    else n[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v));
  };
  const snap = (p, v) => ({
    val: () => (v === undefined ? null : JSON.parse(JSON.stringify(v))),
    exists: () => v !== undefined && v !== null,
    key: parts(p).pop() || null,
  });
  function ref(p) {
    const base = parts(p).join('/');
    const join = (c) => [base, ...parts(c)].filter(Boolean).join('/');
    return {
      key: parts(base).pop() || null,
      child: (c) => ref(join(c)),
      once: async () => snap(base, get(base)),
      set: async (v) => setAt(base, v),
      remove: async () => setAt(base, null),
      update: async (obj) => { for (const [k, v] of Object.entries(obj)) setAt(join(k), v); },
      push: () => ref(join('k' + (++pushN))),
      transaction: async (fn) => {
        const cur = get(base);
        const next = fn(cur === undefined ? null : JSON.parse(JSON.stringify(cur)));
        if (next === undefined) return { committed: false, snapshot: snap(base, cur) };
        setAt(base, next);
        return { committed: true, snapshot: snap(base, next) };
      },
    };
  }
  return { ref, get, writes, dump: () => tree };
}

// ---------------- mocks wired into require() ----------------
let db;
const adminMock = {
  database: () => db,
  auth: () => ({
    verifyIdToken: async (t) => {
      if (!/^tok_[A-Za-z0-9_-]+$/.test(t)) throw new Error('bad token');
      return { uid: t.slice(4), email: t.slice(4) + '@example.test' };
    },
    getUser: async (uid) => ({ uid, email: uid + '@auth.example.test' }),
  }),
};

let stripeState;
function resetStripe(opts) {
  stripeState = Object.assign({
    priceAmounts: { runwae_brand_monthly: 4900, runwae_creator_monthly: 1200 },
    calls: [],
    subs: {},
    customerN: 0,
  }, opts || {});
}
const stripeMock = {
  prices: {
    list: async (p) => {
      stripeState.calls.push(['prices.list', p]);
      const key = p.lookup_keys[0];
      const amt = stripeState.priceAmounts[key];
      return { data: amt == null ? [] : [{ id: 'price_' + key, unit_amount: amt, currency: 'usd', recurring: { interval: 'month' }, lookup_key: key }] };
    },
  },
  customers: {
    create: async (p, o) => { stripeState.calls.push(['customers.create', p, o]); return { id: 'cus_test' + (++stripeState.customerN) }; },
  },
  checkout: { sessions: { create: async (p) => { stripeState.calls.push(['checkout.create', p]); return { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }; } } },
  billingPortal: { sessions: { create: async (p) => { stripeState.calls.push(['portal.create', p]); return { url: 'https://billing.stripe.com/p/session/test_1' }; } } },
  subscriptions: { retrieve: async (id) => { stripeState.calls.push(['subscriptions.retrieve', id]); return stripeState.subs[id]; } },
  charges: { create: async (p, o) => { stripeState.calls.push(['charges.create', p, o]); return { id: 'ch_test_1' }; } },
  transfers: { create: async (p, o) => { stripeState.calls.push(['transfers.create', p, o]); return { id: 'tr_test_1' }; } },
  webhooks: realStripe.webhooks,
};

const STRIPE_LIB = path.join(ROOT, 'api', '_lib', 'stripe.js');
const FIREBASE_LIB = path.join(ROOT, 'api', '_lib', 'firebase.js');
const sentEmails = [];
const emailMock = { sendEmail: async (o) => { sentEmails.push(o); return { ok: true }; } };
const BILLING_LIB = path.join(ROOT, 'api', '_lib', 'billing.js');
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === './email' && parent && parent.filename === BILLING_LIB) return emailMock;
  let resolved;
  try { resolved = Module._resolveFilename(request, parent, isMain); } catch (e) { resolved = request; }
  if (resolved === STRIPE_LIB) return stripeMock;
  if (resolved === FIREBASE_LIB) return adminMock;
  if (request === 'firebase-admin') return adminMock;
  return origLoad.apply(this, arguments);
};

const load = (rel) => require(path.join(ROOT, rel));
const billing = load('api/_lib/billing.js');
const config = load('api/_lib/billing-config.js');
const checkout = load('api/billing/_checkout.js');
const portal = load('api/billing/_portal.js');
const webhook = load('api/billing/_webhook.js');
const plansRoute = load('api/billing/_plans.js');
const quote = load('api/payment/quote.js');
const chargeMarketer = load('api/payment/charge-marketer.js');
const payInfluencer = load('api/payment/pay-influencer.js');
const { gate, PLAN_OK } = load('deployment/gate-rules.js');

// ---------------- req/res helpers ----------------
function res() {
  const r = { statusCode: 0, body: undefined, headers: {} };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.end = () => r;
  r.setHeader = (k, v) => { r.headers[k] = v; };
  return r;
}
function req(method, { token, body, headers } = {}) {
  return { method, headers: Object.assign(token ? { authorization: 'Bearer ' + token } : {}, headers || {}), body: body || {} };
}
function rawReq(payload, sigHeader) {
  const r = Readable.from([Buffer.from(payload)]);
  r.method = 'POST';
  r.headers = sigHeader ? { 'stripe-signature': sigHeader } : {};
  return r;
}
function signed(event) {
  const payload = JSON.stringify(event);
  return rawReq(payload, realStripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }));
}

const NOW = Date.now();
const FUTURE_S = Math.floor(NOW / 1000) + 30 * 86400;
const ENV_ON = { RUNWAE_BILLING_ENABLED: '1', STRIPE_BILLING_WEBHOOK_SECRET: WEBHOOK_SECRET, STRIPE_SECRET_KEY: 'sk_test_' + 'x'.repeat(24) };
function withEnv(extra, fn) {
  const saved = {};
  const all = Object.assign({}, ENV_ON, extra);
  for (const k of Object.keys(all)) { saved[k] = process.env[k]; if (all[k] == null) delete process.env[k]; else process.env[k] = all[k]; }
  return Promise.resolve().then(fn).finally(() => {
    for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  });
}
function freshDb() {
  db = makeDb({
    users: {
      uBrand: { role: 'marketer', email: 'brand@example.test', name: 'Brand Co' },
      uCreator: { role: 'influencer', email: 'creator@example.test', name: 'Ivy Creator' },
      uNoRole: { email: 'x@example.test' },
    },
    items: {
      it1: { uid: 'uBrand', compensation: 'money', price: '25', influencers: { g1: { uid: 'uCreator', status: 0, platform: 'instagram' } } },
    },
  });
  resetStripe();
}
function subObj(over) {
  return Object.assign({
    id: 'sub_1', object: 'subscription', customer: 'cus_test1', status: 'active', cancel_at_period_end: false,
    current_period_end: FUTURE_S, metadata: { uid: 'uBrand', tier: 'brand' },
    items: { data: [{ price: { id: 'price_runwae_brand_monthly', lookup_key: 'runwae_brand_monthly' } }] },
  }, over || {});
}

// =====================================================================
test('config: one price place, whole dollars, final amounts (brand 49, creator 12, monthly)', () => {
  assert.strictEqual(config.PLANS.brand.amount_usd, 49);
  assert.strictEqual(config.PLANS.creator.amount_usd, 12);
  for (const p of Object.values(config.PLANS)) assert.ok(Number.isInteger(p.amount_usd), 'whole dollars');
  const src = fs.readFileSync(path.join(ROOT, 'api/_lib/billing-config.js'), 'utf8');
  assert.ok(!/\.99\b/.test(src.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')), 'no .99 prices');
  // no other file hard-codes a plan price number for checkout
  for (const f of ['api/billing/_checkout.js', 'api/billing/_webhook.js', 'api/_lib/billing.js']) {
    assert.ok(!/\b(4900|1200|49|12)\b/.test(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')), f + ' has no hard-coded price');
  }
});

test('billing OFF by default: plans says disabled, checkout 503, no processing line', async () => {
  freshDb();
  await withEnv({ RUNWAE_BILLING_ENABLED: null }, async () => {
    const r1 = res(); plansRoute(req('GET'), r1);
    assert.strictEqual(r1.body.enabled, false);
    assert.strictEqual(r1.body.processing.pass_through, false);
    assert.strictEqual(r1.body.platform_fee_percent, 0);
    const r2 = res(); await checkout(req('POST', { token: 'tok_uBrand' }), r2);
    assert.strictEqual(r2.statusCode, 503);
    assert.strictEqual(r2.body.error, 'billing_not_enabled');
    // gig checkout summary: no quote at all while billing is off (the gig page keeps the plain card form)
    const r3 = res(); await quote(req('POST', { token: 'tok_uBrand', body: { gigPath: 'items/it1/influencers/g1' } }), r3);
    assert.strictEqual(r3.statusCode, 503);
    assert.strictEqual(r3.body.error, 'billing_not_enabled');
    assert.strictEqual(r3.body.total_cents, undefined);
    // the charge is the plain gig price
    const rc = res(); await chargeMarketer(req('POST', { token: 'tok_uBrand', body: { stripeToken: 'tok_visa', gigPath: 'items/it1/influencers/g1' } }), rc);
    assert.strictEqual(rc.statusCode, 200, JSON.stringify(rc.body));
    assert.strictEqual(stripeState.calls.find((x) => x[0] === 'charges.create')[1].amount, 2500);
  });
});

test('gig checkout (UI): no summary and the pre-billing ledger line while billing is off; summary when on', async () => {
  const src = fs.readFileSync(path.join(ROOT, 'unobfrunwaejs/transactions.js'), 'utf8');
  const start = src.indexOf('var rwGigBillingOn');
  const end = src.indexOf('function chargeMarketer');
  assert.ok(start > 0 && end > start);
  const ledgerSrc = src.slice(end);
  async function run(info, quoteBody) {
    const calls = { quote: 0, inserted: [], btn: 'Submit Payment' };
    const el = () => ({ appendChild() {}, setAttribute() {}, set textContent(v) { this._t = v; }, get textContent() { return this._t; } });
    const form = { parentNode: { insertBefore: (box) => { calls.inserted.push(box.id); } } };
    const btn = { set textContent(v) { calls.btn = v; } };
    const ctx = {
      document: {
        getElementById: (id) => (id === 'payment-form' ? form : id === 'btnSubmitStripePayment' ? btn : null),
        createElement: el, head: { appendChild() {} },
      },
      rwBillingInfo: () => Promise.resolve(info),
      paymentApi: (ep) => { calls.quote++; return Promise.resolve(Object.assign({ httpStatus: quoteBody ? 200 : 503 }, quoteBody || { error: 'billing_not_enabled' })); },
      Number, Promise,
    };
    vm.createContext(ctx);
    vm.runInContext(src.slice(start, end), ctx);
    ctx.rwRenderGigQuote('items/it1/influencers/g1');
    await new Promise((r) => setTimeout(r, 20));
    calls.billingOn = vm.runInContext('rwGigBillingOn', ctx);
    return calls;
  }
  const q = { gig_price_cents: 25000, platform_fee_cents: 0, processing_fee_cents: 755, total_cents: 25755, pass_through: true };
  // billing off (or /api/billing/plans missing): the quote endpoint is never called, the button keeps its label
  assert.deepStrictEqual(await run({ enabled: false }, q), { quote: 0, inserted: [], btn: 'Submit Payment', billingOn: false });
  assert.deepStrictEqual(await run(undefined, q), { quote: 0, inserted: [], btn: 'Submit Payment', billingOn: false });
  // billing on: summary + "Pay $total"; a 503 quote still leaves the plain form
  assert.deepStrictEqual(await run({ enabled: true }, q), { quote: 1, inserted: ['rwGigQuote'], btn: 'Pay $257.55', billingOn: true });
  assert.deepStrictEqual(await run({ enabled: true }, null), { quote: 1, inserted: [], btn: 'Submit Payment', billingOn: true });
  // ledger: the pre-billing line when off, the itemised line only when billing is on
  assert.ok(/if \(rwGigBillingOn\) \{[\s\S]*?goes to the influencer in full[\s\S]*?\} else \{\s*writeToLedger\(path, "payment submitted", "Marketer paid \$" \+ price\);/.test(ledgerSrc));
});

test('checkout: auth required', async () => {
  freshDb();
  await withEnv({}, async () => {
    const r = res(); await checkout(req('POST'), r);
    assert.strictEqual(r.statusCode, 401);
    const r2 = res(); await checkout(req('POST', { token: 'not a token' }), r2);
    assert.strictEqual(r2.statusCode, 401);
    const r3 = res(); await portal(req('POST'), r3);
    assert.strictEqual(r3.statusCode, 401);
    assert.strictEqual(stripeState.calls.length, 0, 'no Stripe call without auth');
  });
});

test('checkout: role -> plan mapping, subscription mode, promo codes allowed, customer reused', async () => {
  freshDb();
  await withEnv({}, async () => {
    const rb = res(); await checkout(req('POST', { token: 'tok_uBrand', body: { tier: 'creator' } }), rb);
    assert.strictEqual(rb.statusCode, 200, JSON.stringify(rb.body));
    assert.match(rb.body.url, /^https:\/\/checkout\.stripe\.com\//);
    let c = stripeState.calls.filter((x) => x[0] === 'checkout.create').pop()[1];
    assert.strictEqual(c.mode, 'subscription');
    assert.strictEqual(c.allow_promotion_codes, true);
    assert.deepStrictEqual(c.line_items, [{ price: 'price_runwae_brand_monthly', quantity: 1 }], 'marketer gets brand plan; client tier ignored');
    assert.strictEqual(c.client_reference_id, 'uBrand');
    assert.strictEqual(c.subscription_data.metadata.tier, 'brand');
    assert.strictEqual(c.customer, 'cus_test1');

    const rb2 = res(); await checkout(req('POST', { token: 'tok_uBrand' }), rb2);
    assert.strictEqual(stripeState.calls.filter((x) => x[0] === 'customers.create').length, 1, 'customer reused');
    assert.strictEqual(stripeState.calls.filter((x) => x[0] === 'checkout.create').pop()[1].customer, 'cus_test1');

    const rc = res(); await checkout(req('POST', { token: 'tok_uCreator' }), rc);
    c = stripeState.calls.filter((x) => x[0] === 'checkout.create').pop()[1];
    assert.deepStrictEqual(c.line_items, [{ price: 'price_runwae_creator_monthly', quantity: 1 }]);
    assert.strictEqual(c.allow_promotion_codes, true);

    const rn = res(); await checkout(req('POST', { token: 'tok_uNoRole' }), rn);
    assert.strictEqual(rn.statusCode, 400);
    assert.strictEqual(rn.body.error, 'no_plan_for_role');

    assert.strictEqual(db.get('plans/uBrand'), undefined, 'checkout never writes the plan');
    assert.strictEqual(db.get('plans/uCreator'), undefined, 'checkout never writes the plan');
    assert.ok(!db.writes.some((w) => /(^|\/)plans?(\/|$)/.test(w)), 'no plan writes outside the webhook');
  });
});

test('checkout: refuses when the Stripe price differs from billing-config (no mismatched copy)', async () => {
  freshDb();
  stripeState.priceAmounts.runwae_brand_monthly = 9900;
  await withEnv({}, async () => {
    const r = res(); await checkout(req('POST', { token: 'tok_uBrand' }), r);
    assert.strictEqual(r.statusCode, 500);
    assert.strictEqual(r.body.error, 'price_mismatch');
    delete stripeState.priceAmounts.runwae_brand_monthly;
    const r2 = res(); await checkout(req('POST', { token: 'tok_uBrand' }), r2);
    assert.strictEqual(r2.body.error, 'price_missing');
  });
});

test('checkout: already subscribed -> 409; portal works only with a customer', async () => {
  freshDb();
  await withEnv({}, async () => {
    const rp = res(); await portal(req('POST', { token: 'tok_uBrand' }), rp);
    assert.strictEqual(rp.statusCode, 404);
    db.ref('plans/uBrand').set({ tier: 'brand', status: 'active', current_period_end: NOW + 86400000 });
    db.ref('billing/customers/uBrand').set({ id: 'cus_test9' });
    const r = res(); await checkout(req('POST', { token: 'tok_uBrand' }), r);
    assert.strictEqual(r.statusCode, 409);
    const rp2 = res(); await portal(req('POST', { token: 'tok_uBrand' }), rp2);
    assert.strictEqual(rp2.statusCode, 200);
    assert.strictEqual(stripeState.calls.filter((x) => x[0] === 'portal.create').pop()[1].customer, 'cus_test9');
  });
});

test('webhook: bad / missing signature rejected, nothing written', async () => {
  freshDb();
  await withEnv({}, async () => {
    const ev = { id: 'evt_bad', type: 'customer.subscription.updated', created: 1, data: { object: subObj() } };
    const payload = JSON.stringify(ev);
    const wrongSig = realStripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_wrong_' + 'b'.repeat(30) });
    const r1 = res(); await webhook(rawReq(payload, wrongSig), r1);
    assert.strictEqual(r1.statusCode, 400);
    const r2 = res(); await webhook(rawReq(payload, null), r2);
    assert.strictEqual(r2.statusCode, 400);
    const goodSig = realStripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
    const r3 = res(); await webhook(rawReq(payload.replace('"active"', '"trialing"'), goodSig), r3); // tampered body
    assert.strictEqual(r3.statusCode, 400);
    assert.strictEqual(db.get('plans/uBrand'), undefined);
    assert.strictEqual(db.writes.length, 0);
    const r4 = res(); await withEnv({ STRIPE_BILLING_WEBHOOK_SECRET: null }, () => webhook(rawReq(payload, goodSig), r4));
    assert.strictEqual(r4.statusCode, 503);
  });
});

test('webhook: checkout.session.completed writes users/{uid}/plan via admin; idempotent', async () => {
  freshDb();
  await withEnv({}, async () => {
    db.ref('billing/customers/uBrand').set({ id: 'cus_test1' });
    db.ref('billing/customer_uid/cus_test1').set('uBrand');
    stripeState.subs.sub_1 = subObj();
    const ev = { id: 'evt_1', type: 'checkout.session.completed', created: 100,
      data: { object: { id: 'cs_1', mode: 'subscription', subscription: 'sub_1', customer: 'cus_test1', client_reference_id: 'uBrand' } } };
    const r = res(); await webhook(signed(ev), r);
    assert.strictEqual(r.statusCode, 200, JSON.stringify(r.body));
    const plan = db.get('plans/uBrand');
    assert.strictEqual(db.get('users/uBrand/plan'), undefined, 'plan is not in the public users/{uid} record');
    assert.strictEqual(plan.tier, 'brand');
    assert.strictEqual(plan.status, 'active');
    assert.strictEqual(plan.current_period_end, FUTURE_S * 1000);
    assert.ok(billing.isPlanActive(plan));
    assert.strictEqual(db.get('billing/subscriptions/uBrand').id, 'sub_1');
    const r2 = res(); await webhook(signed(ev), r2);
    assert.strictEqual(r2.body.duplicate, true);
  });
});

test('webhook: subscription.updated / deleted / invoice.payment_failed update the plan; stale events skipped', async () => {
  freshDb();
  await withEnv({}, async () => {
    db.ref('billing/customer_uid/cus_test1').set('uBrand');
    const up = { id: 'evt_u', type: 'customer.subscription.updated', created: 200, data: { object: subObj({ cancel_at_period_end: true }) } };
    let r = res(); await webhook(signed(up), r);
    assert.strictEqual(db.get('plans/uBrand').cancel_at_period_end, true);

    stripeState.subs.sub_1 = subObj({ status: 'past_due' });
    const failed = { id: 'evt_f', type: 'invoice.payment_failed', created: 300, data: { object: { customer: 'cus_test1', subscription: 'sub_1', amount_due: 4900, currency: 'usd' } } };
    r = res(); await webhook(signed(failed), r);
    assert.strictEqual(db.get('plans/uBrand').status, 'past_due');
    assert.strictEqual(billing.isPlanActive(db.get('plans/uBrand')), false);

    const stale = { id: 'evt_old', type: 'customer.subscription.updated', created: 150, data: { object: subObj({ status: 'active' }) } };
    r = res(); await webhook(signed(stale), r);
    assert.strictEqual(r.body.result, 'stale_event');
    assert.strictEqual(db.get('plans/uBrand').status, 'past_due');

    const del = { id: 'evt_d', type: 'customer.subscription.deleted', created: 400, data: { object: subObj({ status: 'canceled' }) } };
    r = res(); await webhook(signed(del), r);
    assert.strictEqual(db.get('plans/uBrand').status, 'canceled');

    const unknown = { id: 'evt_x', type: 'customer.subscription.updated', created: 500, data: { object: subObj({ customer: 'cus_other', metadata: {} }) } };
    r = res(); await webhook(signed(unknown), r);
    assert.strictEqual(r.body.result, 'ignored');
  });
});

test('rules: plan + stripe customer id are client-unwritable; billing/* admin-only; rest unchanged', () => {
  const rules = JSON.parse(fs.readFileSync(path.join(ROOT, 'database.rules.json'), 'utf8'));
  const u = rules.rules.users.$uid;
  assert.deepStrictEqual(u.plan, { '.validate': false });
  assert.deepStrictEqual(rules.rules.plans, { $uid: { '.read': 'auth != null && auth.uid === $uid', '.write': false } }, 'plans/{uid}: owner-only read, never client-written');
  assert.deepStrictEqual(u.stripe_customer_id, { '.validate': false });
  assert.deepStrictEqual(rules.rules.billing, { '.read': false, '.write': false });
  assert.strictEqual(u['.write'], 'auth != null && auth.uid === $uid');
});

test('gating (server): gated rules require an active plan to CREATE items and interests only', () => {
  const rules = JSON.parse(fs.readFileSync(path.join(ROOT, 'database.rules.json'), 'utf8'));
  assert.ok(!JSON.stringify(rules).includes("child('plan')"), 'plain rules carry no gate (safe before billing is on)');
  const g = gate(rules);
  const item = g.rules.items.$item;
  assert.ok(item.uid['.write'].includes(PLAN_OK), 'creating an item (writing its uid) is gated');
  assert.ok(item.uid['.write'].startsWith("auth != null && !data.exists() && newData.val() === auth.uid"), 'gate only on the create rule');
  assert.ok(item.interests.$k['.write'].includes("!data.exists() && newData.child('uid').val() === auth.uid && " + PLAN_OK));
  assert.ok(PLAN_OK.includes("root.child('plans').child(auth.uid)") && !PLAN_OK.includes("child('users')"), 'gate reads plans/{uid}');
  assert.ok(PLAN_OK.includes("'active'") && PLAN_OK.includes("'trialing'") && PLAN_OK.includes(String(config.GRACE_MS)));
  // everything else identical
  const strip = (r) => { const c = JSON.parse(JSON.stringify(r)); delete c.rules.items.$item.uid['.write']; delete c.rules.items.$item.interests.$k['.write']; return c; };
  assert.deepStrictEqual(strip(g), strip(rules));
});

test('gating (UI): rwRequirePlan blocks without a plan, passes with one, fails open when billing is off', async () => {
  const src = fs.readFileSync(path.join(ROOT, 'unobfrunwaejs/util.js'), 'utf8');
  const start = src.indexOf('var rwBillingInfoPromise');
  assert.ok(start > 0);
  async function run(info, plan) {
    const calls = { proceed: 0, paywall: 0 };
    const ctx = {
      fetch: async () => ({ ok: true, json: async () => info }),
      database: { ref: () => ({ child: () => ({ once: () => Promise.resolve({ val: () => plan }) }) }) },
      window: {}, document: {}, Date, isFinite, Number, Promise,
    };
    ctx.window.RwBilling = { paywall: () => { calls.paywall++; } };
    vm.createContext(ctx);
    vm.runInContext(src.slice(start), ctx);
    ctx.rwRequirePlan({ key: 'u1', val: () => ({ role: 'marketer' }) }, 'post', () => { calls.proceed++; });
    await new Promise((r) => setTimeout(r, 20));
    return calls;
  }
  assert.deepStrictEqual(await run({ enabled: true }, null), { proceed: 0, paywall: 1 });
  assert.deepStrictEqual(await run({ enabled: true }, { status: 'past_due', current_period_end: NOW + 1e9 }), { proceed: 0, paywall: 1 });
  assert.deepStrictEqual(await run({ enabled: true }, { status: 'active', current_period_end: NOW + 86400000 }), { proceed: 1, paywall: 0 });
  assert.deepStrictEqual(await run({ enabled: true }, { status: 'active', current_period_end: NOW - 4 * 86400000 }), { proceed: 0, paywall: 1 });
  assert.deepStrictEqual(await run({ enabled: false }, null), { proceed: 1, paywall: 0 });
  // posting and applying are wired through the gate
  assert.ok(fs.readFileSync(path.join(ROOT, 'unobfrunwaejs/postHQ.js'), 'utf8').includes('rwRequirePlan(snapUser, "post"'));
  assert.ok(fs.readFileSync(path.join(ROOT, 'unobfrunwaejs/interests.js'), 'utf8').includes('rwRequirePlan(snapUser, "apply"'));
});

test('gig checkout: 0% platform fee, processing pass-through line, creator gets the full price', async () => {
  // $25 gig: total 26.06 -> Stripe 2.9% + 30c of 26.06 = 1.06 -> net exactly 25.00
  assert.deepStrictEqual(billing.processingQuote(25, true), { price_cents: 2500, processing_cents: 106, total_cents: 2606, pass_through: true });
  assert.deepStrictEqual(billing.processingQuote(10, true), { price_cents: 1000, processing_cents: 61, total_cents: 1061, pass_through: true });
  assert.deepStrictEqual(billing.processingQuote(25, false), { price_cents: 2500, processing_cents: 0, total_cents: 2500, pass_through: false });
  for (const p of [10, 15, 25, 40, 100, 999]) {
    const q = billing.processingQuote(p, true);
    const stripeFee = Math.round(q.total_cents * 0.029 + 30);
    assert.ok(q.total_cents - stripeFee >= q.price_cents, `net covers gig price at $${p}`);
    assert.ok(q.total_cents - stripeFee - q.price_cents <= 1, `at cost (<=1c rounding) at $${p}`);
  }

  freshDb();
  await withEnv({}, async () => {
    const rq = res(); await quote(req('POST', { token: 'tok_uBrand', body: { gigPath: 'items/it1/influencers/g1' } }), rq);
    assert.strictEqual(rq.statusCode, 200);
    assert.deepStrictEqual(rq.body, { gig_price_cents: 2500, platform_fee_cents: 0, processing_fee_cents: 106, total_cents: 2606, processing_label: config.PROCESSING.label, pass_through: true });
    const rq2 = res(); await quote(req('POST', { token: 'tok_uCreator', body: { gigPath: 'items/it1/influencers/g1' } }), rq2);
    assert.strictEqual(rq2.statusCode, 403);

    const rc = res(); await chargeMarketer(req('POST', { token: 'tok_uBrand', body: { stripeToken: 'tok_visa', gigPath: 'items/it1/influencers/g1' } }), rc);
    assert.strictEqual(rc.statusCode, 200, JSON.stringify(rc.body));
    const ch = stripeState.calls.find((x) => x[0] === 'charges.create')[1];
    assert.strictEqual(ch.amount, 2606);
    assert.strictEqual(ch.metadata.platform_fee_cents, '0');
    const key = db.get('items/it1/influencers/g1/transaction_key');
    const tx = db.get('transactions/' + key);
    assert.strictEqual(tx.price, '25');
    assert.strictEqual(tx.processing_fee_cents, 106);

    // payout: influencer receives the full gig price
    db.ref('items/it1/influencers/g1/status').set(6);
    // RW-SEC-01 (sec/payments): the payout needs the server-only verification record verify-post writes for the brand.
    db.ref('gig_verifications/it1/g1').set({ by: db.get('items/it1/uid'), time: Date.now(), mode: 'verify', from_status: 5 });
    db.ref('stripe_accounts/uCreator/stripe_user_id').set('acct_test');
    const rp = res(); await payInfluencer(req('POST', { token: 'tok_uCreator', body: { gigPath: 'items/it1/influencers/g1' } }), rp);
    assert.strictEqual(rp.statusCode, 200, JSON.stringify(rp.body));
    assert.strictEqual(stripeState.calls.find((x) => x[0] === 'transfers.create')[1].amount, 2500);
  });

  freshDb();
  await withEnv({ RUNWAE_PROCESSING_PASS_THROUGH: '0' }, async () => {
    const rq = res(); await quote(req('POST', { token: 'tok_uBrand', body: { gigPath: 'items/it1/influencers/g1' } }), rq);
    assert.strictEqual(rq.body.total_cents, 2500);
    assert.strictEqual(rq.body.processing_fee_cents, 0);
  });
});

test('live-key guard trips: test runner refuses, handlers refuse, previews refuse', async () => {
  const fakeLive = 'sk_live_' + 'Z'.repeat(24); // a fake string, never a real key
  const child = spawnSync(process.execPath, [path.join(__dirname, '_billing-guard.js')], {
    env: Object.assign({}, process.env, { SOME_STRIPE_VAR: fakeLive }), encoding: 'utf8',
  });
  assert.strictEqual(child.status, 3);
  assert.match(child.stderr, /REFUSING TO RUN.*SOME_STRIPE_VAR/);
  assert.ok(!child.stderr.includes(fakeLive), 'value never printed');
  const rk = spawnSync(process.execPath, [path.join(__dirname, '_billing-guard.js')], {
    env: Object.assign({}, process.env, { X: 'rk_live_' + 'Q'.repeat(20) }), encoding: 'utf8',
  });
  assert.strictEqual(rk.status, 3);

  freshDb();
  await withEnv({ STRIPE_SECRET_KEY: fakeLive }, async () => {
    const r = res(); await checkout(req('POST', { token: 'tok_uBrand' }), r);
    assert.strictEqual(r.statusCode, 500);
    assert.strictEqual(r.body.error, 'live_key_in_test');
    const w = res(); await webhook(rawReq('{}', 'x'), w);
    assert.strictEqual(w.statusCode, 500);
    assert.strictEqual(stripeState.calls.length, 0, 'no Stripe call with a live key in test mode');
  });
  assert.throws(() => billing.assertKeyAllowed({ VERCEL_ENV: 'preview', STRIPE_SECRET_KEY: fakeLive }), /non-production/);
  assert.doesNotThrow(() => billing.assertKeyAllowed({ VERCEL_ENV: 'production', STRIPE_SECRET_KEY: fakeLive }));
});

test('build: billing copy switch + prices from config; copy pages honest', () => {
  const { applyBillingCopy } = load('deployment/billing-copy.js');
  const html = '<p><!--rw-billing:off-->OLD<!--/rw-billing:off--><!--rw-billing:on-->NEW <span data-rw-price="brand">$1</span>/<span data-rw-price="creator">$2</span><!--rw-processing:on--> +fee<!--/rw-processing:on--><!--rw-processing:off--> nofee<!--/rw-processing:off--><!--/rw-billing:on--></p>';
  assert.strictEqual(applyBillingCopy(html, {}), '<p>OLD</p>');
  assert.strictEqual(applyBillingCopy(html, { RUNWAE_BILLING_ENABLED: '1' }), '<p>NEW <span data-rw-price="brand">$49</span>/<span data-rw-price="creator">$12</span> +fee</p>');
  assert.strictEqual(applyBillingCopy(html, { RUNWAE_BILLING_ENABLED: '1', RUNWAE_PROCESSING_PASS_THROUGH: '0' }), '<p>NEW <span data-rw-price="brand">$49</span>/<span data-rw-price="creator">$12</span> nofee</p>');

  for (const f of ['faqs.html', 'welcome.html', 'terms.html', 'refund.html', 'cancellation.html', 'plans.html']) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of ['rw-billing:on', 'rw-billing:off', 'rw-processing:on', 'rw-processing:off']) {
      assert.strictEqual((t.match(new RegExp(`<!--${m}-->`, 'g')) || []).length, (t.match(new RegExp(`<!--/${m}-->`, 'g')) || []).length, `${f} ${m} balanced`);
    }
    const on = applyBillingCopy(t, { RUNWAE_BILLING_ENABLED: '1' }).replace(/<[^>]+>/g, ' ');
    assert.ok(!/\bfree\b/i.test(on), `${f}: no "free" with billing on`);
    assert.ok(!/\$\d+\.99/.test(on), `${f}: whole dollars`);
    const off = applyBillingCopy(t, {});
    assert.ok(!off.includes('<!--rw-billing') && !off.includes('<!--rw-processing'), `${f}: markers removed`);
    if (f === 'faqs.html') {
      assert.ok(on.includes('100% of each gig price goes to the creator'));
      assert.ok(/2\.9% \+ 30/.test(on), 'FAQ names the processing pass-through');
      assert.ok(off.includes('There is currently no fee to sign up'), 'billing-off copy unchanged');
    }
  }
});

test('emails: webhook calls the email hook with the template data contract', async () => {
  freshDb();
  sentEmails.length = 0;
  await withEnv({}, async () => {
    db.ref('billing/customer_uid/cus_test1').set('uBrand');
    stripeState.subs.sub_1 = subObj();
    const ev = { id: 'evt_mail', type: 'checkout.session.completed', created: 10,
      data: { object: { mode: 'subscription', subscription: 'sub_1', customer: 'cus_test1', client_reference_id: 'uBrand' } } };
    const r = res(); await webhook(signed(ev), r);
    assert.strictEqual(r.statusCode, 200);
    const m = sentEmails.find((x) => x.template === 'subscription_welcome');
    assert.ok(m, 'welcome email sent');
    assert.strictEqual(m.to, 'uBrand@auth.example.test', 'recipient from Firebase Auth, not the editable users/{uid}/email');
    assert.strictEqual(m.idempotencyKey, 'subscription_welcome_evt_mail', 'Stripe event id is the idempotency key');
    assert.strictEqual(m.data.recipientName, 'Brand Co');
    assert.strictEqual(m.data.planName, 'Brand');
    assert.strictEqual(m.data.planTier, 'brand', 'the templates name the plan from its tier');
    assert.strictEqual(m.data.amountCents, 4900);
    const paid = { id: 'evt_paid0', type: 'invoice.paid', created: 11, data: { object: { customer: 'cus_test1', amount_paid: 0, lines: { data: [] } } } };
    const r2 = res(); await webhook(signed(paid), r2);
    assert.ok(!sentEmails.some((x) => x.template === 'subscription_receipt'), 'no receipt for a $0 promo invoice');
  });
});

test('close account guard: a renewing plan must be cancelled first; fails open when billing is off', async () => {
  const src = fs.readFileSync(path.join(ROOT, 'unobfrunwaejs/util.js'), 'utf8');
  const start = src.indexOf('var rwBillingInfoPromise');
  async function run(info, plan) {
    const calls = { proceed: 0, blocked: 0, path: '' };
    const ctx = {
      fetch: async () => ({ ok: true, json: async () => info }),
      database: { ref: () => ({ child: (p) => { calls.path = p; return { once: () => Promise.resolve({ val: () => plan }) }; } }) },
      window: {}, document: {}, Date, isFinite, Number, Promise,
    };
    ctx.window.RwBilling = { closeAccountBlocked: () => { calls.blocked++; } };
    vm.createContext(ctx);
    vm.runInContext(src.slice(start), ctx);
    ctx.rwCloseAccountGuard('u1', () => { calls.proceed++; });
    await new Promise((r) => setTimeout(r, 20));
    return calls;
  }
  const renewing = { status: 'active', current_period_end: NOW + 86400000, cancel_at_period_end: false };
  assert.deepStrictEqual(await run({ enabled: true }, renewing), { proceed: 0, blocked: 1, path: 'plans/u1' });
  assert.deepStrictEqual(await run({ enabled: true }, Object.assign({}, renewing, { cancel_at_period_end: true })), { proceed: 1, blocked: 0, path: 'plans/u1' });
  assert.deepStrictEqual(await run({ enabled: true }, { status: 'past_due', current_period_end: NOW }), { proceed: 0, blocked: 1, path: 'plans/u1' });
  assert.deepStrictEqual(await run({ enabled: true }, { status: 'canceled' }), { proceed: 1, blocked: 0, path: 'plans/u1' });
  assert.deepStrictEqual((await run({ enabled: false }, renewing)).proceed, 1);
  assert.ok(fs.readFileSync(path.join(ROOT, 'unobfrunwaejs/database.js'), 'utf8').includes('rwCloseAccountGuard(snapUser.key'));
});

test('/pricing: 307 to /plans with billing on, /faqs#cost with billing off', async () => {
  const pricing = load('api/billing/_pricing.js');
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  assert.ok(vercel.rewrites.some((r) => r.source === '/pricing' && r.destination === '/api/billing/pricing'));
  assert.ok(!vercel.redirects.some((r) => r.source === '/pricing'), 'no static /pricing redirect left');
  for (const [on, want] of [[true, '/plans'], [false, '/faqs#cost']]) {
    await withEnv({ RUNWAE_BILLING_ENABLED: on ? '1' : null }, () => {
      const r = res(); r.end = () => r; pricing(req('GET'), r);
      assert.strictEqual(r.statusCode, 307);
      assert.strictEqual(r.headers.Location, want);
    });
  }
});

test('terms: price changes are announced at least 30 days ahead', () => {
  const { applyBillingCopy } = load('deployment/billing-copy.js');
  const on = applyBillingCopy(fs.readFileSync(path.join(ROOT, 'terms.html'), 'utf8'), { RUNWAE_BILLING_ENABLED: '1' }).replace(/\s+/g, ' ');
  assert.ok(on.includes('we will email you at least 30 days before the new price applies to your plan'));
});

test('Hobby function cap: api/ has <= 12 functions; /api/billing/* is one router over the underscore handlers', async () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('_') || e.name.startsWith('.')) return [];
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : (/\.(js|mjs|cjs|ts)$/.test(e.name) ? [p] : []);
  });
  const fns = walk(path.join(ROOT, 'api'));
  assert.ok(fns.length <= 12, `Vercel Hobby allows 12 functions per deployment; api/ has ${fns.length}: ${fns.map((f) => path.relative(ROOT, f)).join(', ')}`);
  const router = load('api/billing/[action].js');
  assert.strictEqual(router.actionOf({ query: { action: 'plans' }, url: '/api/billing/plans' }), 'plans');
  assert.strictEqual(router.actionOf({ query: {}, url: '/api/billing/webhook?x=1' }), 'webhook');
  const r404 = res(); r404.end = () => r404; router(req('GET'), r404); // no action
  assert.strictEqual(r404.statusCode, 404);
  const rProto = res(); rProto.end = () => rProto; router(Object.assign(req('GET'), { query: { action: '__proto__' } }), rProto);
  assert.strictEqual(rProto.statusCode, 404);
  await withEnv({ RUNWAE_BILLING_ENABLED: null }, () => {
    const viaRouter = res(); viaRouter.end = () => viaRouter;
    router(Object.assign(req('GET'), { query: { action: 'pricing' } }), viaRouter);
    assert.strictEqual(viaRouter.statusCode, 307);
    assert.strictEqual(viaRouter.headers.Location, '/faqs#cost');
  });
});
