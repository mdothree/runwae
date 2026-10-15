/**
 * Shared bits for api/billing/* (not a route: Vercel ignores "_" files).
 */
'use strict';

const admin = require('../_lib/firebase');
const billing = require('../_lib/billing');

const { BillingError } = billing;

/** Firebase ID token in "Authorization: Bearer <token>" -> uid. */
async function requireUser(req) {
  const header = (req.headers && req.headers.authorization) || '';
  if (!header.startsWith('Bearer ')) throw new BillingError(401, 'unauthenticated', 'Sign in required');
  try {
    const decoded = await admin.auth().verifyIdToken(header.slice(7));
    return { uid: decoded.uid, email: decoded.email || '' };
  } catch (e) {
    throw new BillingError(401, 'unauthenticated', 'Invalid or expired token');
  }
}

/** Gate every billing route on the master switch and the live-key guard. */
function preflight() {
  billing.assertKeyAllowed(process.env);
  if (!billing.billingEnabled(process.env)) {
    throw new BillingError(503, 'billing_not_enabled', 'Plans are not open yet');
  }
}

/** Existing Stripe customer for uid, or null. */
async function getCustomerId(db, uid) {
  const snap = await db.ref(`billing/customers/${uid}/id`).once('value');
  const id = snap.val();
  return typeof id === 'string' && id.startsWith('cus_') ? id : null;
}

/** Reuse the user's Stripe customer, creating it once (idempotent per uid). */
async function ensureCustomer(stripe, db, uid, email, role) {
  const existing = await getCustomerId(db, uid);
  if (existing) return existing;
  const customer = await stripe.customers.create(
    { email: email || undefined, metadata: { uid, role: role || '' } },
    { idempotencyKey: `runwae_customer_${uid}` },
  );
  await db.ref().update({
    [`billing/customers/${uid}`]: { id: customer.id, created: Date.now() },
    [`billing/customer_uid/${customer.id}`]: uid,
  });
  return customer.id;
}

function sendError(res, err) {
  if (err instanceof BillingError) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
  console.error('billing error:', err && (err.code || err.type), err && err.message);
  return res.status(502).json({ error: 'billing_failed', message: 'Billing is unavailable right now. Please try again.' });
}

module.exports = { admin, billing, BillingError, requireUser, preflight, getCustomerId, ensureCustomer, sendError };
