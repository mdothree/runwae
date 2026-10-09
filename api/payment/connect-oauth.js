/**
 * POST /api/payment/connect-oauth
 * Auth: Firebase ID token (Bearer).
 * Body: { code }  (Stripe Connect OAuth authorization code)
 *
 * Stores the connected account id server-side at
 *   stripe_accounts/{uid} = { stripe_user_id, connected_at }
 * (admin SDK only; not client readable/writable). Stripe access/refresh tokens
 * are NOT returned to the browser and are not stored.
 */
const stripe = require('../lib/stripe');
const { admin, HttpError, requireUser, sendError } = require('./_shared');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const uid = await requireUser(req);
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      throw new HttpError(400, 'missing_code', 'OAuth authorization code is required');
    }

    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code,
    });

    await admin.database().ref(`stripe_accounts/${uid}`).set({
      stripe_user_id: response.stripe_user_id,
      connected_at: Date.now(),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof HttpError) return sendError(res, error);
    console.error('OAuth error:', error);
    return res.status(400).json({
      error: 'oauth_failed',
      error_description: error.message,
    });
  }
};
