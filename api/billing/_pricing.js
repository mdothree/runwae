/**
 * GET /pricing  (vercel.json rewrites /pricing here)
 * 307 to /plans when billing is on (RUNWAE_BILLING_ENABLED=1), else to /faqs#cost (the pre-billing
 * answer). A function because vercel.json redirects cannot depend on an env var, and /plans is
 * left out of the build while billing is off.
 */
'use strict';

const { billingEnabled } = require('../_lib/billing-config');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
  res.setHeader('Location', billingEnabled(process.env) ? '/plans' : '/faqs#cost');
  res.statusCode = 307;
  return res.end();
};
