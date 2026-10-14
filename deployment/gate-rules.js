#!/usr/bin/env node
/**
 * Plan gate for the Realtime Database rules (phase 2 of the billing GO).
 *
 * Posting a campaign/service (a NEW items/{id}) and applying to a gig (a NEW
 * items/{id}/interests/{k}) are direct RTDB writes from the browser, so the
 * server-side enforcement for them is the rules. This script derives the gated
 * rules from database.rules.json (the single source) so the two never drift:
 *
 *   node deployment/gate-rules.js [in=database.rules.json] [out=database.rules.gated.json]
 *
 * Deploy the OUTPUT only after billing is live (RUNWAE_BILLING_ENABLED=1, live
 * prices created, existing users given promo codes); deploying it earlier would
 * block every post and application. The plain database.rules.json (plan field
 * locked, no gate) is safe to deploy at any time.
 *
 * A plan unlocks when users/{auth.uid}/plan/status is active|trialing and
 * current_period_end + 3 days grace is in the future (same rule as
 * api/lib/billing.isPlanActive). Editing/removing existing items, comments,
 * shares, gigs in progress, payments and payouts are NOT gated.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { ACTIVE_STATUSES, GRACE_MS } = require('../api/lib/billing-config');

const PLAN = "root.child('users').child(auth.uid).child('plan')";
const PLAN_OK = '(' + '(' + ACTIVE_STATUSES.map((s) => `${PLAN}.child('status').val() === '${s}'`).join(' || ') + ')'
  + ` && ${PLAN}.child('current_period_end').isNumber() && ${PLAN}.child('current_period_end').val() + ${GRACE_MS} > now)`;

function gate(rules) {
  const r = JSON.parse(JSON.stringify(rules));
  const item = r.rules.items.$item;

  const ITEM_OLD = "auth != null && (data.exists() ? data.child('uid').val() === auth.uid : newData.child('uid').val() === auth.uid)";
  if (item['.write'] !== ITEM_OLD) throw new Error('gate-rules: items/$item/.write changed; update gate-rules.js');
  item['.write'] = `auth != null && (data.exists() ? data.child('uid').val() === auth.uid : (newData.child('uid').val() === auth.uid && ${PLAN_OK}))`;

  const interest = item.interests.$k;
  const INT_OLD = "auth != null && ((!data.exists() && newData.child('uid').val() === auth.uid) || (!newData.exists() && data.child('uid').val() === auth.uid))";
  if (interest['.write'] !== INT_OLD) throw new Error('gate-rules: items/$item/interests/$k/.write changed; update gate-rules.js');
  interest['.write'] = `auth != null && ((!data.exists() && newData.child('uid').val() === auth.uid && ${PLAN_OK}) || (!newData.exists() && data.child('uid').val() === auth.uid))`;

  return r;
}

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const input = process.argv[2] || path.join(root, 'database.rules.json');
  const output = process.argv[3] || path.join(root, 'database.rules.gated.json');
  const gated = gate(JSON.parse(fs.readFileSync(input, 'utf8')));
  fs.writeFileSync(output, JSON.stringify(gated, null, 2) + '\n');
  console.log('gate-rules: wrote', output);
}

module.exports = { gate, PLAN_OK };
