/**
 * Interim payout guard (RW-SEC-01 / RW-SEC-02 stop-gap). Run on xps:
 *   node --test tests/security/interim-guard.test.js
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { state, load, call, seed, GIG } = require('./_mocks');

const pay = () => load('api/payment/pay-influencer.js');
const charge = () => load('api/payment/charge-marketer.js');
const oauth = () => load('api/payment/connect-oauth.js');

test('G1 (was A1): creator self-sets status 6 after the brand paid -> payout refused 403 payout_review, no transfer', async () => {
  seed(4);
  const c = await call(charge(), { uid: 'uBrand', body: { stripeToken: 'tok_visa', gigPath: GIG } });
  assert.strictEqual(c.status, 200);
  state.db.ref(GIG + '/status').set(6);
  const p = await call(pay(), { uid: 'uCreator', body: { gigPath: GIG } });
  assert.strictEqual(p.status, 403);
  assert.strictEqual(p.body.error, 'payout_review');
  assert.match(p.body.message, /hello@runwae\.com/);
  assert.ok(!state.calls.some((x) => x[0] === 'transfer'), 'no transfer');
});

test('G2: legacy paid gig at status 4/5 (transaction_key set, no transfer) cannot be drained', async () => {
  for (const s of [4, 5, 6, 7]) {
    seed(s, { gig: { transaction_key: 'tx1' }, extra: { transactions: { tx1: { path: GIG, status: 'incomplete', price: '500', marketerID: 'uBrand', influencerID: 'uCreator', marketer_transactionID: 'ch_old' } } } });
    const p = await call(pay(), { uid: 'uCreator', body: { gigPath: GIG } });
    assert.strictEqual(p.status, 403, 'status ' + s);
    assert.strictEqual(state.calls.length, 0);
  }
});

test('G3: a verification record NOT written for the brand does not unlock payout', async () => {
  seed(6, { gig: { transaction_key: 'tx1' }, extra: {
    transactions: { tx1: { path: GIG, status: 'incomplete', price: '500', marketerID: 'uBrand', influencerID: 'uCreator', marketer_transactionID: 'ch_old' } },
    gig_verifications: { it1: { g1: { by: 'uCreator', time: 1 } } } } });
  const p = await call(pay(), { uid: 'uCreator', body: { gigPath: GIG } });
  assert.strictEqual(p.status, 403);
  assert.strictEqual(state.calls.length, 0);
});

test('G4 control: with a server record by the brand, the normal payout still works once', async () => {
  seed(6, { gig: { transaction_key: 'tx1' }, extra: {
    transactions: { tx1: { path: GIG, status: 'incomplete', price: '500', marketerID: 'uBrand', influencerID: 'uCreator', marketer_transactionID: 'ch_old' } },
    gig_verifications: { it1: { g1: { by: 'uBrand', time: 1 } } } } });
  const p = await call(pay(), { uid: 'uCreator', body: { gigPath: GIG } });
  assert.strictEqual(p.status, 200, JSON.stringify(p.body));
  assert.deepStrictEqual(state.calls, [['transfer', 50000, 'acct_creator']]);
  const again = await call(pay(), { uid: 'uCreator', body: { gigPath: GIG } });
  assert.strictEqual(again.status, 409);
});

test('G5: guard marker header is present on 401/405 (live check without a session)', async () => {
  const a = await call(pay(), { body: { gigPath: GIG } });
  assert.strictEqual(a.status, 401);
  assert.strictEqual(a.headers['x-runwae-payout-guard'], '1');
  const b = await call(pay(), { method: 'GET' });
  assert.strictEqual(b.status, 405);
  assert.strictEqual(b.headers['x-runwae-payout-guard'], '1');
  const c = await call(oauth(), { body: { code: 'x' } });
  assert.strictEqual(c.status, 401);
  assert.strictEqual(c.headers['x-runwae-connect-guard'], '1');
});

test('G6 (was A2): connect-oauth never overwrites an existing payout account (code not redeemed)', async () => {
  seed(6);
  state.oauthAcct = 'acct_attacker';
  const o = await call(oauth(), { uid: 'uCreator', body: { code: 'ac_attacker_code' } });
  assert.strictEqual(o.status, 409);
  assert.strictEqual(o.body.error, 'account_exists');
  assert.strictEqual(state.db.get('stripe_accounts/uCreator/stripe_user_id'), 'acct_creator');
  assert.ok(!state.calls.some((x) => x[0] === 'oauth'), 'code not redeemed');
});

test('G7 control: a first payout account can still be connected', async () => {
  seed(6, { noAccount: true });
  state.oauthAcct = 'acct_first';
  const o = await call(oauth(), { uid: 'uCreator', body: { code: 'ac_ok' } });
  assert.strictEqual(o.status, 200, JSON.stringify(o.body));
  assert.strictEqual(state.db.get('stripe_accounts/uCreator/stripe_user_id'), 'acct_first');
});

test('G8: connect-oauth does not echo Stripe error text', async () => {
  seed(6, { noAccount: true });
  const stripe = require('module')._load('stripe')();
  const orig = stripe.oauth.token;
  stripe.oauth.token = async () => { throw new Error('No such authorization code: ac_x; a similar object exists in live mode'); };
  try {
    const o = await call(oauth(), { uid: 'uCreator', body: { code: 'ac_x' } });
    assert.strictEqual(o.status, 400);
    assert.ok(!/live mode|No such/.test(JSON.stringify(o.body)));
  } finally { stripe.oauth.token = orig; }
});
