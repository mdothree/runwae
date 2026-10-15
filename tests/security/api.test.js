/**
 * Payment API security regression tests (RW-SEC-01/02/07/10), mocked Stripe +
 * firebase-admin. Run on xps:  node --test tests/security/
 * Each attack from the 2026-10-14 audit (api-probe A1-A5) is replayed and must
 * now be refused; every legitimate money/gift step must still succeed.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { state, load, call, seed, GIG } = require('./_mocks');

const ep = (n) => load('api/payment/' + n + '.js');
const TX = { path: GIG, status: 'incomplete', price: '500', marketerID: 'uBrand', influencerID: 'uCreator', marketer_transactionID: 'ch_1' };
const paidGig = (status, extra) => seed(status, Object.assign({ gig: { transaction_key: 'tx1' }, extra: { transactions: { tx1: Object.assign({}, TX) } } }, extra || {}));
const transfers = () => state.calls.filter((x) => x[0] === 'transfer');
const oauthCalls = () => state.calls.filter((x) => x[0] === 'oauth');

// ---------------- RW-SEC-01 ----------------
test('S01-A1 creator self-verifies after the brand paid: no payout', async () => {
  seed(2);
  assert.strictEqual((await call(ep('charge-marketer'), { uid: 'uBrand', body: { stripeToken: 'tok_visa', gigPath: GIG } })).status, 200);
  state.db.ref(GIG + '/status').set(6); // what rules probe W1 used to allow
  const p = await call(ep('pay-influencer'), { uid: 'uCreator', body: { gigPath: GIG } });
  assert.strictEqual(p.status, 403); assert.strictEqual(p.body.error, 'payout_review');
  assert.strictEqual(transfers().length, 0);
});

test('S01 full money flow: charge -> post -> brand verify-post -> payout (once)', async () => {
  seed(2);
  const c = await call(ep('charge-marketer'), { uid: 'uBrand', body: { stripeToken: 'tok_visa', gigPath: GIG } });
  assert.strictEqual(c.status, 200, JSON.stringify(c.body));
  assert.strictEqual(state.db.get(GIG + '/status'), 4, 'charge sets status 4 server-side');
  const key = c.body.transactionKey;
  assert.ok(state.db.get('users_private/uBrand/transactions/' + key) && state.db.get('users_private/uCreator/transactions/' + key), 'tx index in users_private');
  assert.strictEqual(state.db.get('users/uBrand/transactions'), undefined, 'no tx index under public users/');
  state.db.ref(GIG + '/status').set(5); // creator: post completed (client, allowed by rules 4->5)
  const v = await call(ep('verify-post'), { uid: 'uBrand', body: { gigPath: GIG, mode: 'verify' } });
  assert.strictEqual(v.status, 200, JSON.stringify(v.body));
  assert.strictEqual(state.db.get(GIG + '/status'), 6);
  assert.strictEqual(state.db.get('gig_verifications/it1/g1/by'), 'uBrand');
  const v2 = await call(ep('verify-post'), { uid: 'uBrand', body: { gigPath: GIG, mode: 'verify' } });
  assert.strictEqual(v2.status, 200); assert.strictEqual(v2.body.already, true);
  const p = await call(ep('pay-influencer'), { uid: 'uCreator', body: { gigPath: GIG } });
  assert.strictEqual(p.status, 200, JSON.stringify(p.body));
  assert.deepStrictEqual(transfers(), [['transfer', 50000, 'acct_creator']]);
  assert.strictEqual(state.db.get(GIG + '/status'), 7);
  assert.strictEqual(state.db.get('transactions/' + key + '/status'), 'complete');
  assert.ok(state.db.get('users_private/uCreator/transactions/' + key));
  const again = await call(ep('pay-influencer'), { uid: 'uCreator', body: { gigPath: GIG } });
  assert.strictEqual(again.status, 409); assert.strictEqual(transfers().length, 1);
});

test('S01 brand "skip verification" path goes through the server too (status 4 -> 6)', async () => {
  paidGig(4);
  const v = await call(ep('verify-post'), { uid: 'uBrand', body: { gigPath: GIG, mode: 'skip' } });
  assert.strictEqual(v.status, 200, JSON.stringify(v.body));
  assert.strictEqual(state.db.get('gig_verifications/it1/g1/mode'), 'skip');
  assert.strictEqual(state.db.get(GIG + '/status'), 6);
});

test('S01 verify-post refusals: creator, outsider, unpaid, wrong status, bad mode, no auth', async () => {
  paidGig(5);
  assert.strictEqual((await call(ep('verify-post'), { uid: 'uCreator', body: { gigPath: GIG, mode: 'verify' } })).status, 403);
  assert.strictEqual((await call(ep('verify-post'), { uid: 'uEve', body: { gigPath: GIG, mode: 'verify' } })).status, 403);
  assert.strictEqual((await call(ep('verify-post'), { body: { gigPath: GIG, mode: 'verify' } })).status, 401);
  assert.strictEqual((await call(ep('verify-post'), { uid: 'uBrand', body: { gigPath: GIG, mode: 'approve' } })).status, 400);
  assert.strictEqual((await call(ep('verify-post'), { uid: 'uBrand', body: { gigPath: GIG, mode: 'skip' } })).status, 409, 'skip only from 4');
  seed(5); // money gig, never paid
  const u = await call(ep('verify-post'), { uid: 'uBrand', body: { gigPath: GIG, mode: 'verify' } });
  assert.strictEqual(u.status, 409); assert.strictEqual(u.body.error, 'not_paid');
  paidGig(2);
  assert.strictEqual((await call(ep('verify-post'), { uid: 'uBrand', body: { gigPath: GIG, mode: 'verify' } })).status, 409);
  paidGig(5, { extra: { transactions: { tx1: Object.assign({}, TX, { marketerID: 'uEve' }) } } });
  assert.strictEqual((await call(ep('verify-post'), { uid: 'uBrand', body: { gigPath: GIG, mode: 'verify' } })).status, 409, 'tx must be the brand\'s charge');
  assert.strictEqual(state.db.get('gig_verifications'), undefined);
});

test('S01 legacy gig at status 6 (old client) can only be released by the brand confirming', async () => {
  paidGig(6);
  assert.strictEqual((await call(ep('pay-influencer'), { uid: 'uCreator', body: { gigPath: GIG } })).status, 403);
  assert.strictEqual((await call(ep('verify-post'), { uid: 'uBrand', body: { gigPath: GIG, mode: 'verify' } })).status, 200);
  assert.strictEqual((await call(ep('pay-influencer'), { uid: 'uCreator', body: { gigPath: GIG } })).status, 200);
});

test('S01 pay-influencer: record present but status not 6, or tx of another brand -> refused', async () => {
  paidGig(5, { extra: { transactions: { tx1: Object.assign({}, TX) }, gig_verifications: { it1: { g1: { by: 'uBrand', time: 1 } } } } });
  assert.strictEqual((await call(ep('pay-influencer'), { uid: 'uCreator', body: { gigPath: GIG } })).status, 409);
  paidGig(6, { extra: { transactions: { tx1: Object.assign({}, TX, { marketerID: 'uEve' }) }, gig_verifications: { it1: { g1: { by: 'uBrand', time: 1 } } } } });
  assert.strictEqual((await call(ep('pay-influencer'), { uid: 'uCreator', body: { gigPath: GIG } })).status, 409);
  assert.strictEqual(transfers().length, 0);
});

test('S01 charge-marketer refuses once the gig is past payment (status >= 4)', async () => {
  seed(4);
  const c = await call(ep('charge-marketer'), { uid: 'uBrand', body: { stripeToken: 'tok_visa', gigPath: GIG } });
  assert.strictEqual(c.status, 409); assert.strictEqual(state.calls.length, 0);
});

// ---------------- RW-SEC-02/23 ----------------
async function startFor(uid, body) {
  const r = await call(ep('connect-start'), { uid, body: body || {} });
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  return r.body;
}
const stateOf = (url) => new URL(url).searchParams.get('state');

test('S02-A2 attacker code without state is refused before redemption', async () => {
  seed(6);
  state.oauthAcct = 'acct_attacker';
  const o = await call(ep('connect-oauth'), { uid: 'uCreator', body: { code: 'ac_attacker' } });
  assert.strictEqual(o.status, 403); assert.strictEqual(o.body.error, 'bad_state');
  assert.strictEqual(oauthCalls().length, 0);
  assert.strictEqual(state.db.get('stripe_accounts/uCreator/stripe_user_id'), 'acct_creator');
});

test('S02 state is bound to the uid, single-use and expires', async () => {
  seed(6, { noAccount: true });
  const eve = await startFor('uEve');
  const o1 = await call(ep('connect-oauth'), { uid: 'uCreator', body: { code: 'ac_x', state: stateOf(eve.url) } });
  assert.strictEqual(o1.status, 403, 'state issued to Eve is useless in the creator session');
  const mine = await startFor('uCreator');
  assert.strictEqual(mine.connected, false);
  assert.match(mine.url, /^https:\/\/connect\.stripe\.com\/oauth\/authorize\?response_type=code&client_id=ca_[A-Za-z0-9]+&scope=read_write&state=[0-9a-f]{48}$/);
  const ok = await call(ep('connect-oauth'), { uid: 'uCreator', body: { code: 'ac_ok', state: stateOf(mine.url) } });
  assert.strictEqual(ok.status, 200, JSON.stringify(ok.body));
  assert.strictEqual(state.db.get('stripe_accounts/uCreator/stripe_user_id'), 'acct_new');
  const replay = await call(ep('connect-oauth'), { uid: 'uCreator', body: { code: 'ac_ok2', state: stateOf(mine.url) } });
  assert.strictEqual(replay.status, 403, 'state is single use');
  seed(6, { noAccount: true });
  const late = await startFor('uCreator');
  state.db.ref('oauth_states/uCreator/exp').set(Date.now() - 1);
  assert.strictEqual((await call(ep('connect-oauth'), { uid: 'uCreator', body: { code: 'ac', state: stateOf(late.url) } })).status, 403, 'expired');
  assert.strictEqual((await call(ep('connect-oauth'), { uid: 'uCreator', body: { code: 'ac', state: 'zz' } })).status, 403, 'malformed');
  assert.strictEqual(oauthCalls().length, 0, 'no code redeemed on any refusal');
});

test('S02 no silent overwrite: existing account + valid state -> 409, code not redeemed', async () => {
  seed(6);
  const s = await startFor('uCreator', {});
  assert.strictEqual(s.connected, true); assert.strictEqual(s.url, undefined);
  // even a state from a replace=true start needs confirmReplace in the request
  const r = await startFor('uCreator', { replace: true });
  const o = await call(ep('connect-oauth'), { uid: 'uCreator', body: { code: 'ac_new', state: stateOf(r.url) } });
  assert.strictEqual(o.status, 409); assert.strictEqual(oauthCalls().length, 0);
  assert.strictEqual(state.db.get('stripe_accounts/uCreator/stripe_user_id'), 'acct_creator');
});

test('S02 confirmed replacement needs a fresh sign-in; it is logged', async () => {
  seed(6);
  state.authTime = () => Math.floor(Date.now() / 1000) - 3600; // signed in an hour ago
  let r = await startFor('uCreator', { replace: true });
  const stale = await call(ep('connect-oauth'), { uid: 'uCreator', body: { code: 'ac_new', state: stateOf(r.url), confirmReplace: true } });
  assert.strictEqual(stale.status, 401); assert.strictEqual(stale.body.error, 'reauth_required'); assert.strictEqual(oauthCalls().length, 0);
  state.authTime = () => Math.floor(Date.now() / 1000) - 60;
  r = await startFor('uCreator', { replace: true });
  state.oauthAcct = 'acct_replacement';
  const ok = await call(ep('connect-oauth'), { uid: 'uCreator', body: { code: 'ac_new', state: stateOf(r.url), confirmReplace: true } });
  assert.strictEqual(ok.status, 200, JSON.stringify(ok.body)); assert.strictEqual(ok.body.replaced, true);
  assert.strictEqual(state.db.get('stripe_accounts/uCreator/stripe_user_id'), 'acct_replacement');
  const log = state.db.get('stripe_account_changes/uCreator');
  assert.ok(log && Object.values(log)[0].from === 'acct_creator' && Object.values(log)[0].to === 'acct_replacement');
});

test('S02 connect-start needs auth; connect-oauth hides Stripe errors', async () => {
  seed(6, { noAccount: true });
  assert.strictEqual((await call(ep('connect-start'), { body: {} })).status, 401);
  const s = await startFor('uCreator');
  const stripe = require('module')._load('stripe')();
  const orig = stripe.oauth.token;
  stripe.oauth.token = async () => { throw new Error('No such authorization code; a similar object exists in live mode'); };
  try {
    const o = await call(ep('connect-oauth'), { uid: 'uCreator', body: { code: 'ac_x', state: stateOf(s.url) } });
    assert.strictEqual(o.status, 400); assert.ok(!/live mode|No such/.test(JSON.stringify(o.body)));
  } finally { stripe.oauth.token = orig; }
});

// ---------------- RW-SEC-07 ----------------
test('S07-A3 record-gift at status 0 / unshipped / unverified is refused', async () => {
  for (const [st, gig, extra, code] of [
    [0, { tracking_number: '1Z' }, {}, 'not_ready'],
    [6, {}, { gig_verifications: { it1: { g1: { by: 'uBrand', time: 1 } } } }, 'not_shipped'],
    [6, { tracking_number: '1Z' }, {}, 'not_verified'],
    [6, { tracking_number: '1Z' }, { gig_verifications: { it1: { g1: { by: 'uCreator', time: 1 } } } }, 'not_verified'],
  ]) {
    seed(st, { compensation: 'gift', gig, extra });
    const r = await call(ep('record-gift'), { uid: 'uCreator', body: { gigPath: GIG } });
    assert.strictEqual(r.status, 409, st + ' ' + JSON.stringify(r.body)); assert.strictEqual(r.body.error, code);
    assert.strictEqual(state.db.get('transactions'), undefined);
  }
});

test('S07 full gift flow: tracking -> post -> brand verify -> creator accepts (server sets 7)', async () => {
  seed(4, { compensation: 'gift', gig: { tracking_number: '1Z999' } });
  state.db.ref(GIG + '/status').set(5);
  assert.strictEqual((await call(ep('verify-post'), { uid: 'uBrand', body: { gigPath: GIG, mode: 'verify' } })).status, 200);
  const r = await call(ep('record-gift'), { uid: 'uCreator', body: { gigPath: GIG } });
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.strictEqual(state.db.get(GIG + '/status'), 7);
  assert.strictEqual(state.db.get('transactions/' + r.body.transactionKey + '/tracking_number'), '1Z999');
  assert.ok(state.db.get('users_private/uBrand/transactions/' + r.body.transactionKey));
  const again = await call(ep('record-gift'), { uid: 'uCreator', body: { gigPath: GIG } });
  assert.strictEqual(again.status, 200); assert.strictEqual(again.body.existing, true);
  assert.strictEqual((await call(ep('record-gift'), { uid: 'uBrand', body: { gigPath: GIG } })).status, 403);
  // gift skip path: brand skips verification at status 4
  seed(4, { compensation: 'gift', gig: { tracking_number: '1Z' } });
  assert.strictEqual((await call(ep('verify-post'), { uid: 'uBrand', body: { gigPath: GIG, mode: 'skip' } })).status, 200);
  assert.strictEqual((await call(ep('record-gift'), { uid: 'uCreator', body: { gigPath: GIG } })).status, 200);
  seed(5, { compensation: 'gift' }); // gift not shipped
  assert.strictEqual((await call(ep('verify-post'), { uid: 'uBrand', body: { gigPath: GIG, mode: 'verify' } })).status, 409);
});

// ---------------- controls carried over from the audit (A4/A5) ----------------
test('A4 controls: non-party cannot charge / pay / gift / verify; replay + traversal blocked', async () => {
  paidGig(6, { extra: { transactions: { tx1: Object.assign({}, TX) }, gig_verifications: { it1: { g1: { by: 'uBrand', time: 1 } } } } });
  assert.strictEqual((await call(ep('charge-marketer'), { uid: 'uEve', body: { stripeToken: 'tok_visa', gigPath: GIG } })).status, 403);
  assert.strictEqual((await call(ep('pay-influencer'), { uid: 'uEve', body: { gigPath: GIG } })).status, 403);
  assert.strictEqual((await call(ep('pay-influencer'), { uid: 'uBrand', body: { gigPath: GIG } })).status, 403);
  assert.strictEqual((await call(ep('record-gift'), { uid: 'uEve', body: { gigPath: GIG } })).status, 403);
  assert.strictEqual((await call(ep('pay-influencer'), { uid: 'uCreator', body: { gigPath: 'items/it1/influencers/g1/../../it2' } })).status, 400);
  assert.strictEqual((await call(ep('charge-marketer'), { body: { stripeToken: 'x', gigPath: GIG } })).status, 401);
  assert.strictEqual((await call(ep('pay-influencer'), { uid: 'uCreator', body: { gigPath: GIG } })).status, 200);
  assert.strictEqual((await call(ep('pay-influencer'), { uid: 'uCreator', body: { gigPath: GIG } })).status, 409);
  assert.strictEqual(transfers().length, 1);
});

test('A5 (RW-SEC-10): Stripe error text is not echoed; card declines keep the customer message', async () => {
  seed(2);
  state.chargeError = Object.assign(new Error('Internal: No such token: tok_x; a similar object exists in live mode'), { type: 'StripeInvalidRequestError' });
  const r = await call(ep('charge-marketer'), { uid: 'uBrand', body: { stripeToken: 'tok_x', gigPath: GIG } });
  assert.strictEqual(r.status, 400); assert.ok(!/live mode|No such/.test(JSON.stringify(r.body)), JSON.stringify(r.body));
  seed(2);
  state.chargeError = Object.assign(new Error('Your card was declined.'), { type: 'StripeCardError', decline_code: 'insufficient_funds' });
  const d = await call(ep('charge-marketer'), { uid: 'uBrand', body: { stripeToken: 'tok_y', gigPath: GIG } });
  assert.strictEqual(d.body.message, 'Your card was declined.');
});
