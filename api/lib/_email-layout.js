/**
 * Runwae email layout (rw style for mail clients). Not a route: Vercel ignores
 * files in api/ whose name starts with "_".
 *
 * Mirrors css/rw.css for email: white canvas, black ink, ONE periwinkle accent
 * (#9389ff), hairlines (#e6e6ee) instead of shadows, rounded display headings,
 * black pill primary button. Mail clients can't load museo-sans-rounded (Typekit),
 * so headings use a rounded system stack with safe fallbacks.
 *
 * Table-based, inline CSS, 600px max, plain-text twin for every message,
 * dark-mode rules for clients that honour prefers-color-scheme / [data-ogsc].
 *
 * Every dynamic string goes through esc() (HTML) or plain() (text). Links are
 * only ever built by the server from SITE + a fixed path (see url()).
 */

const SITE = 'https://runwae.com';
const SUPPORT = 'hello@runwae.com';

// Images must be live at these absolute URLs before the first real send.
// img/email/*.png ships with the site. One brand mark everywhere (2026-10-14): the black flower the site header
// uses, 60px (2x for the 30px slot), plus a white copy that dark-mode clients swap in. img/emaillogo.png (the old
// purple mark) stays on the site untouched in case Stripe branding still points at it.
const ASSETS = {
  logo: `${SITE}/img/email/logo-black.png`,
  logoDark: `${SITE}/img/email/logo-white.png`,
  instagram: `${SITE}/img/email/instagram.png`,
  facebook: `${SITE}/img/email/facebook.png`,
  youtube: `${SITE}/img/email/youtube.png`,
  x: `${SITE}/img/email/x.png`,
};

const SOCIAL = [
  { key: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/runwae_/' },
  { key: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/runwaeplatform' },
  { key: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/channel/UCv3u08c4k4GxdW97HuXYmrw' },
  { key: 'x', label: 'X (Twitter)', href: 'https://twitter.com/runwae_' },
];

const C = {
  accent: '#9389ff',
  accentSoft: '#f2f1ff',
  ink: '#000000',
  text: '#2b2c36',
  muted: '#6b6d7a',
  line: '#e6e6ee',
  bg: '#ffffff',
  danger: '#c62f2f',
};
const FONT_DISPLAY = "'museo-sans-rounded','Nunito',ui-rounded,'SF Pro Rounded','Arial Rounded MT Bold','Varela Round',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONT_BODY = "Roboto,system-ui,-apple-system,'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";

const MANAGE_URL = `${SITE}/account#notifications`;

/* ------------------------------------------------------------------ */
/* Escaping                                                            */
/* ------------------------------------------------------------------ */
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
/** Plain text: strip control chars (keeps \n), collapse runs of blank lines. */
function plain(v) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}
/** Single-line user text (names, subjects): no newlines, trimmed, capped. */
function line(v, max) {
  const s = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim();
  const n = max || 80;
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}
/** Multi-line user text (messages, notes): capped, newlines kept. */
function para(v, max) {
  const s = plain(v).trim();
  const n = max || 500;
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}
/**
 * Links: a same-site path ("/account" or "https://runwae.com/account"), or an absolute https URL on Stripe's
 * hosted billing pages (invoice / billing portal) for the subscription mails.
 * Nothing else: the browser never supplies a link.
 */
const STRIPE_HOSTS = /^https:\/\/(invoice|pay|billing)\.stripe\.com\/[A-Za-z0-9/_\-#?=&.%~]*$/;
function url(path) {
  let p = String(path || '/');
  if (STRIPE_HOSTS.test(p)) return p;
  if (p.startsWith(SITE + '/')) p = p.slice(SITE.length);
  if (!/^\/(?!\/)[A-Za-z0-9/_\-#?=&.]*$/.test(p)) throw new Error('email: bad link path');
  return SITE + p;
}
/** Money: integer cents -> "$1,234.50" ("$25" when whole). */
function money(cents, currency) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return '';
  const cur = String(currency || 'usd').toUpperCase();
  const whole = n % 100 === 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(n / 100);
  } catch (e) {
    return `${(n / 100).toFixed(whole ? 0 : 2)} ${cur}`;
  }
}
/** Date (ms or s epoch, or Date) -> "Oct 14, 2026" in UTC. */
function date(v) {
  if (v == null || v === '') return '';
  let n = v instanceof Date ? v.getTime() : Number(v);
  if (!Number.isFinite(n)) return '';
  if (n < 1e12) n *= 1000; // Stripe sends seconds
  return new Date(n).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/* ------------------------------------------------------------------ */
/* Blocks (each returns { html, text })                                */
/* ------------------------------------------------------------------ */
const P_STYLE = `margin:0 0 16px;font-family:${FONT_BODY};font-size:16px;line-height:1.55;color:${C.text};`;

const block = {
  /**
   * Paragraph. `content` is a string or an array of parts: strings, or {b: text}
   * for bold. Every part is escaped here; templates never pass raw HTML.
   */
  p(content, opts) {
    const o = opts || {};
    const parts = Array.isArray(content) ? content : [content];
    const html = parts.map((x) => (x && typeof x === 'object')
      ? `<b class="rw-ink" style="color:${C.ink};font-weight:600;">${esc(x.b)}</b>`
      : esc(x)).join('');
    const text = parts.map((x) => (x && typeof x === 'object') ? plain(x.b) : plain(x)).join('');
    return { html: `<p class="${o.muted ? 'rw-muted' : 'rw-text'}" style="${P_STYLE}${o.muted ? `color:${C.muted};font-size:14px;` : ''}">${html}</p>`, text };
  },
  /** Key/value rows with hairlines (receipts, agreement summary). */
  details(rows) {
    const r = rows.filter((x) => x && x[1] !== undefined && x[1] !== null && x[1] !== '');
    const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:4px 0 24px;">${r.map(([k, v], i) => `
<tr><td class="rw-muted rw-line" style="padding:12px 0;border-top:1px solid ${C.line};${i === r.length - 1 ? `border-bottom:1px solid ${C.line};` : ''}font-family:${FONT_BODY};font-size:14px;line-height:1.4;color:${C.muted};width:42%;vertical-align:top;">${esc(k)}</td>
<td class="rw-ink rw-line" style="padding:12px 0;border-top:1px solid ${C.line};${i === r.length - 1 ? `border-bottom:1px solid ${C.line};` : ''}font-family:${FONT_BODY};font-size:15px;line-height:1.4;color:${C.ink};font-weight:500;text-align:right;vertical-align:top;word-break:break-word;">${esc(v)}</td></tr>`).join('')}
</table>`;
    const text = r.map(([k, v]) => `${plain(k)}: ${plain(v)}`).join('\n');
    return { html, text };
  },
  /** Quoted user text (message snippet, dispute note): accent rule + soft tint. */
  quote(text, by) {
    const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
<tr><td class="rw-quote" style="border-left:3px solid ${C.accent};background:${C.accentSoft};border-radius:0 10px 10px 0;padding:14px 18px;font-family:${FONT_BODY};font-size:15px;line-height:1.55;color:${C.text};white-space:pre-line;word-break:break-word;">${esc(text)}${by ? `<br><span class="rw-muted" style="font-size:13px;color:${C.muted};">— ${esc(by)}</span>` : ''}</td></tr></table>`;
    const t = plain(text).split('\n').map((l) => '> ' + l).join('\n') + (by ? `\n> — ${plain(by)}` : '');
    return { html, text: t };
  },
  /** Black pill primary button (one per email). Bulletproof + Outlook VML. */
  button(label, path) {
    const href = url(path);
    const w = Math.max(160, Math.min(320, 28 + label.length * 9));
    const html = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px;"><tr><td>
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(href)}" style="height:46px;v-text-anchor:middle;width:${w}px;" arcsize="50%" stroke="f" fillcolor="#000000"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${esc(label)}</center></v:roundrect><![endif]-->
<!--[if !mso]><!-- --><a class="rw-btn" href="${esc(href)}" style="display:inline-block;background:${C.ink};color:#ffffff;border:1px solid ${C.ink};border-radius:999px;padding:14px 26px;font-family:${FONT_BODY};font-size:15px;font-weight:600;line-height:1;text-decoration:none;mso-hide:all;">${esc(label)}</a><!--<![endif]-->
</td></tr></table>`;
    return { html, text: `${plain(label)}: ${href}` };
  },
  /** Small notice (payment failed, dispute): danger text, no extra colour. */
  note(text, opts) {
    const o = opts || {};
    return {
      html: `<p class="${o.danger ? 'rw-danger' : 'rw-muted'}" style="margin:0 0 20px;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:${o.danger ? C.danger : C.muted};">${esc(text)}</p>`,
      text: plain(text),
    };
  },
};

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */
const DARK_CSS = `
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body,table,td{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
a{color:${C.ink};}
@media (max-width:620px){
  .rw-pad{padding-left:20px!important;padding-right:20px!important;}
  .rw-h1{font-size:24px!important;}
}
@media (prefers-color-scheme:dark){
  .rw-bg{background:#121218!important;}
  .rw-ink,.rw-ink a,.rw-word{color:#ffffff!important;}
  .rw-text{color:#e8e8f0!important;}
  .rw-muted,.rw-muted a{color:#a3a4b3!important;}
  .rw-line{border-color:#2e2f3b!important;}
  .rw-quote{background:#24223d!important;color:#e8e8f0!important;}
  .rw-btn{background:#ffffff!important;color:#000000!important;border-color:#ffffff!important;}
  .rw-danger{color:#ff7a7a!important;}
  .rw-icon{background:#24223d!important;}
  .rw-logo-l{display:none!important;}
  .rw-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
}
[data-ogsc] .rw-logo-l{display:none!important;}
[data-ogsc] .rw-logo-d{display:block!important;max-height:none!important;overflow:visible!important;}
[data-ogsc] .rw-ink,[data-ogsc] .rw-word{color:#ffffff!important;}
[data-ogsc] .rw-text{color:#e8e8f0!important;}
[data-ogsc] .rw-muted{color:#a3a4b3!important;}
[data-ogsc] .rw-btn{background:#ffffff!important;color:#000000!important;}
[data-ogsb] .rw-bg{background:#121218!important;}
[data-ogsb] .rw-quote{background:#24223d!important;}
`;

/**
 * @param {object} m
 * @param {string} m.subject
 * @param {string} m.preheader   inbox preview line
 * @param {string} [m.eyebrow]   small accent label above the heading
 * @param {string} m.heading
 * @param {{html:string,text:string}[]} m.blocks
 * @param {string} m.reason      "You're getting this because ..."
 * @param {boolean} [m.manage]   show "Manage email notifications" (false for receipts/account mail)
 */
function layout(m) {
  const blocksHtml = m.blocks.map((b) => b.html).join('\n');
  const manage = m.manage !== false;
  const social = SOCIAL.map((s) => `<td style="padding:0 6px;"><a href="${esc(s.href)}" style="text-decoration:none;"><img class="rw-icon" src="${esc(ASSETS[s.key])}" width="28" height="28" alt="${esc(s.label)}" style="display:block;width:28px;height:28px;border-radius:999px;background:${C.accentSoft};"></a></td>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
<title>${esc(m.subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>${DARK_CSS}</style>
</head>
<body class="rw-bg" style="margin:0;padding:0;background:${C.bg};width:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.bg};opacity:0;">${esc(m.preheader)}${'&#8204;&nbsp;'.repeat(40)}</div>
<table role="presentation" class="rw-bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};">
<tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="rw-bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${C.bg};">
  <tr><td class="rw-pad rw-line" style="padding:28px 40px 22px;border-bottom:1px solid ${C.line};">
    <a href="${SITE}/" style="text-decoration:none;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle;"><img class="rw-logo-l" src="${esc(ASSETS.logo)}" width="30" height="30" alt="Runwae" style="display:block;width:30px;height:30px;"><!--[if !mso]><!--><img class="rw-logo-d" src="${esc(ASSETS.logoDark)}" width="30" height="30" alt="Runwae" style="display:none;width:30px;height:30px;max-height:0;overflow:hidden;"><!--<![endif]--></td>
      <td class="rw-word" style="vertical-align:middle;padding-left:10px;font-family:${FONT_DISPLAY};font-size:22px;font-weight:900;line-height:1;color:${C.ink};">Runwae</td>
    </tr></table></a>
  </td></tr>
  <tr><td class="rw-pad" style="padding:36px 40px 8px;">
    ${m.eyebrow ? `<p style="margin:0 0 10px;font-family:${FONT_BODY};font-size:12px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;color:${C.accent};">${esc(m.eyebrow)}</p>` : ''}
    <h1 class="rw-ink rw-h1" style="margin:0 0 18px;font-family:${FONT_DISPLAY};font-size:28px;line-height:1.18;font-weight:800;letter-spacing:-.01em;color:${C.ink};">${esc(m.heading)}</h1>
    ${blocksHtml}
  </td></tr>
  <tr><td class="rw-pad rw-line" style="padding:24px 40px 36px;border-top:1px solid ${C.line};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px -6px;"><tr>${social}</tr></table>
    <p class="rw-muted" style="margin:0 0 8px;font-family:${FONT_BODY};font-size:13px;line-height:1.55;color:${C.muted};">${esc(m.reason)}</p>
    <p class="rw-muted" style="margin:0 0 8px;font-family:${FONT_BODY};font-size:13px;line-height:1.55;color:${C.muted};">Questions? Reply to this email or write to <a href="mailto:${SUPPORT}" style="color:${C.muted};text-decoration:underline;">${SUPPORT}</a>.${manage ? ` <a href="${MANAGE_URL}" style="color:${C.muted};text-decoration:underline;">Manage email notifications</a>.` : ''}</p>
    <p class="rw-muted" style="margin:0;font-family:${FONT_BODY};font-size:13px;line-height:1.55;color:${C.muted};">Runwae &middot; <a href="${SITE}/" style="color:${C.muted};text-decoration:none;">runwae.com</a></p>
  </td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>`;

  const text = [
    'Runwae',
    '',
    m.heading,
    '',
    m.blocks.map((b) => b.text).filter(Boolean).join('\n\n'),
    '',
    '---',
    m.reason,
    `Questions? Reply to this email or write to ${SUPPORT}.`,
    manage ? `Manage email notifications: ${MANAGE_URL}` : '',
    'Runwae · runwae.com',
  ].filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n').trim() + '\n';

  return { subject: line(m.subject, 120), html, text };
}

module.exports = { SITE, SUPPORT, ASSETS, SOCIAL, COLORS: C, MANAGE_URL, esc, plain, line, para, url, money, date, block, layout };
