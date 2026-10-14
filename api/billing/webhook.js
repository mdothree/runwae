/**
 * POST /api/billing/webhook  (called by Stripe, not by browsers)
 * Signature-verified with STRIPE_BILLING_WEBHOOK_SECRET (whsec_...). This is the ONLY
 * code path that writes users/{uid}/plan (admin SDK; clients are blocked by
 * database.rules.json).
 *
 * Events handled (subscribe exactly these in the Stripe dashboard):
 *   checkout.session.completed      -> fetch the subscription, write plan, welcome email
 *   customer.subscription.created   -> write plan
 *   customer.subscription.updated   -> write plan (renewals, cancel_at_period_end, past_due ...)
 *   customer.subscription.deleted   -> write plan with status "canceled", cancelled email
 *   invoice.payment_failed          -> refresh plan from the subscription, payment-failed email
 *   invoice.paid                    -> receipt email (plan state comes from subscription.updated)
 * Anything else: 200 { ignored: true }.
 *
 * Idempotent: billing/events/{event.id} is claimed before work; replays return 200.
 * Out-of-order: a subscription event older than the last one applied for that user is skipped.
 */
'use strict';

const stripe = require('../lib/stripe');
const admin = require('../lib/firebase');
const billing = require('../lib/billing');

const MAX_BODY = 512 * 1024;
const UID_RE = /^[A-Za-z0-9_-]{1,128}$/;

async function readRawBody(req) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += b.length;
    if (size > MAX_BODY) throw Object.assign(new Error('body too large'), { status: 413 });
    chunks.push(b);
  }
  return Buffer.concat(chunks);
}

async function uidForCustomer(db, customerId) {
  if (typeof customerId !== 'string') return null;
  const uid = (await db.ref(`billing/customer_uid/${customerId}`).once('value')).val();
  return typeof uid === 'string' && UID_RE.test(uid) ? uid : null;
}

/** Resolve the Runwae uid for a subscription: our customer index first, metadata second. */
async function uidForSubscription(db, sub) {
  const fromIndex = await uidForCustomer(db, sub.customer);
  if (fromIndex) return fromIndex;
  const m = sub.metadata && sub.metadata.uid;
  return typeof m === 'string' && UID_RE.test(m) ? m : null;
}

async function writePlan(db, uid, sub, eventCreated) {
  const subRef = db.ref(`billing/subscriptions/${uid}`);
  const prev = (await subRef.once('value')).val();
  if (prev && prev.id === sub.id && Number(prev.event_created) > Number(eventCreated)) {
    return { skipped: 'stale_event' };
  }
  const plan = billing.planFromSubscription(sub);
  await db.ref().update({
    [`users/${uid}/plan`]: plan,
    [`billing/subscriptions/${uid}`]: { id: sub.id, event_created: Number(eventCreated) || 0 },
  });
  return { plan };
}

/**
 * Recipient + the data contract of api/lib/_email-templates.js (subscription_*).
 * The address comes from Firebase Auth (admin.auth().getUser), NOT users/{uid}/email,
 * which the user can edit. Stripe's customer email is the fallback.
 */
async function emailContext(db, uid, tier, fallbackEmail) {
  const u = (await db.ref(`users/${uid}/name`).once('value')).val();
  let to = '';
  try { to = (await admin.auth().getUser(uid)).email || ''; } catch (e) { to = ''; }
  const plan = billing.PLANS[tier];
  return {
    to: to || fallbackEmail || '',
    data: {
      recipientName: typeof u === 'string' ? u : '',
      planName: plan ? plan.email_name : 'Runwae',
      amountCents: plan ? plan.amount_usd * 100 : undefined,
      currency: 'usd',
      interval: plan ? plan.interval : 'month',
      portalUrl: `${billing.siteUrl(process.env)}/account#billing`,
    },
  };
}

// The Stripe event id is the idempotency key, so a webhook retry never sends the same email twice.
async function notify(db, eventId, template, uid, tier, fallbackEmail, extra) {
  const ctx = await emailContext(db, uid, tier, fallbackEmail);
  return billing.sendBillingEmail(template, ctx.to, Object.assign(ctx.data, extra || {}), `${template}_${eventId}`);
}

async function handle(event, db) {
  const obj = event.data && event.data.object;
  switch (event.type) {
    case 'checkout.session.completed': {
      if (!obj || obj.mode !== 'subscription' || !obj.subscription) return { ignored: 'not_subscription' };
      const sub = await stripe.subscriptions.retrieve(obj.subscription);
      let uid = await uidForCustomer(db, obj.customer);
      if (!uid && typeof obj.client_reference_id === 'string' && UID_RE.test(obj.client_reference_id)) {
        uid = obj.client_reference_id;
        await db.ref(`billing/customer_uid/${obj.customer}`).set(uid);
      }
      if (!uid) return { ignored: 'unknown_customer' };
      const r = await writePlan(db, uid, sub, event.created);
      if (r.plan) {
        await notify(db, event.id, 'subscription_welcome', uid, r.plan.tier, obj.customer_details && obj.customer_details.email,
          { nextBillingAt: r.plan.current_period_end });
      }
      return r;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const uid = await uidForSubscription(db, obj);
      if (!uid) return { ignored: 'unknown_customer' };
      const sub = event.type === 'customer.subscription.deleted' ? Object.assign({}, obj, { status: 'canceled' }) : obj;
      const before = (await db.ref(`users/${uid}/plan`).once('value')).val() || {};
      const r = await writePlan(db, uid, sub, event.created);
      if (r.plan && event.type === 'customer.subscription.deleted') {
        await notify(db, event.id, 'subscription_cancelled', uid, r.plan.tier, '', { endsAt: null });
      } else if (r.plan && r.plan.cancel_at_period_end && !before.cancel_at_period_end) {
        // Cancelled in the portal: access continues to the end of the paid period.
        await notify(db, event.id, 'subscription_cancelled', uid, r.plan.tier, '', { endsAt: r.plan.current_period_end });
      }
      return r;
    }
    case 'invoice.payment_failed':
    case 'invoice.paid': {
      const uid = await uidForCustomer(db, obj && obj.customer);
      if (!uid) return { ignored: 'unknown_customer' };
      let r = {};
      const subId = obj.subscription || (obj.parent && obj.parent.subscription_details && obj.parent.subscription_details.subscription);
      if (event.type === 'invoice.payment_failed' && subId) {
        r = await writePlan(db, uid, await stripe.subscriptions.retrieve(subId), event.created);
      }
      const line0 = obj.lines && obj.lines.data && obj.lines.data[0];
      const tier = (r.plan && r.plan.tier)
        || ((line0 && line0.price && billing.planByLookupKey(line0.price.lookup_key)) || {}).tier
        || ((await db.ref(`users/${uid}/plan/tier`).once('value')).val());
      if (event.type === 'invoice.paid') {
        if (!obj.amount_paid) return { ignored: 'zero_invoice' }; // e.g. a 100%-off promo period: no receipt
        await notify(db, event.id, 'subscription_receipt', uid, tier, obj.customer_email, {
          amountCents: obj.amount_paid, currency: obj.currency || 'usd',
          periodStart: line0 && line0.period && line0.period.start, periodEnd: line0 && line0.period && line0.period.end,
          invoiceNumber: obj.number || '', invoiceUrl: obj.hosted_invoice_url || '',
        });
      } else {
        await notify(db, event.id, 'subscription_payment_failed', uid, tier, obj.customer_email, {
          amountCents: obj.amount_due, currency: obj.currency || 'usd', retryAt: obj.next_payment_attempt || null,
        });
      }
      return r;
    }
    default:
      return { ignored: true };
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    billing.assertKeyAllowed(process.env);
  } catch (e) {
    return res.status(e.status || 503).json({ error: e.code || 'unavailable' });
  }
  const secret = String(process.env.STRIPE_BILLING_WEBHOOK_SECRET || '').trim();
  if (!secret) return res.status(503).json({ error: 'webhook_not_configured' });

  let event;
  try {
    const raw = await readRawBody(req);
    const sig = req.headers['stripe-signature'];
    if (!sig || !raw.length) throw new Error('missing signature or body');
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return res.status(err.status === 413 ? 413 : 400).json({ error: 'invalid_signature' });
  }

  const db = admin.database();
  const claimRef = db.ref(`billing/events/${event.id}`);
  const claim = await claimRef.transaction((cur) => (cur ? undefined : { type: event.type, time: Date.now(), state: 'processing' }));
  if (!claim.committed) return res.status(200).json({ received: true, duplicate: true });

  try {
    const result = await handle(event, db);
    await claimRef.update({ state: 'done' });
    return res.status(200).json({ received: true, result: result && (result.ignored ? 'ignored' : result.skipped || 'applied') });
  } catch (err) {
    // Release the claim so Stripe's retry can apply the event.
    try { await claimRef.remove(); } catch (e) { /* ignore */ }
    console.error('billing webhook failed', event.type, err && err.message);
    return res.status(500).json({ error: 'webhook_failed' });
  }
};
