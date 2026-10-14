/**
 * POST /api/notify   Authorization: Bearer <Firebase ID token>
 * Body: { "event": "<name>", "ids": { ... } }
 *
 * Replaces the old email.php relay (GET ?emailAddress=&subject=&payload=, where
 * the browser picked the recipient and the HTML). Here the browser only says
 * WHAT happened and WHERE (ids). The server:
 *   1. verifies the caller (Firebase admin),
 *   2. rate-limits the caller (email_rate/{uid}),
 *   3. loads the records from RTDB and checks the caller really did the thing,
 *   4. picks the recipient(s) itself and their address from Firebase Auth,
 *   5. honours users/{uid}/email_prefs/{agreements|messages|activity} === false,
 *   6. de-duplicates (email_dedupe/{hash}) and sends via lib/email (Resend, or a
 *      logged dry run when RESEND_API_KEY is missing -> still 202).
 *
 * Events (ids):
 *   proposal.requested | proposal.submitted | proposal.declined | payment.sent |
 *   post.submitted | post.verified | payout.accepted | dispute.opened   { gigPath }
 *   message.sent      { conversationId }
 *   user.followed     { uid }            (the user who was followed)
 *   review.posted     { uid }            (the user who was reviewed)
 *   post.activity     { itemKey, kind: comment|share|interest }
 *   account.created   {}
 *
 * Responses: 202 {ok, sent, skipped, dryRun} | 400 | 401 | 403 | 404 | 405 |
 *            409 not_ready (records not written yet: the client retries) | 429
 */
const crypto = require('crypto');
const admin = require('./lib/firebase');
const email = require('./lib/email');

const KEY = /^[A-Za-z0-9_-]{1,128}$/;
const GIG_PATH = /^items\/([A-Za-z0-9_-]{1,128})\/influencers\/([A-Za-z0-9_-]{1,128})$/;
const SUPPORT_INBOX = () => process.env.SUPPORT_EMAIL || 'hello@runwae.com';

const RATE = { windowMs: 10 * 60 * 1000, perWindow: 30, perDay: 200 };
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

class HttpError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
async function requireUser(req) {
  const h = String((req.headers && (req.headers.authorization || req.headers.Authorization)) || '');
  if (!h.startsWith('Bearer ') || h.length < 20) throw new HttpError(401, 'unauthenticated');
  try {
    const t = await admin.auth().verifyIdToken(h.slice(7));
    return t.uid;
  } catch (e) {
    throw new HttpError(401, 'unauthenticated');
  }
}

async function val(db, path) { return (await db.ref(path).once('value')).val(); }

/** Minimal profile (never the whole user node, which holds notifications etc.). */
async function profile(db, uid) {
  const [name, username, role, prefs] = await Promise.all([
    val(db, `users/${uid}/name`), val(db, `users/${uid}/username`),
    val(db, `users/${uid}/role`), val(db, `users/${uid}/email_prefs`),
  ]);
  return { uid, name: name || username || '', role: role || '', prefs: prefs && typeof prefs === 'object' ? prefs : {} };
}

/** Last child of a list matching uid (admin query; client never sees it). */
async function lastByUid(db, path, uid) {
  const snap = await db.ref(path).orderByChild('uid').equalTo(uid).limitToLast(1).once('value');
  const v = snap.val();
  if (!v) return null;
  const k = Object.keys(v)[0];
  return Object.assign({ _key: k }, v[k]);
}

async function rateLimit(db, uid, now) {
  const ref = db.ref(`email_rate/${uid}`);
  let limited = false;
  const r = await ref.transaction((cur) => {
    const c = cur && typeof cur === 'object' ? Object.assign({}, cur) : {};
    if (!c.ws || now - c.ws > RATE.windowMs) { c.ws = now; c.wn = 0; }
    if (!c.ds || now - c.ds > DAY) { c.ds = now; c.dn = 0; }
    if (c.wn >= RATE.perWindow || c.dn >= RATE.perDay) { limited = true; return; } // abort
    c.wn += 1; c.dn += 1;
    limited = false;
    return c;
  });
  if (limited || !r.committed) throw new HttpError(429, 'rate_limited');
}

/** Claim a dedupe slot; returns a release() or null when already sent within ttl. */
async function claim(db, key, ttl, now) {
  const id = crypto.createHash('sha1').update(key).digest('hex');
  const ref = db.ref(`email_dedupe/${id}`);
  let dup = false;
  const r = await ref.transaction((cur) => {
    if (cur && typeof cur === 'number' && now - cur < ttl) { dup = true; return; }
    dup = false;
    return now;
  });
  if (dup || !r.committed) return null;
  return { id, release: () => ref.remove() };
}

function priceCents(item) {
  const n = Math.round(Number(item && item.price));
  return Number.isFinite(n) && n > 0 && n <= 100000 ? n * 100 : 0;
}

/* ------------------------------------------------------------------ */
/* gig events                                                          */
/* ------------------------------------------------------------------ */
// actor: who may report it. ok(status): the gig must already show the result,
// otherwise 409 and the client retries on its next page load.
const GIG_EVENTS = {
  'proposal.requested': { actor: 'brand', ok: (s) => s >= 1, ttl: 7 * DAY, send: [['creator', 'gig_proposal_requested']] },
  'proposal.submitted': { actor: 'creator', ok: (s) => s >= 2, ttl: 10 * MIN, send: [['brand', 'gig_proposal_received']] },
  'proposal.declined': { actor: 'brand', ok: (s) => s === 3, ttl: 10 * MIN, send: [['creator', 'gig_proposal_declined']] },
  'payment.sent': { actor: 'brand', ok: (s) => s >= 4, ttl: 30 * DAY, paid: true, send: [['creator', 'gig_proposal_accepted'], ['brand', 'gig_payment_receipt']] },
  'post.submitted': { actor: 'creator', ok: (s) => s >= 5, ttl: 7 * DAY, send: [['brand', 'gig_post_submitted']] },
  'post.verified': { actor: 'brand', ok: (s) => s >= 6, ttl: 7 * DAY, send: [['creator', 'gig_post_verified']] },
  'payout.accepted': { actor: 'creator', ok: (s) => s >= 7, ttl: 30 * DAY, payout: true, send: [['creator', 'gig_payout_sent'], ['brand', 'gig_complete']] },
  'dispute.opened': { actor: 'either', ok: () => true, ttl: 30 * DAY, dispute: true, send: [['other', 'gig_dispute'], ['ops', 'gig_dispute_ops']] },
};

async function gigEvent(ctx, name, ids) {
  const spec = GIG_EVENTS[name];
  const m = GIG_PATH.exec(String(ids.gigPath || ''));
  if (!m) throw new HttpError(400, 'bad_ids');
  const { db, uid } = ctx;
  const [item, gig] = await Promise.all([val(db, `items/${m[1]}`), val(db, ids.gigPath)]);
  if (!item || !gig || !item.uid || !gig.uid) throw new HttpError(404, 'not_found');

  const brandUid = item.uid;
  const creatorUid = gig.uid;
  const role = uid === brandUid ? 'brand' : uid === creatorUid ? 'creator' : null;
  if (!role || (spec.actor !== 'either' && spec.actor !== role)) throw new HttpError(403, 'not_participant');
  const status = Number(gig.status) || 0;
  if (!spec.ok(status)) throw new HttpError(409, 'not_ready');

  const g = {
    platform: gig.platform || item.platform || '',
    compensation: item.compensation === 'gift' ? 'gift' : 'money',
    priceCents: priceCents(item),
    trackingNumber: gig.tracking_number || '',
    status,
  };
  const extra = {};
  let dedupe = `${name}:${ids.gigPath}`;

  if (spec.paid || spec.payout) {
    if (g.compensation === 'money') {
      const tx = gig.transaction_key && KEY.test(gig.transaction_key) ? await val(db, `transactions/${gig.transaction_key}`) : null;
      if (!tx || tx.path !== ids.gigPath || !tx.marketer_transactionID) throw new HttpError(409, 'not_ready');
      if (spec.payout && tx.status !== 'complete') throw new HttpError(409, 'not_ready');
      const c = Math.round(Number(tx.price)) * 100;
      if (Number.isFinite(c) && c > 0) g.priceCents = c; // what was actually charged
      const charged = Math.round(Number(tx.amount_charged_cents));
      if (Number.isFinite(charged) && charged > 0) extra.chargedCents = charged;
      const fee = Math.round(Number(tx.processing_fee_cents));
      if (Number.isFinite(fee) && fee > 0) extra.processingCents = fee;
      extra.reference = gig.transaction_key;
      extra.paidAt = spec.payout ? tx.influencer_time : tx.marketer_time;
    } else if (spec.paid && !g.trackingNumber) {
      throw new HttpError(409, 'not_ready');
    } else {
      extra.paidAt = Date.now();
    }
  }
  if (name === 'proposal.submitted' && gig.proposal && gig.proposal.time) dedupe += `:${gig.proposal.time}`;
  if (spec.dispute) {
    const list = gig.disputes && typeof gig.disputes === 'object' ? gig.disputes : null;
    const keys = list ? Object.keys(list).sort() : [];
    if (!keys.length) throw new HttpError(409, 'not_ready');
    const k = keys[keys.length - 1];
    extra.description = list[k].description || '';
    dedupe += `:${k}`;
  }

  const [brand, creator] = await Promise.all([profile(db, brandUid), profile(db, creatorUid)]);
  const base = Object.assign({ brandName: brand.name, creatorName: creator.name, gig: g }, extra);
  const out = [];
  for (const [who, template] of spec.send) {
    if (who === 'ops') {
      const filer = role === 'brand' ? brand : creator;
      out.push({ address: SUPPORT_INBOX(), template, dedupe: `${dedupe}:ops`, ttl: spec.ttl,
        data: Object.assign({}, base, { recipientName: 'Runwae', filerName: filer.name, filerRole: role, gigPath: ids.gigPath }) });
      continue;
    }
    const target = who === 'other' ? (role === 'brand' ? creator : brand) : who === 'brand' ? brand : creator;
    const other = target.uid === brand.uid ? creator : brand;
    out.push({ to: target, template, dedupe: `${dedupe}:${template}`, ttl: spec.ttl,
      data: Object.assign({}, base, { recipientName: target.name, otherName: other.name }) });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* other events                                                        */
/* ------------------------------------------------------------------ */
async function messageEvent(ctx, ids) {
  const { db, uid } = ctx;
  const conv = String(ids.conversationId || '');
  if (!KEY.test(conv)) throw new HttpError(400, 'bad_ids');
  const mine = await val(db, `users/${uid}/conversations/${conv}`);
  const partnerUid = mine && mine.uid;
  if (!partnerUid || !KEY.test(partnerUid) || partnerUid === uid) throw new HttpError(403, 'not_participant');
  const theirs = await val(db, `users/${partnerUid}/conversations/${conv}`);
  if (!theirs || theirs.uid !== uid) throw new HttpError(403, 'not_participant');
  const snap = await db.ref(`conversations/${conv}`).orderByKey().limitToLast(1).once('value');
  const last = snap.val() ? Object.values(snap.val())[0] : null;
  if (!last || last.uid !== uid) throw new HttpError(409, 'not_ready');
  const [me, them] = await Promise.all([profile(db, uid), profile(db, partnerUid)]);
  return [{ to: them, template: 'message_new', dedupe: `msg:${conv}:${partnerUid}`, ttl: 15 * MIN,
    data: { recipientName: them.name, senderName: me.name, snippet: typeof last.body === 'string' ? last.body : '' } }];
}

async function followEvent(ctx, ids) {
  const { db, uid } = ctx;
  const host = String(ids.uid || '');
  if (!KEY.test(host) || host === uid) throw new HttpError(400, 'bad_ids');
  const f = await lastByUid(db, `users/${uid}/following`, host);
  if (!f) throw new HttpError(409, 'not_ready');
  const [me, them] = await Promise.all([profile(db, uid), profile(db, host)]);
  return [{ to: them, template: 'follower_new', dedupe: `follow:${uid}:${host}`, ttl: 30 * DAY,
    data: { recipientName: them.name, actorName: me.name } }];
}

async function reviewEvent(ctx, ids) {
  const { db, uid } = ctx;
  const host = String(ids.uid || '');
  if (!KEY.test(host) || host === uid) throw new HttpError(400, 'bad_ids');
  const r = await lastByUid(db, `users/${host}/reviews_received`, uid);
  if (!r) throw new HttpError(409, 'not_ready');
  const [me, them] = await Promise.all([profile(db, uid), profile(db, host)]);
  return [{ to: them, template: 'review_new', dedupe: `review:${host}:${r._key}`, ttl: 365 * DAY,
    data: { recipientName: them.name, actorName: me.name, rating: r.rating, body: typeof r.body === 'string' ? r.body : '' } }];
}

const ACTIVITY_LIST = { comment: 'comments', share: 'shares', interest: 'interests' };
async function activityEvent(ctx, ids) {
  const { db, uid } = ctx;
  const itemKey = String(ids.itemKey || '');
  const list = ACTIVITY_LIST[ids.kind];
  if (!KEY.test(itemKey) || !list) throw new HttpError(400, 'bad_ids');
  const owner = await val(db, `items/${itemKey}/uid`);
  if (!owner) throw new HttpError(404, 'not_found');
  if (owner === uid) return [];
  const ev = await lastByUid(db, `items/${itemKey}/${list}`, uid);
  if (!ev) throw new HttpError(409, 'not_ready');
  const [me, them] = await Promise.all([profile(db, uid), profile(db, owner)]);
  return [{ to: them, template: 'activity', dedupe: `act:${ids.kind}:${uid}:${itemKey}`, ttl: DAY,
    data: { recipientName: them.name, actorName: me.name, kind: ids.kind } }];
}

async function accountEvent(ctx) {
  const { db, uid } = ctx;
  const u = await admin.auth().getUser(uid);
  const created = Date.parse(u.metadata && u.metadata.creationTime);
  if (!Number.isFinite(created) || Date.now() - created > 7 * DAY) throw new HttpError(403, 'not_new_account');
  const me = await profile(db, uid);
  return [{ to: me, template: 'account_welcome', dedupe: `welcome:${uid}`, ttl: 3650 * DAY,
    data: { recipientName: me.name, role: me.role } }];
}

/* ------------------------------------------------------------------ */
/* delivery                                                            */
/* ------------------------------------------------------------------ */
async function deliver(db, job, now) {
  let address = job.address;
  const category = email.render(job.template, job.data).category;
  if (!address) {
    const t = job.to;
    if (category !== 'transactional' && t.prefs[category] === false) return { template: job.template, skipped: 'muted' };
    let u;
    try { u = await admin.auth().getUser(t.uid); } catch (e) { return { template: job.template, skipped: 'no_account' }; }
    if (!u || u.disabled || !u.email) return { template: job.template, skipped: 'no_address' };
    if (category !== 'transactional' && !u.emailVerified && process.env.NOTIFY_REQUIRE_VERIFIED !== '0') {
      return { template: job.template, skipped: 'unverified' };
    }
    address = u.email;
  }
  const slot = await claim(db, job.dedupe, job.ttl, now);
  if (!slot) return { template: job.template, skipped: 'duplicate' };
  const r = await email.sendEmail({ to: address, template: job.template, data: job.data, idempotencyKey: `notify_${slot.id}` });
  if (!r.ok) {
    try { await slot.release(); } catch (e) { /* ignore */ }
    return { template: job.template, failed: true };
  }
  return { template: job.template, sent: true, dryRun: !!r.dryRun };
}

const HANDLERS = Object.assign(
  Object.fromEntries(Object.keys(GIG_EVENTS).map((k) => [k, (ctx, ids) => gigEvent(ctx, k, ids)])),
  {
    'message.sent': messageEvent,
    'user.followed': followEvent,
    'review.posted': reviewEvent,
    'post.activity': activityEvent,
    'account.created': accountEvent,
  }
);

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  try {
    const uid = await requireUser(req);
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
    if (!body || typeof body !== 'object') throw new HttpError(400, 'bad_body');
    const event = String(body.event || '');
    const ids = body.ids && typeof body.ids === 'object' ? body.ids : {};
    const fn = Object.prototype.hasOwnProperty.call(HANDLERS, event) ? HANDLERS[event] : null;
    if (!fn) throw new HttpError(400, 'unknown_event');

    const db = admin.database();
    const now = Date.now();
    await rateLimit(db, uid, now);
    const jobs = await fn({ db, uid }, ids);

    const results = [];
    for (const job of jobs) results.push(await deliver(db, job, now));
    const sent = results.filter((r) => r.sent).length;
    const failed = results.filter((r) => r.failed).length;
    if (failed && !sent) return res.status(502).json({ ok: false, error: 'send_failed' });
    return res.status(202).json({
      ok: true,
      sent,
      skipped: results.filter((r) => r.skipped).map((r) => r.skipped),
      dryRun: results.some((r) => r.dryRun),
    });
  } catch (e) {
    if (e instanceof HttpError) return res.status(e.status).json({ error: e.code });
    console.error(JSON.stringify({ notify: 'error', error: e && e.message }));
    return res.status(500).json({ error: 'server_error' });
  }
}

module.exports = handler;
module.exports.GIG_EVENTS = GIG_EVENTS;
module.exports.EVENTS = Object.keys(HANDLERS);
