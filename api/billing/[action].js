/**
 * /api/billing/{checkout|plans|portal|pricing|webhook}: ONE serverless function.
 *
 * Vercel Hobby allows at most 12 functions per deployment, and every non-underscore
 * file under api/ is one. The handlers live in the underscore modules next to this
 * file (not functions themselves) and keep their own method/auth checks; this router
 * only picks one by the path segment. It never reads the body, so the webhook still
 * gets the raw stream for the Stripe signature check. /pricing is rewritten here
 * (vercel.json) as /api/billing/pricing.
 */
'use strict';

const HANDLERS = {
  checkout: () => require('./_checkout'),
  plans: () => require('./_plans'),
  portal: () => require('./_portal'),
  pricing: () => require('./_pricing'),
  webhook: () => require('./_webhook'),
};

function actionOf(req) {
  const q = req.query && req.query.action;
  if (typeof q === 'string' && q) return q;
  const m = /^\/api\/billing\/([a-z]+)(?:[/?#]|$)/.exec(String(req.url || ''));
  return m ? m[1] : '';
}

module.exports = (req, res) => {
  const action = actionOf(req);
  const load = Object.prototype.hasOwnProperty.call(HANDLERS, action) ? HANDLERS[action] : null;
  if (!load) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ error: 'not_found' }));
  }
  return load()(req, res);
};

module.exports.actionOf = actionOf;
