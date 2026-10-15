/**
 * POST /api/payment/connect-oauth           (RW-SEC-02/23)
 * Auth: Firebase ID token (Bearer).
 * Body: { code, state, confirmReplace? }
 *
 * Stores the connected account id server-side at
 *   stripe_accounts/{uid} = { stripe_user_id, connected_at }
 * (admin SDK only; not client readable/writable). Stripe access/refresh tokens
 * are NOT returned to the browser and are not stored.
 *
 * Checks, all BEFORE the code is redeemed:
 *   - `state` must be the caller's own, unexpired, single-use state issued by
 *     api/payment/connect-start (403 bad_state otherwise). A code from somebody
 *     else's OAuth flow can no longer be attached to the caller's account.
 *   - an EXISTING payout account is never silently overwritten (409
 *     account_exists). Replacing one needs all of: a state issued with
 *     replace=true (the page asked the user to confirm), confirmReplace === true
 *     in this request, and a fresh sign-in (ID token auth_time within
 *     REAUTH_WINDOW_S, else 401 reauth_required).
 *   - a replacement is logged at stripe_account_changes/{uid}/{push}.
 *     TODO(email): notify the owner by email when the payout account changes.
 *     This base has no api/_lib/email.js; when the email module (branch
 *     ui/rw-style) lands, send "payout account changed" here from the address
 *     in Firebase Auth (never from RTDB).
 * Stripe/internal error text is not returned to the browser (RW-SEC-10).
 */
const stripe = require('../_lib/stripe');
const { admin, HttpError, requireToken, sendError } = require('./_shared');
const { consumeState } = require('./_oauth-state');

const REAUTH_WINDOW_S = 10 * 60;
const ACCOUNT_EXISTS_MSG = 'A payout account is already connected. Use "Replace payout account" to change it, or contact hello@runwae.com.';

module.exports = async (req, res) => {
  res.setHeader('X-Runwae-Connect-Guard', '1');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = await requireToken(req);
    const uid = token.uid;
    const { code, state, confirmReplace } = req.body || {};
    if (!code || typeof code !== 'string' || code.length > 200) {
      throw new HttpError(400, 'missing_code', 'OAuth authorization code is required');
    }
    const db = admin.database();
    const st = await consumeState(db, uid, state);
    if (!st) throw new HttpError(403, 'bad_state', 'This Stripe connection link is invalid or expired. Start again from your gig page.');

    const acctRef = db.ref(`stripe_accounts/${uid}`);
    const current = (await acctRef.once('value')).val();
    const existing = current && current.stripe_user_id ? current.stripe_user_id : null;
    let replacing = false;
    if (existing) {
      if (!(st.replace === true && confirmReplace === true)) {
        throw new HttpError(409, 'account_exists', ACCOUNT_EXISTS_MSG);
      }
      const age = Math.floor(Date.now() / 1000) - Number(token.auth_time || 0);
      if (!(age >= 0 && age <= REAUTH_WINDOW_S)) {
        throw new HttpError(401, 'reauth_required', 'For your security, sign out and sign in again, then replace the payout account.');
      }
      replacing = true;
    }

    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code,
    });
    if (!response || typeof response.stripe_user_id !== 'string' || !response.stripe_user_id) {
      throw new Error('oauth: no stripe_user_id');
    }

    // Create-only unless this is the confirmed replacement of `existing`.
    const now = Date.now();
    const written = await acctRef.transaction((cur) => {
      const curId = cur && cur.stripe_user_id ? cur.stripe_user_id : null;
      if (curId && !(replacing && curId === existing)) return; // abort
      return { stripe_user_id: response.stripe_user_id, connected_at: now };
    });
    if (!written.committed) throw new HttpError(409, 'account_exists', ACCOUNT_EXISTS_MSG);

    if (replacing && existing !== response.stripe_user_id) {
      await db.ref(`stripe_account_changes/${uid}`).push({ from: existing, to: response.stripe_user_id, time: now });
      // TODO(email): notify the owner (see header).
    }
    return res.status(200).json({ success: true, replaced: replacing });
  } catch (error) {
    if (error instanceof HttpError) return sendError(res, error);
    console.error('OAuth error:', error);
    return res.status(400).json({
      error: 'oauth_failed',
      error_description: 'Could not connect the Stripe account. Please try again.',
    });
  }
};
