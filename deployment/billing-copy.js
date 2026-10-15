/**
 * Billing copy switch for the static pages (subscription + 0% fee model, Principal 2026-10-14).
 * Used by deployment/build-dist.js on every root *.html copied into dist/.
 *
 *  <!--rw-billing:on-->...<!--/rw-billing:on-->        kept only when RUNWAE_BILLING_ENABLED=1
 *  <!--rw-billing:off-->...<!--/rw-billing:off-->      kept only when billing is off (the pre-subscription copy)
 *  <!--rw-processing:on|off-->...                      same, keyed on the gig processing pass-through flag
 *  <span data-rw-price="brand|creator">...</span>      text becomes "$<amount_usd>" from api/lib/billing-config.js
 *
 * So a deploy before the billing GO keeps today's (true) copy, and the copy flips with the same
 * env var that turns billing on. Prices live in one place.
 */
'use strict';

const cfg = require('../api/lib/billing-config');

function billingOn(env) { return cfg.billingEnabled(env || process.env); }

function pick(html, name, on) {
  const keep = on ? 'on' : 'off';
  const drop = on ? 'off' : 'on';
  html = html.replace(new RegExp(`<!--${name}:${drop}-->[\\s\\S]*?<!--/${name}:${drop}-->`, 'g'), '');
  return html.replace(new RegExp(`<!--/?${name}:${keep}-->`, 'g'), '');
}

function applyBillingCopy(html, env) {
  const e = env || process.env;
  html = pick(html, 'rw-billing', cfg.billingEnabled(e));
  html = pick(html, 'rw-processing', cfg.processingPassThrough(e));
  return html.replace(/(<span data-rw-price="(brand|creator)">)[^<]*(<\/span>)/g,
    (m, open, tier, close) => `${open}$${cfg.PLANS[tier].amount_usd}${close}`);
}

module.exports = { applyBillingCopy, billingOn };
