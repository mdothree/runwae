/**
 * POST /api/payment/pay-influencer
 * Auth: Firebase ID token (Bearer). Caller must be the influencer on the gig.
 * Body: { gigPath }   (any client stripeAccountId/amount is ignored)
 *
 * Preconditions (server-checked):
 *   - RW-SEC-01: a SERVER-written verification record exists at
 *     gig_verifications/{itemId}/{gigKey} with by == the item owner (the brand),
 *     written by api/payment/verify-post. The gig "status" is not trusted on its
 *     own; without the record the payout is refused (403 payout_review).
 *   - item compensation is "money", gig status is 6 ("post verified", which
 *     only verify-post can set under the current rules)
 *   - {gigPath}/transaction_key points at transactions/{key} written by
 *     charge-marketer, with influencerID == caller and status "incomplete"
 *   - stripe_accounts/{uid}/stripe_user_id exists (set by connect-oauth)
 * Amount = transactions/{key}/price (what the marketer was charged).
 *
 * On success the server writes (admin SDK):
 *   transactions/{key}: status "complete", influencer_transactionID, influencer_time
 *   users_private/{influencerUid}/transactions/{key}: { path, time }
 *   {gigPath}/status: 7   (server-only transition)
 */
const stripe = require('../lib/stripe');
const { HttpError, requireUser, loadGig, sendError, loadVerification } = require('./_shared');

const PAYOUT_REVIEW_MSG = 'Payouts are being reviewed; contact hello@runwae.com';

module.exports = async (req, res) => {
  // Marker so a deploy can prove this guard is live without a signed-in session.
  res.setHeader('X-Runwae-Payout-Guard', '1');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let statusRef;
  let transfer;
  try {
    const uid = await requireUser(req);
    const { gigPath } = req.body || {};
    const { db, itemId, gigKey, item, gig } = await loadGig(gigPath);

    if (gig.uid !== uid) throw new HttpError(403, 'forbidden', 'Only the influencer on this gig can accept payment');
    if (item.compensation !== 'money') throw new HttpError(400, 'not_money', 'This gig is not paid in money');

    // RW-SEC-01: require the server-only verification record written for the brand.
    const verification = await loadVerification(db, itemId, gigKey, item);
    if (!verification) throw new HttpError(403, 'payout_review', PAYOUT_REVIEW_MSG);
    if (Number(gig.status) !== 6) throw new HttpError(409, 'not_ready', 'The post has not been verified yet');

    const key = gig.transaction_key;
    if (!key) throw new HttpError(409, 'not_paid', 'The marketer has not paid yet');
    const tx = (await db.ref(`transactions/${key}`).once('value')).val();
    if (!tx || tx.influencerID !== uid || tx.path !== gigPath || !tx.marketer_transactionID || tx.marketerID !== item.uid) {
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
      [`users_private/${uid}/transactions/${key}`]: { path: gigPath, time: now },
      [`${gigPath}/status`]: 7,
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
      : new HttpError(400, 'transfer_failed', 'The payout could not be completed. Please try again or contact hello@runwae.com.'));
  }
};
