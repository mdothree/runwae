/**
 * Live-key guard for the billing tests. Required FIRST by tests/billing.test.js.
 * If any env value looks like a live Stripe key (sk_live_ / rk_live_), the tests refuse
 * to run at all (exit 3). Values are never printed, only the variable NAMES.
 */
'use strict';

const LIVE = /^(sk|rk)_live_/;
const hits = Object.keys(process.env).filter((k) => LIVE.test(String(process.env[k] || '').trim()));
if (hits.length) {
  console.error('REFUSING TO RUN: live Stripe key present in env var(s): ' + hits.join(', '));
  process.exit(3);
}
process.env.RUNWAE_TEST_MODE = '1';
module.exports = true;
