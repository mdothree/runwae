/**
 * POST /api/billing/checkout
 * Auth: Firebase ID token (Bearer).
 * Body: {}   (the plan comes from users/{uid}/role on the server; a client "tier" is ignored)
 *
 * Starts a Stripe Checkout Session in subscription mode:
 *   marketer   -> Brand plan        (lookup_key runwae_brand_monthly)
 *   influencer -> Creator membership (lookup_key runwae_creator_monthly)
 * Promotion codes are allowed (early access). The Stripe customer is created
 * once per user and reused (billing/customers/{uid}).
 * Nothing about the plan is written here: plans/{uid} is written only by
 * api/billing/webhook.js after Stripe confirms.
 *
 * 200 { url }   -> browser redirects to Stripe Checkout
 * 401 unauthenticated · 400 no_plan_for_role · 409 already_subscribed
 * 503 billing_not_enabled | price_missing · 500 price_mismatch
 */
'use strict';

const stripe = require('../lib/stripe');
const { admin, billing, BillingError, requireUser, preflight, ensureCustomer, sendError } = require('./_common');

/** Resolve the live Stripe Price for a plan and check it matches billing-config.js. */
async function resolvePrice(plan) {
  const list = await stripe.prices.list({ lookup_keys: [plan.lookup_key], active: true, limit: 1 });
  const price = list && list.data && list.data[0];
  if (!price) throw new BillingError(503, 'price_missing', 'This plan is not available yet');
  const ok = price.unit_amount === plan.amount_usd * 100 && price.currency === 'usd'
    && price.recurring && price.recurring.interval === plan.interval;
  if (!ok) {
    console.error('checkout: Stripe price does not match billing-config', plan.lookup_key);
    throw new BillingError(500, 'price_mismatch', 'This plan is temporarily unavailable');
  }
  return price;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    preflight();
    const { uid, email } = await requireUser(req);
    const db = admin.database();
    const [user, current] = await Promise.all([
      db.ref(`users/${uid}`).once('value').then((s) => s.val() || {}),
      db.ref(`plans/${uid}`).once('value').then((s) => s.val()),
    ]);

    const plan = billing.planForRole(user.role);
    if (!plan) throw new BillingError(400, 'no_plan_for_role', 'Choose brand or creator on your account first');
    if (billing.isPlanActive(current)) {
      throw new BillingError(409, 'already_subscribed', 'Your plan is already active. Manage it from your account.');
    }

    const price = await resolvePrice(plan);
    const customer = await ensureCustomer(stripe, db, uid, email || user.email, user.role);
    const site = billing.siteUrl(process.env);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: uid,
      line_items: [{ price: price.id, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: { metadata: { uid, tier: plan.tier } },
      metadata: { uid, tier: plan.tier },
      success_url: `${site}/account?plan=started#billing`,
      cancel_url: `${site}/plans?canceled=1`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return sendError(res, err);
  }
};
