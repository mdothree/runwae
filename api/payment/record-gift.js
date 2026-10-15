/**
 * POST /api/payment/record-gift
 * Auth: Firebase ID token (Bearer). Caller must be the influencer on the gig.
 * Body: { gigPath }
 *
 * Records a completed gift ("product for post") agreement. Replaces the old
 * browser write to transactions/*. Idempotent: if the gig already has a
 * transaction, returns it.
 *
 * Preconditions (RW-SEC-07):
 *   - item compensation is "gift"
 *   - the brand shipped: {gigPath}/tracking_number is a non-empty string
 *   - the brand verified (or skipped verifying) the post: the server-only
 *     gig_verifications/{itemId}/{gigKey} record by the item owner exists
 *     (written by api/payment/verify-post), and the gig status is 6 or 7
 *
 * Writes (admin SDK):
 *   transactions/{key}                               full record, status "complete"
 *   users_private/{marketerUid}/transactions/{key}   { path, time }
 *   users_private/{influencerUid}/transactions/{key} { path, time }
 *   {gigPath}/transaction_key                        key
 *   {gigPath}/status                                 7  (server-only transition)
 */
const { HttpError, requireUser, loadGig, takeLock, sendError, loadVerification } = require('./_shared');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const uid = await requireUser(req);
    const { gigPath } = req.body || {};
    const { db, itemId, gigKey, item, gig } = await loadGig(gigPath);

    if (gig.uid !== uid) throw new HttpError(403, 'forbidden', 'Only the influencer on this gig can accept it');
    if (item.compensation !== 'gift') throw new HttpError(400, 'not_gift', 'This gig is not a gift agreement');
    if (!item.uid) throw new HttpError(400, 'no_marketer', 'Item has no owner');

    if (gig.transaction_key) {
      const existing = await db.ref(`transactions/${gig.transaction_key}`).once('value');
      if (existing.exists()) {
        return res.status(200).json({ success: true, transactionKey: gig.transaction_key, existing: true });
      }
    }

    const tracking = typeof gig.tracking_number === 'string' ? gig.tracking_number.trim() : '';
    if (!tracking) throw new HttpError(409, 'not_shipped', 'The brand has not shipped the item yet');
    const st = Number(gig.status);
    if (st !== 6 && st !== 7) throw new HttpError(409, 'not_ready', 'The post has not been verified yet');
    if (!(await loadVerification(db, itemId, gigKey, item))) {
      throw new HttpError(409, 'not_verified', 'The brand has not verified the post yet');
    }

    const lock = await takeLock(db, itemId, gigKey, 'gift', uid);
    try {
      const now = Date.now();
      const key = db.ref('transactions').push().key;
      await db.ref().update({
        [`transactions/${key}`]: {
          path: gigPath,
          status: 'complete',
          marketer_transactionID: '',
          influencer_transactionID: '',
          price: String(item.price == null ? '' : item.price),
          tracking_number: tracking.slice(0, 100),
          marketerID: item.uid,
          influencerID: uid,
          marketer_time: now,
          influencer_time: now,
          platform: gig.platform || item.platform || '',
          compensation: 'gift',
        },
        [`users_private/${item.uid}/transactions/${key}`]: { path: gigPath, time: now },
        [`users_private/${uid}/transactions/${key}`]: { path: gigPath, time: now },
        [`${gigPath}/transaction_key`]: key,
        [`${gigPath}/status`]: 7,
      });
      await lock.done({ transactionKey: key });
      return res.status(200).json({ success: true, transactionKey: key });
    } catch (e) {
      try { await lock.release(); } catch (e2) { /* ignore */ }
      throw e;
    }
  } catch (error) {
    return sendError(res, error);
  }
};
