/**
 * GET /api/billing/plans  (public, no auth)
 * The browser's single source for plan names, prices and the gig processing
 * setting, so the paywall and checkout copy always match billing-config.js.
 * 200 { enabled, plans:[{tier,role,name,amount_usd,interval,unlocks}], processing:{...}, platform_fee_percent: 0 }
 */
'use strict';

const billing = require('../lib/billing');

module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  return res.status(200).json(billing.publicBillingInfo(process.env));
};
