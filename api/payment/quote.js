/**
 * POST /api/payment/quote
 * Auth: Firebase ID token (Bearer). Caller must be the marketer who owns the item.
 * Body: { gigPath }
 *
 * The exact lines the marketer sees before paying a money gig; charge-marketer
 * charges the same total (both use lib/billing.processingQuote).
 * 200 {
 *   gig_price_cents,          // goes 100% to the creator
 *   platform_fee_cents: 0,    // Runwae keeps nothing from the gig
 *   processing_fee_cents,     // card processing passed through at cost (0 when the flag is off)
 *   total_cents,
 *   processing_label, pass_through
 * }
 */
const billing = require('../lib/billing');
const { HttpError, requireUser, loadGig, itemPrice, sendError } = require('./_shared');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const uid = await requireUser(req);
    const { gigPath } = req.body || {};
    const { item } = await loadGig(gigPath);
    if (item.uid !== uid) throw new HttpError(403, 'forbidden', 'Only the marketer can see this checkout');
    if (item.compensation !== 'money') throw new HttpError(400, 'not_money', 'This gig is not paid in money');
    const q = billing.processingQuote(itemPrice(item), billing.processingPassThrough(process.env));
    return res.status(200).json({
      gig_price_cents: q.price_cents,
      platform_fee_cents: 0,
      processing_fee_cents: q.processing_cents,
      total_cents: q.total_cents,
      processing_label: billing.PROCESSING.label,
      pass_through: q.pass_through,
    });
  } catch (err) {
    return sendError(res, err);
  }
};
