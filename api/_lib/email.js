/**
 * Runwae email helper: render a template and send it through Resend.
 *
 * Used by api/notify.js (in-app events) and by the billing functions
 * (subscription welcome / receipt / payment failed / cancelled).
 *
 *   const email = require('../_lib/email');            // from api/<dir>/x.js
 *   await email.sendEmail({
 *     to: 'user@example.com',                          // ONE address, resolved server-side
 *     template: 'subscription_receipt',                // see email.TEMPLATES
 *     data: { recipientName, planName, amountCents, currency, invoiceNumber, invoiceUrl, ... },
 *     idempotencyKey: `sub_receipt_${invoice.id}`,     // Resend dedupes retries for 24h
 *   });
 *   // -> { ok: true, id } | { ok: true, dryRun: true } | { ok: false, status, error }
 *
 * Dry run (logs one JSON line, sends nothing, returns ok) when any of:
 *   - RESEND_API_KEY is unset
 *   - EMAIL_DRY_RUN=1
 *   - VERCEL_ENV is set and is not "production", unless EMAIL_ALLOW_NON_PROD=1
 * Env: RESEND_API_KEY, EMAIL_FROM (default "Runwae <notifications@runwae.com>"),
 *      EMAIL_REPLY_TO (default hello@runwae.com).
 *
 * This file sits in api/, so Vercel also exposes it as a route; the default
 * export answers 404 so it can never be used to send mail from outside.
 */
const L = require('./_email-layout');
const TEMPLATES = require('./_email-templates');

const RESEND_URL = 'https://api.resend.com/emails';
const EMAIL_RE = /^[^\s@<>()",;:\\[\]]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

function from() { return process.env.EMAIL_FROM || 'Runwae <notifications@runwae.com>'; }
function replyTo() { return process.env.EMAIL_REPLY_TO || L.SUPPORT; }

function isDryRun() {
  if (!process.env.RESEND_API_KEY) return 'no_api_key';
  if (process.env.EMAIL_DRY_RUN === '1') return 'EMAIL_DRY_RUN';
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production' && process.env.EMAIL_ALLOW_NON_PROD !== '1') return 'non_production';
  return false;
}

function maskEmail(e) {
  const [u, d] = String(e).split('@');
  return `${(u || '').slice(0, 1)}***@${d || ''}`;
}

/** Render a template to { subject, html, text, category }. Throws on unknown template. */
function render(template, data) {
  const t = TEMPLATES[template];
  if (!t) throw new Error(`email: unknown template "${template}"`);
  const out = t.render(data || {});
  return Object.assign({ category: t.category }, out);
}

/**
 * Send one email. Never throws for provider/network failures (returns ok:false);
 * throws only for programming errors (bad address, unknown template).
 */
async function sendEmail(opts) {
  const o = opts || {};
  const to = String(o.to || '').trim();
  if (!EMAIL_RE.test(to) || to.length > 254) throw new Error('email: invalid recipient');
  const msg = render(o.template, o.data);

  const dry = isDryRun();
  if (dry) {
    console.log(JSON.stringify({ email: 'dry_run', reason: dry, template: o.template, to: maskEmail(to), subject: msg.subject }));
    return { ok: true, dryRun: true, subject: msg.subject };
  }

  const headers = {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  };
  if (o.idempotencyKey) headers['Idempotency-Key'] = String(o.idempotencyKey).slice(0, 256);

  const body = {
    from: from(),
    to: [to],
    reply_to: replyTo(),
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    tags: [{ name: 'template', value: String(o.template).replace(/[^A-Za-z0-9_-]/g, '_') }],
  };
  if (msg.category !== 'transactional') {
    body.headers = { 'List-Unsubscribe': `<${L.MANAGE_URL}>` };
  }

  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 8000) : null;
  try {
    const res = await fetch(RESEND_URL, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined });
    let json = null;
    try { json = await res.json(); } catch (e) { /* empty body */ }
    if (!res.ok) {
      console.error(JSON.stringify({ email: 'send_failed', template: o.template, status: res.status, error: json && (json.name || json.message) }));
      return { ok: false, status: res.status, error: (json && (json.name || json.message)) || 'send_failed' };
    }
    return { ok: true, id: json && json.id };
  } catch (e) {
    console.error(JSON.stringify({ email: 'send_error', template: o.template, error: e.name || 'error' }));
    return { ok: false, status: 0, error: e.name === 'AbortError' ? 'timeout' : 'network_error' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function notFound(req, res) { res.status(404).json({ error: 'not_found' }); }

module.exports = notFound;
module.exports.render = render;
// Aliases used by api/_lib/billing.js sendBillingEmail():
module.exports.send = sendEmail;                                         // send({ to, template, data, idempotencyKey })
module.exports.sendTemplate = (template, to, data, idempotencyKey) => sendEmail({ to, template, data, idempotencyKey });
module.exports.sendEmail = sendEmail;
module.exports.isDryRun = isDryRun;
module.exports.maskEmail = maskEmail;
module.exports.TEMPLATES = Object.keys(TEMPLATES);
module.exports.EMAIL_RE = EMAIL_RE;
