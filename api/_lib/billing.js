/**
 * Billing helpers shared by api/billing/* and api/payment/* (subscription +
 * 0% transaction fee model, Principal 2026-10-14). Prices/fees: billing-config.js.
 *
 * Firebase layout (written ONLY with the admin SDK; see database.rules.json):
 *   plans/{uid}                   { tier, status, current_period_end (ms), cancel_at_period_end, updated }
 *                                 (owner-only read; users/* is readable by every signed-in user)
 *   billing/customers/{uid}       { id: "cus_...", created }
 *   billing/customer_uid/{cusId}  uid
 *   billing/subscriptions/{uid}   { id: "sub_...", event_created }
 *   billing/events/{eventId}      { type, time }   (webhook idempotency)
 */
'use strict';

const {
  PLANS, PROCESSING, ACTIVE_STATUSES, GRACE_MS, billingEnabled, processingPassThrough, planForRole,
} = require('./billing-config');

const LIVE_KEY_RE = /^(sk|rk)_live_/;

class BillingError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

/** True if any env VALUE looks like a live Stripe secret/restricted key (values are never printed). */
function envHasLiveKey(env) {
  return Object.values(env || process.env).some((v) => typeof v === 'string' && LIVE_KEY_RE.test(v.trim()));
}

/**
 * Live-key guard.
 *  - Test mode (RUNWAE_TEST_MODE=1 or NODE_ENV=test): ANY live key in the env -> throw.
 *  - Vercel preview/development: a live STRIPE_SECRET_KEY -> refuse (billing only runs live in production).
 */
function assertKeyAllowed(env) {
  const e = env || process.env;
  const testMode = e.RUNWAE_TEST_MODE === '1' || e.NODE_ENV === 'test';
  if (testMode && envHasLiveKey(e)) {
    throw new BillingError(500, 'live_key_in_test', 'Refusing to run: a live Stripe key is present in a test environment');
  }
  const vercelEnv = e.VERCEL_ENV;
  if (vercelEnv && vercelEnv !== 'production' && LIVE_KEY_RE.test(String(e.STRIPE_SECRET_KEY || '').trim())) {
    throw new BillingError(503, 'live_key_outside_production', 'Billing is disabled on non-production deployments with a live key');
  }
}

function siteUrl(env) {
  const u = String((env || process.env).RUNWAE_SITE_URL || 'https://runwae.com').trim().replace(/\/+$/, '');
  return /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(u) || /^http:\/\/localhost(:\d+)?$/.test(u) ? u : 'https://runwae.com';
}

/**
 * Gig checkout amounts in cents. The creator always receives price_cents (0% platform fee).
 * With pass-through on, total = ceil((price + fixed) / (1 - pct)) so that Stripe's standard
 * fee on the total leaves exactly the gig price; processing = total - price.
 */
function processingQuote(priceDollars, passThrough) {
  const price = Math.round(Number(priceDollars));
  if (!Number.isFinite(price) || price <= 0) throw new BillingError(400, 'bad_price', 'Invalid gig price');
  const price_cents = price * 100;
  if (!passThrough) return { price_cents, processing_cents: 0, total_cents: price_cents, pass_through: false };
  const pct = PROCESSING.percent / 100;
  const total_cents = Math.ceil((price_cents + PROCESSING.fixed_cents) / (1 - pct));
  return { price_cents, processing_cents: total_cents - price_cents, total_cents, pass_through: true };
}

/** Is a plans/{uid} record currently usable? */
function isPlanActive(plan, now) {
  if (!plan || typeof plan !== 'object') return false;
  if (!ACTIVE_STATUSES.includes(plan.status)) return false;
  const end = Number(plan.current_period_end);
  return Number.isFinite(end) && end + GRACE_MS > (now || Date.now());
}

function planByLookupKey(key) {
  return Object.values(PLANS).find((p) => p.lookup_key === key) || null;
}

/** Build the plans/{uid} record from a Stripe Subscription object. */
function planFromSubscription(sub, now) {
  const item = sub && sub.items && sub.items.data && sub.items.data[0];
  const price = item && item.price;
  const plan = (price && planByLookupKey(price.lookup_key))
    || (sub && sub.metadata && PLANS[sub.metadata.tier]) || null;
  // API versions before 2025-03-31 keep current_period_end on the subscription; later ones on the item.
  const endSec = Number((sub && sub.current_period_end) || (item && item.current_period_end) || 0);
  return {
    tier: plan ? plan.tier : 'unknown',
    status: sub && sub.status ? String(sub.status) : 'unknown',
    current_period_end: endSec * 1000,
    cancel_at_period_end: !!(sub && sub.cancel_at_period_end),
    updated: now || Date.now(),
  };
}

/** Public, non-secret billing info for the browser (GET /api/billing/plans). */
function publicBillingInfo(env) {
  const enabled = billingEnabled(env);
  return {
    enabled,
    plans: Object.values(PLANS).map((p) => ({
      tier: p.tier, role: p.role, name: p.short, amount_usd: p.amount_usd, interval: p.interval, unlocks: p.unlocks,
    })),
    processing: {
      pass_through: processingPassThrough(env),
      percent: PROCESSING.percent,
      fixed_cents: PROCESSING.fixed_cents,
      label: PROCESSING.label,
    },
    platform_fee_percent: 0,
  };
}

/**
 * Email hook -> api/_lib/email.js (sendEmail({ to, template, data, idempotencyKey })), templates
 * subscription_welcome | subscription_receipt | subscription_payment_failed | subscription_cancelled
 * (data contract in api/_lib/_email-templates.js). If email.js is missing this is a no-op.
 * Never throws: a failed email must not fail the webhook (Stripe would retry the plan write).
 */
async function sendBillingEmail(template, to, data, idempotencyKey) {
  if (!to) return { skipped: 'no_recipient' };
  let email;
  try { email = require('./email'); } catch (e) { return { skipped: 'no_email_lib' }; }
  try {
    if (email && typeof email.sendEmail === 'function') return await email.sendEmail({ to, template, data, idempotencyKey });
    if (email && typeof email.sendTemplate === 'function') return await email.sendTemplate(template, to, data, idempotencyKey);
    return { skipped: 'no_matching_export' };
  } catch (err) {
    console.error('billing email failed', template, err && err.message);
    return { error: true };
  }
}

module.exports = {
  PLANS, PROCESSING, BillingError, billingEnabled, processingPassThrough, planForRole,
  envHasLiveKey, assertKeyAllowed, siteUrl, processingQuote, isPlanActive, planByLookupKey,
  planFromSubscription, publicBillingInfo, sendBillingEmail,
};
