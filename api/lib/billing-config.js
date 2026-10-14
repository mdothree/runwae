/**
 * Runwae billing config: the ONE place prices and fee settings live.
 * (Pricing model, Principal 2026-10-14: subscription + 0% transaction fee.)
 *
 * Changing a price = edit `amount_usd` here, then run
 * ~/mdo3d/staged/runwae_billing_GO/01_create_live_prices.sh (it creates a new
 * Stripe Price for the same lookup_key and moves the key onto it). Checkout
 * refuses to start if the Stripe Price amount and this file disagree, so the
 * site can never show one price and charge another.
 * The static pages pick these numbers up at build time (deployment/build-dist.js
 * rewrites every <span data-rw-price="brand|creator">).
 *
 * Whole dollars only (no .99), monthly only. Final prices: brand $49/mo, creator $12/mo
 * (decided by the lane under the Principal's pricing delegation, 2026-10-14).
 *
 * Nothing here is "free": creators pay a membership; early access is given
 * with Stripe promotion codes (allow_promotion_codes on Checkout).
 */
'use strict';

const PLANS = Object.freeze({
  brand: Object.freeze({
    tier: 'brand',
    role: 'marketer',            // users/{uid}/role value that gets this plan
    name: 'Runwae Brand plan',
    short: 'Brand plan',
    email_name: 'Brand',          // "You're on the Runwae Brand plan"
    amount_usd: 49,
    interval: 'month',
    lookup_key: 'runwae_brand_monthly',
    unlocks: 'Post campaigns and hire creators',
  }),
  creator: Object.freeze({
    tier: 'creator',
    role: 'influencer',
    name: 'Runwae Creator membership',
    short: 'Creator membership',
    email_name: 'Creator',
    amount_usd: 12,
    interval: 'month',
    lookup_key: 'runwae_creator_monthly',
    unlocks: 'Apply to campaigns and list services',
  }),
});

// Gig checkout. Runwae keeps 0% of every gig price: the creator receives the
// full gig price. Card processing is passed through at Stripe's standard US
// card rate and shown to the marketer as its own line.
const PROCESSING = Object.freeze({
  percent: 2.9,      // Stripe standard US card rate
  fixed_cents: 30,
  label: 'Card processing (Stripe, passed through at cost)',
});

// Plan statuses that unlock posting / applying, and how long a plan keeps
// working past current_period_end while Stripe's renewal webhook arrives.
const ACTIVE_STATUSES = Object.freeze(['active', 'trialing']);
const GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Master switch. Unset (the default) = billing is OFF and the site behaves as
 * before: no paywall, no processing line, billing endpoints answer 503, and
 * the build keeps the pre-subscription copy. The GO sets RUNWAE_BILLING_ENABLED=1.
 */
function billingEnabled(env) {
  return String((env || process.env).RUNWAE_BILLING_ENABLED || '').trim() === '1';
}

/** Processing pass-through flag: default ON once billing is enabled; "0" turns it off. */
function processingPassThrough(env) {
  const e = env || process.env;
  if (!billingEnabled(e)) return false;
  return String(e.RUNWAE_PROCESSING_PASS_THROUGH || '1').trim() !== '0';
}

function planForRole(role) {
  return Object.values(PLANS).find((p) => p.role === role) || null;
}

module.exports = { PLANS, PROCESSING, ACTIVE_STATUSES, GRACE_MS, billingEnabled, processingPassThrough, planForRole };
