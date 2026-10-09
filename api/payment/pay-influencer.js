/**
 * POST /api/payment/pay-influencer
 * Auth: Firebase ID token (Bearer). Caller must be the influencer on the gig.
 * Body: { gigPath }   (any client stripeAccountId/amount is ignored)
 *
 * Preconditions (server-checked):
 *   - item compensation is "money", gig status is 6 ("post verified")
 *   - {gigPath}/transaction_key points at transactions/{key} written by
 *     charge-marketer, with influencerID == caller and status "incomplete"
 *   - stripe_accounts/{uid}/stripe_user_id exists (set by connect-oauth)
 * Amount = transactions/{key}/price (what the marketer was charged).
 *
 * On success the server writes (admin SDK):
 *   transactions/{key}: status "complete", influencer_transactionID, influencer_time
 *   users/{influencerUid}/transactions/{key}: { path, time }
 */
const stripe = require('../lib/stripe');
const { HttpError, requireUser, loadGig, sendError } = require('./_shared');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let statusRef;
  let transfer;
  try {
    const uid = await requireUser(req);
    const { gigPath } = req.body || {};
    const { db, item, gig } = await loadGig(gigPath);

    if (gig.uid !== uid) throw new HttpError(403, 'forbidden', 'Only the influencer on this gig can accept payment');
    if (item.compensation !== 'money') throw new HttpError(400, 'not_money', 'This gig is not paid in money');
    if (Number(gig.status) !== 6) throw new HttpError(409, 'not_ready', 'The post has not been verified yet');

    const key = gig.transaction_key;
    if (!key) throw new HttpError(409, 'not_paid', 'The marketer has not paid yet');
    const tx = (await db.ref(`transactions/${key}`).once('value')).val();
    if (!tx || tx.influencerID !== uid || tx.path !== gigPath || !tx.marketer_transactionID) {
      throw new HttpError(409, 'not_paid', 'No payment found for this gig');
    }
    if (tx.status !== 'incomplete') throw new HttpError(409, 'already_paid', 'This payment was already accepted');

    const acct = (await db.ref(`stripe_accounts/${uid}/stripe_user_id`).once('value')).val();
    if (!acct) throw new HttpError(400, 'no_stripe_account', 'Connect a Stripe account first');

    const cents = Math.round(Number(tx.price)) * 100;
    if (!Number.isFinite(cents) || cents <= 0) throw new HttpError(400, 'bad_price', 'Invalid payment amount');

    // Claim the transaction so concurrent requests cannot transfer twice.
    const claimRef = db.ref(`transactions/${key}/status`);
    // (cur === null on the first local guess: return null so the server value is fetched.)
    const claim = await claimRef.transaction((cur) => {
      if (cur === null) return null;
      return cur === 'incomplete' ? 'transferring' : undefined;
    });
    if (!claim.committed || claim.snapshot.val() !== 'transferring') throw new HttpError(409, 'in_progress', 'This payment is already being processed');
    statusRef = claimRef; // only set once we own the claim

    transfer = await stripe.transfers.create({
      amount: cents,
      currency: 'usd',
      destination: acct,
      metadata: { gigPath, transactionKey: key },
    }, { idempotencyKey: `transfer_${key}` });

    const now = Date.now();
    await db.ref().update({
      [`transactions/${key}/status`]: 'complete',
      [`transactions/${key}/influencer_transactionID`]: transfer.id,
      [`transactions/${key}/influencer_time`]: now,
      [`users/${uid}/transactions/${key}`]: { path: gigPath, time: now },
    });

    return res.status(200).json({ success: true, transferId: transfer.id });
  } catch (error) {
    if (statusRef && !transfer) {
      // Transfer did not happen: release the claim so it can be retried.
      try { await statusRef.set('incomplete'); } catch (e) { /* ignore */ }
    } else if (transfer) {
      console.error('pay-influencer: transferred but not recorded', transfer.id, error);
    }
    if (!(error instanceof HttpError)) console.error('Transfer error:', error);
    return sendError(res, error instanceof HttpError ? error
      : new HttpError(400, 'transfer_failed', error.message));
  }
};
