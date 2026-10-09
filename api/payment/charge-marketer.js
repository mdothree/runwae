/**
 * POST /api/payment/charge-marketer
 * Auth: Firebase ID token (Bearer). Caller must be the marketer who owns the item.
 * Body: { stripeToken, gigPath }   (any client "amount" is ignored; price comes from items/{id}/price)
 *
 * On success the server writes (admin SDK):
 *   transactions/{key}                       full record, status "incomplete"
 *   users/{marketerUid}/transactions/{key}   { path, time }
 *   users/{influencerUid}/transactions/{key} { path, time }
 *   {gigPath}/transaction_key                key
 */
const stripe = require('../lib/stripe');
const { HttpError, requireUser, loadGig, itemPrice, takeLock, sendError } = require('./_shared');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let lock;
  let charge;
  try {
    const uid = await requireUser(req);
    const { stripeToken, gigPath, description } = req.body || {};
    if (!stripeToken || typeof stripeToken !== 'string') {
      throw new HttpError(400, 'missing_parameters', 'stripeToken and gigPath are required');
    }
    const { db, itemId, gigKey, item, gig } = await loadGig(gigPath);

    if (item.uid !== uid) throw new HttpError(403, 'forbidden', 'Only the marketer can pay for this gig');
    if (item.compensation !== 'money') throw new HttpError(400, 'not_money', 'This gig is not paid in money');
    if (!gig.uid) throw new HttpError(400, 'no_influencer', 'Gig has no influencer');
    if (gig.transaction_key) {
      const existing = await db.ref(`transactions/${gig.transaction_key}`).once('value');
      if (existing.exists()) throw new HttpError(409, 'already_paid', 'This gig has already been paid');
    }
    const price = itemPrice(item);

    lock = await takeLock(db, itemId, gigKey, 'charge', uid);

    charge = await stripe.charges.create({
      amount: price * 100,
      currency: 'usd',
      source: stripeToken,
      description: (typeof description === 'string' && description.slice(0, 200)) || 'Runwae partnership payment',
      metadata: { gigPath, marketerID: uid, influencerID: gig.uid },
    }, { idempotencyKey: `charge_${itemId}_${gigKey}_${stripeToken}` });

    const now = Date.now();
    const key = db.ref('transactions').push().key;
    await db.ref().update({
      [`transactions/${key}`]: {
        path: gigPath,
        status: 'incomplete',
        marketer_transactionID: charge.id,
        influencer_transactionID: '',
        price: String(price),
        tracking_number: '',
        marketerID: uid,
        influencerID: gig.uid,
        marketer_time: now,
        platform: gig.platform || item.platform || '',
        compensation: 'money',
      },
      [`users/${uid}/transactions/${key}`]: { path: gigPath, time: now },
      [`users/${gig.uid}/transactions/${key}`]: { path: gigPath, time: now },
      [`${gigPath}/transaction_key`]: key,
    });
    await lock.done({ transactionKey: key });

    return res.status(200).json({ success: true, chargeId: charge.id, transactionKey: key });
  } catch (error) {
    if (lock && charge) {
      // Card was charged but recording failed: keep the lock so it cannot be
      // charged twice, and leave the charge id for manual reconciliation.
      console.error('charge-marketer: charged but not recorded', charge.id, error);
      try { await lock.done({ state: 'charged_unrecorded', chargeId: charge.id }); } catch (e) { /* ignore */ }
    } else if (lock) {
      // Charge failed before anything was recorded: allow a retry.
      try { await lock.release(); } catch (e) { /* ignore */ }
    }
    return sendError(res, error);
  }
};
