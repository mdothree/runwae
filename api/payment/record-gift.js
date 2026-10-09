/**
 * POST /api/payment/record-gift
 * Auth: Firebase ID token (Bearer). Caller must be the influencer on the gig.
 * Body: { gigPath }
 *
 * Records a completed gift ("product for post") agreement. Replaces the old
 * browser write to transactions/*. Idempotent: if the gig already has a
 * transaction, returns it.
 *
 * Writes (admin SDK):
 *   transactions/{key}                       full record, status "complete"
 *   users/{marketerUid}/transactions/{key}   { path, time }
 *   users/{influencerUid}/transactions/{key} { path, time }
 *   {gigPath}/transaction_key                key
 */
const { HttpError, requireUser, loadGig, takeLock, sendError } = require('./_shared');

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
          tracking_number: String(gig.tracking_number || '').slice(0, 100),
          marketerID: item.uid,
          influencerID: uid,
          marketer_time: now,
          influencer_time: now,
          platform: gig.platform || item.platform || '',
          compensation: 'gift',
        },
        [`users/${item.uid}/transactions/${key}`]: { path: gigPath, time: now },
        [`users/${uid}/transactions/${key}`]: { path: gigPath, time: now },
        [`${gigPath}/transaction_key`]: key,
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
