/**
 * POST /api/billing/portal
 * Auth: Firebase ID token (Bearer).
 * Opens the Stripe customer portal (update card, see invoices, cancel) for the
 * caller's own Stripe customer. Portal features are set in the Stripe dashboard
 * (see staged/runwae_billing_GO/STEPS.md).
 *
 * 200 { url } · 401 unauthenticated · 404 no_customer · 503 billing_not_enabled
 */
'use strict';

const stripe = require('../_lib/stripe');
const { admin, billing, BillingError, requireUser, preflight, getCustomerId, sendError } = require('./_common');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    preflight();
    const { uid } = await requireUser(req);
    const customer = await getCustomerId(admin.database(), uid);
    if (!customer) throw new BillingError(404, 'no_customer', 'You have no billing account yet. Choose a plan first.');
    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${billing.siteUrl(process.env)}/account#billing`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    return sendError(res, err);
  }
};
