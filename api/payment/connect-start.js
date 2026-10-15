/**
 * POST /api/payment/connect-start           (RW-SEC-02/23)
 * Auth: Firebase ID token (Bearer).
 * Body: { replace?: boolean }
 *
 * Returns { success, connected, url? }:
 *   connected  - the caller already has a payout account (stripe_accounts/{uid})
 *   url        - the Stripe Connect authorize URL carrying a fresh server-issued
 *                `state` (bound to the caller, single use, 15 min). Returned when
 *                no account is connected yet, or when replace === true (the page
 *                asked the user to confirm the replacement first).
 * The authorize link is no longer hard-coded in gig.html, so every OAuth round
 * trip starts here and connect-oauth can verify the state.
 */
const { admin, HttpError, requireUser, sendError } = require('./_shared');
const { issueState } = require('./_oauth-state');

// Public Connect client id (it was in gig.html). Override per environment.
const CLIENT_ID = process.env.STRIPE_CONNECT_CLIENT_ID || 'ca_ErI4AkdbhU0utLvqC2EBqGowHmBFgQqQ';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const uid = await requireUser(req);
    const replace = !!(req.body && req.body.replace === true);
    const db = admin.database();
    const acct = (await db.ref(`stripe_accounts/${uid}/stripe_user_id`).once('value')).val();
    const connected = !!acct;
    if (connected && !replace) return res.status(200).json({ success: true, connected: true });
    if (!/^ca_[A-Za-z0-9]+$/.test(CLIENT_ID)) throw new HttpError(500, 'config', 'Stripe Connect is not configured');
    const state = await issueState(db, uid, { replace: connected && replace });
    const url = 'https://connect.stripe.com/oauth/authorize?response_type=code'
      + '&client_id=' + encodeURIComponent(CLIENT_ID)
      + '&scope=read_write'
      + '&state=' + encodeURIComponent(state);
    return res.status(200).json({ success: true, connected, url });
  } catch (error) {
    return sendError(res, error);
  }
};
