/**
 * POST /api/payment/verify-post            (RW-SEC-01)
 * Auth: Firebase ID token (Bearer). Caller must be the BRAND (item owner).
 * Body: { gigPath, mode }   mode: "verify" (status 5, the creator marked the post
 *                           done) or "skip" (status 4, the brand skips verification)
 *
 * The brand's verification is what releases the creator's payout, so it is
 * recorded server-side, where neither party can forge it:
 *   gig_verifications/{itemId}/{gigKey} = { by, time, mode, from_status }
 *   {gigPath}/status = 6
 * api/payment/pay-influencer and api/payment/record-gift require this record.
 *
 * Preconditions:
 *   - caller === items/{itemId}/uid
 *   - money: the gig is paid (transaction_key -> transactions/{key} written by
 *     charge-marketer for this gig, marketer == caller, marketer charge id set)
 *     gift:  the brand shipped (tracking_number set)
 *   - status 5 ("verify") or 4 ("skip"). Status 6 with no record yet is accepted
 *     too (gigs marked verified by the old client before this fix; only the
 *     brand can confirm them).
 * Idempotent: a second call returns { success: true, already: true }.
 */
const { HttpError, requireUser, loadGig, sendError } = require('./_shared');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const uid = await requireUser(req);
    const { gigPath, mode } = req.body || {};
    if (mode !== 'verify' && mode !== 'skip') throw new HttpError(400, 'bad_mode', 'mode must be "verify" or "skip"');
    const { db, itemId, gigKey, item, gig } = await loadGig(gigPath);

    if (!item.uid || item.uid !== uid) throw new HttpError(403, 'forbidden', 'Only the brand on this gig can verify the post');
    if (!gig.uid || gig.uid === uid) throw new HttpError(400, 'no_influencer', 'Gig has no influencer');

    const verRef = db.ref(`gig_verifications/${itemId}/${gigKey}`);
    const existing = (await verRef.once('value')).val();
    if (existing) return res.status(200).json({ success: true, already: true });

    const st = Number(gig.status);
    const allowed = st === 6 || (mode === 'verify' ? (st === 5 || st === 4) : st === 4);
    if (!allowed) throw new HttpError(409, 'bad_status', 'This gig is not waiting for post verification');

    if (item.compensation === 'money') {
      const key = gig.transaction_key;
      const tx = key ? (await db.ref(`transactions/${key}`).once('value')).val() : null;
      if (!tx || tx.path !== gigPath || tx.marketerID !== uid || tx.influencerID !== gig.uid || !tx.marketer_transactionID) {
        throw new HttpError(409, 'not_paid', 'This gig has not been paid yet');
      }
    } else if (item.compensation === 'gift') {
      if (typeof gig.tracking_number !== 'string' || !gig.tracking_number.trim()) {
        throw new HttpError(409, 'not_shipped', 'Add the tracking number before verifying');
      }
    } else {
      throw new HttpError(400, 'bad_compensation', 'Unknown compensation type');
    }

    const now = Date.now();
    const w = await verRef.transaction((cur) => {
      if (cur) return; // abort: already recorded
      return { by: uid, time: now, mode, from_status: st };
    });
    if (!w.committed) return res.status(200).json({ success: true, already: true });
    await db.ref(`${gigPath}/status`).set(6);
    return res.status(200).json({ success: true });
  } catch (error) {
    return sendError(res, error);
  }
};
