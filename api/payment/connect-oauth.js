/**
 * POST /api/payment/connect-oauth
 * Auth: Firebase ID token (Bearer).
 * Body: { code }  (Stripe Connect OAuth authorization code)
 *
 * Stores the connected account id server-side at
 *   stripe_accounts/{uid} = { stripe_user_id, connected_at }
 * (admin SDK only; not client readable/writable). Stripe access/refresh tokens
 * are NOT returned to the browser and are not stored.
 *
 * RW-SEC-02 (interim guard): an EXISTING payout account is never overwritten
 * here (409 account_exists). A first account can still be connected.
 * Stripe/internal error text is not returned to the browser (RW-SEC-10).
 */
const stripe = require('../lib/stripe');
const { admin, HttpError, requireUser, sendError } = require('./_shared');

const ACCOUNT_EXISTS_MSG = 'A payout account is already connected. To change it, contact hello@runwae.com.';

module.exports = async (req, res) => {
  res.setHeader('X-Runwae-Connect-Guard', '1');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const uid = await requireUser(req);
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      throw new HttpError(400, 'missing_code', 'OAuth authorization code is required');
    }

    const acctRef = admin.database().ref(`stripe_accounts/${uid}`);
    const current = (await acctRef.once('value')).val();
    if (current && current.stripe_user_id) {
      throw new HttpError(409, 'account_exists', ACCOUNT_EXISTS_MSG);
    }

    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code,
    });
    if (!response || typeof response.stripe_user_id !== 'string' || !response.stripe_user_id) {
      throw new Error('oauth: no stripe_user_id');
    }

    // Create-only: abort if an account appeared meanwhile (no overwrite race).
    const written = await acctRef.transaction((cur) => {
      if (cur && cur.stripe_user_id) return; // abort
      return { stripe_user_id: response.stripe_user_id, connected_at: Date.now() };
    });
    if (!written.committed) throw new HttpError(409, 'account_exists', ACCOUNT_EXISTS_MSG);

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof HttpError) return sendError(res, error);
    console.error('OAuth error:', error);
    return res.status(400).json({
      error: 'oauth_failed',
      error_description: 'Could not connect the Stripe account. Please try again.',
    });
  }
};
