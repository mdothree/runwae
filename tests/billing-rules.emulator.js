/**
 * Realtime Database RULES test for billing, against the LOCAL emulator only
 * (project "demo-runwae": the demo- prefix keeps firebase-tools fully offline).
 *
 * Run (xps):
 *   npx firebase emulators:exec --only database --project demo-runwae "node tests/billing-rules.emulator.js"
 *
 * Checks: users/{uid}/plan + stripe_customer_id are client-unwritable, billing/* is closed,
 * and with the gated rules (deployment/gate-rules.js) creating an item / an interest needs an
 * active plan while edits/removals of existing data do not.
 */
'use strict';

const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { gate } = require('../deployment/gate-rules');

const HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
if (!HOST || !/^(127\.0\.0\.1|localhost):\d+$/.test(HOST)) {
  console.error('Refusing: FIREBASE_DATABASE_EMULATOR_HOST must point at a local emulator');
  process.exit(2);
}
const NS = 'demo-runwae';
const ROOT = path.join(__dirname, '..');
const plainRules = JSON.parse(fs.readFileSync(path.join(ROOT, 'database.rules.json'), 'utf8'));
const gatedRules = gate(plainRules);
const DAY = 86400000;

async function call(method, p, body, uid) {
  let url = `http://${HOST}/${p}.json?ns=${NS}`;
  if (uid) url += '&auth_variable_override=' + encodeURIComponent(JSON.stringify({ uid, token: { email_verified: true } }));
  const r = await fetch(url, { method, headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return r.status;
}
const asAdmin = (m, p, b) => call(m, p, b, null);
const as = (uid) => (m, p, b) => call(m, p, b, uid);
async function loadRules(rules) {
  const r = await fetch(`http://${HOST}/.settings/rules.json?ns=${NS}`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: JSON.stringify(rules) });
  assert.strictEqual(r.status, 200, 'rules load');
}
async function seed() {
  assert.strictEqual(await asAdmin('PUT', '', {
    users: {
      uBrand: { role: 'marketer', name: 'Brand' },
      uCreator: { role: 'influencer', name: 'Creator' },
    },
    items: { it1: { uid: 'uBrand', caption: 'existing', time: 1, status: 'active' } },
  }), 200);
}
const item = (uid) => ({ uid, caption: 'new campaign', time: Date.now(), status: 'active', price: '25', compensation: 'money' });
const interest = (uid) => ({ uid, time: Date.now(), platform: 'instagram' });
const results = [];
async function check(name, got, want) {
  const ok = got === want;
  results.push(`${ok ? 'ok  ' : 'FAIL'} ${name} (HTTP ${got}, want ${want})`);
  if (!ok) process.exitCode = 1;
}

(async () => {
  const brand = as('uBrand');
  const creator = as('uCreator');

  // ---- plain rules (database.rules.json): lock only, no gate ----
  await loadRules(plainRules);
  await seed();
  await check('plain: user edits own profile', await brand('PATCH', 'users/uBrand', { name: 'Brand 2' }), 200);
  await check('plain: user cannot write own plan', await brand('PUT', 'plans/uBrand', { tier: 'brand', status: 'active', current_period_end: Date.now() + 30 * DAY }), 401);
  await check('plain: user cannot write plan via parent update', await brand('PATCH', 'users/uBrand', { plan: { status: 'active' } }), 401);
  await check('plain: user cannot write plan.status', await brand('PUT', 'plans/uBrand/status', 'active'), 401);
  await check('plain: user cannot put a plan in the public users record', await brand('PUT', 'users/uBrand/plan', { status: 'active' }), 401);
  await check('plain: owner reads own plans/{uid}', await brand('GET', 'plans/uBrand'), 200);
  await check('plain: other signed-in user cannot read plans/{uid}', await creator('GET', 'plans/uBrand'), 401);
  await check('plain: user cannot write stripe_customer_id', await brand('PUT', 'users/uBrand/stripe_customer_id', 'cus_x'), 401);
  await check('plain: user cannot read billing/*', await brand('GET', 'billing/customers/uBrand'), 401);
  await check('plain: user cannot write billing/*', await brand('PUT', 'billing/customers/uBrand', { id: 'cus_x' }), 401);
  await check('plain: admin (webhook) writes plan', await asAdmin('PUT', 'plans/uBrand', { tier: 'brand', status: 'canceled', current_period_end: 1 }), 200);
  await check('plain: no gate yet, brand posts without plan', await brand('PUT', 'items/itPlain', item('uBrand')), 200);
  await check('plain: no gate yet, creator applies without plan', await creator('PUT', 'items/it1/interests/iPlain', interest('uCreator')), 200);

  // ---- gated rules (deployment/gate-rules.js) ----
  await loadRules(gatedRules);
  await seed();
  await check('gated: brand without plan cannot post', await brand('PUT', 'items/itA', item('uBrand')), 401);
  await check('gated: creator without plan cannot apply', await creator('PUT', 'items/it1/interests/iA', interest('uCreator')), 401);
  await check('gated: creator without plan cannot list a service', await creator('PUT', 'items/itS', item('uCreator')), 401);
  await check('gated: brand edits existing item without plan', await brand('PATCH', 'items/it1', { status: 'inactive' }), 200);

  await asAdmin('PUT', 'plans/uBrand', { tier: 'brand', status: 'past_due', current_period_end: Date.now() + 20 * DAY });
  await check('gated: past_due plan cannot post', await brand('PUT', 'items/itB', item('uBrand')), 401);
  await asAdmin('PUT', 'plans/uBrand', { tier: 'brand', status: 'active', current_period_end: Date.now() - 4 * DAY });
  await check('gated: expired (past 3-day grace) cannot post', await brand('PUT', 'items/itC', item('uBrand')), 401);
  await asAdmin('PUT', 'plans/uBrand', { tier: 'brand', status: 'active', current_period_end: Date.now() - 1 * DAY });
  await check('gated: within 3-day grace can post', await brand('PUT', 'items/itD', item('uBrand')), 200);
  await asAdmin('PUT', 'plans/uBrand', { tier: 'brand', status: 'active', current_period_end: Date.now() + 30 * DAY });
  await check('gated: active brand plan posts', await brand('PUT', 'items/itE', item('uBrand')), 200);
  await check('gated: brand still cannot forge plan', await brand('PATCH', 'plans/uBrand', { current_period_end: Date.now() + 999 * DAY }), 401);

  await asAdmin('PUT', 'plans/uCreator', { tier: 'creator', status: 'trialing', current_period_end: Date.now() + 7 * DAY });
  await check('gated: active creator membership applies', await creator('PUT', 'items/it1/interests/iB', interest('uCreator')), 200);
  await asAdmin('PUT', 'plans/uCreator', { tier: 'creator', status: 'canceled', current_period_end: Date.now() - 30 * DAY });
  await check('gated: lapsed creator can still withdraw own interest', await creator('DELETE', 'items/it1/interests/iB'), 200);
  await check('gated: lapsed creator cannot apply again', await creator('PUT', 'items/it1/interests/iC', interest('uCreator')), 401);

  console.log(results.join('\n'));
  console.log(process.exitCode ? 'RULES TESTS FAILED' : `RULES TESTS PASSED (${results.length})`);
})().catch((e) => { console.error(e); process.exit(1); });
