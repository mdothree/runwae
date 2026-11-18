/**
 * GET /health and /api/health: liveness + build identity for UptimeRobot and QA.
 * Exposes only the deployed commit, the Vercel environment and the Stripe key MODE
 * (test/live/unset). No secrets, no key material, no user data.
 */
module.exports = (req, res) => {
  const k = process.env.STRIPE_SECRET_KEY || '';
  const mode = !k ? 'unset' : /^(sk|rk)_test_/.test(k) ? 'test' : /^(sk|rk)_live_/.test(k) ? 'live' : 'unknown';
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    service: 'runwae',
    build_id: (process.env.VERCEL_GIT_COMMIT_SHA || 'unknown').slice(0, 12),
    env: process.env.VERCEL_ENV || 'unknown',
    stripe_mode: mode,
    billing_enabled: process.env.RUNWAE_BILLING_ENABLED === '1'
  });
};
