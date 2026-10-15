/**
 * GET /api/public/explore: read-only public feed for signed-out visitors.
 *
 * The RTDB rules keep `items` and `users` behind `auth != null`. This function
 * reads them with the admin SDK and returns a STRICT field allowlist, so the
 * public never gets raw records (emails, uids, payment/Stripe fields, gigs,
 * interests, comments, messages, transactions...). Everything not built
 * explicitly in toPublicItem() / toPublicAuthor() is dropped.
 *
 * Query:  type   = all | campaigns | services | posts   (default all)
 *         cursor = item time (ms); returns items strictly older than it
 *         limit  = 1..24 (default 12)
 *
 * Response (always JSON, never a stack trace):
 *   200 { items: [PublicItem], next_cursor: number|null }
 *   405 / 503 { items: [], next_cursor: null, error: "<code>" }
 *
 * The strings in the response are plain text (HTML stripped) but NOT
 * HTML-escaped: the page must render them with textContent / setAttribute,
 * never innerHTML.
 */
const MAX_LIMIT = 24;
const DEFAULT_LIMIT = 12;
const BATCH_MAX = 100;      // most items read from RTDB per query
const MAX_BATCHES = 3;      // stop scanning after this many queries per request
const TITLE_MAX = 80;
const DESC_MAX = 280;
const TAG_MAX = 32;
const TAGS_MAX = 5;

const TYPES = { campaigns: 'campaign', services: 'service', posts: 'post' };
const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'facebook', 'twitter', 'linkedin'];
// Item states that must never be public. Only status === 'active' passes, but
// the boolean flags below are checked too in case they are ever introduced.
const ITEM_HIDE_FLAGS = ['deleted', 'private', 'draft', 'hidden', 'removed', 'flagged', 'suspended'];
const USER_BAD_STATUS = new Set(['suspended', 'banned', 'deactivated', 'disabled', 'deleted', 'inactive', 'account_deactivated']);
const USER_BAD_FLAGS = ['suspended', 'banned', 'deactivated', 'disabled', 'deleted', 'account_deactivated'];
// Only these user children are ever read (never the whole user node).
const USER_FIELDS = ['username', 'name', 'photo_url', 'role', 'industry', 'status'].concat(USER_BAD_FLAGS);

// ---- light per-instance rate limit (best effort; the CDN cache absorbs most traffic) ----
const RL_WINDOW_MS = 60 * 1000;
const RL_MAX = 60;
const rlHits = new Map();
function rateLimited(ip, now) {
  if (!ip) return false;
  if (rlHits.size > 5000) rlHits.clear();
  const e = rlHits.get(ip);
  if (!e || now - e.start > RL_WINDOW_MS) { rlHits.set(ip, { start: now, n: 1 }); return false; }
  e.n += 1;
  return e.n > RL_MAX;
}

// ---- text helpers ----
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
function plainText(v) {
  if (typeof v !== 'string') return '';
  return v
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+\d*);/gi, (m, e) => {
      const k = e.toLowerCase();
      if (ENTITIES[k] !== undefined) return ENTITIES[k];
      if (k[0] === '#') {
        const n = k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
        return Number.isFinite(n) && n > 31 && n < 0x110000 ? String.fromCodePoint(n) : ' ';
      }
      return m;
    })
    .replace(/<[^>]*>/g, ' ')                 // tags that were entity-encoded
    .replace(/[<>]/g, '')                     // stray brackets
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028\u2029]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
// Contact details typed into a caption are not republished to the open web.
function redactContacts(s) {
  return s
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email hidden]')
    .replace(/(?:\+?\d[\s().-]*){9,}\d/g, (m) => (m.replace(/\D/g, '').length >= 10 ? '[phone hidden]' : m));
}
function truncate(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s.,;:!?-]+$/, '') + '\u2026';
}
function safeHttpsUrl(v) {
  if (typeof v !== 'string' || v.length > 2048) return null;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch (e) { return null; }
}

// ---- record mappers (the allowlist) ----
function userIsHidden(u) {
  if (!u) return true;
  if (typeof u.status === 'string' && USER_BAD_STATUS.has(u.status.toLowerCase())) return true;
  return USER_BAD_FLAGS.some((f) => u[f] === true);
}
function publicRole(u) {
  return u.role === 'marketer' ? 'brand' : u.role === 'influencer' ? 'influencer' : null;
}
function toPublicAuthor(u) {
  const handle = plainText(u.username).slice(0, 64) || null;
  return {
    displayName: plainText(u.name).slice(0, 100) || handle || 'Runwae member',
    handle,
    avatarUrl: safeHttpsUrl(u.photo_url),
    role: publicRole(u),
  };
}
// Items carry no explicit type in the current schema: brands (marketers) post
// campaigns; an influencer item with a price is a service, otherwise a post.
function itemType(item, u) {
  const t = typeof item.type === 'string' ? item.type.toLowerCase() : '';
  if (t === 'campaign' || t === 'service' || t === 'post') return t;
  if (u.role === 'marketer') return 'campaign';
  return Number(item.price) > 0 ? 'service' : 'post';
}
function itemIsHidden(item) {
  if (!item || typeof item !== 'object') return true;
  if (item.status !== 'active') return true;
  if (ITEM_HIDE_FLAGS.some((f) => item[f] === true)) return true;
  if (item.visibility && item.visibility !== 'public') return true;
  if (!Number.isFinite(Number(item.time)) || typeof item.uid !== 'string') return true;
  return false;
}
function toTags(item, u) {
  let raw = [];
  if (Array.isArray(item.tags)) raw = item.tags;
  else if (item.tags && typeof item.tags === 'object') raw = Object.values(item.tags);
  else if (typeof item.tags === 'string') raw = item.tags.split(',');
  if (typeof item.category === 'string') raw = [item.category].concat(raw);
  if (!raw.length && typeof u.industry === 'string') raw = u.industry.split(',');
  const out = [];
  for (const t of raw) {
    const s = plainText(typeof t === 'string' ? t : '').slice(0, TAG_MAX);
    if (s && !out.some((x) => x.toLowerCase() === s.toLowerCase())) out.push(s);
    if (out.length >= TAGS_MAX) break;
  }
  return out;
}
function toPublicItem(id, item, u) {
  const text = redactContacts(plainText(item.caption || item.description || ''));
  const titleSrc = redactContacts(plainText(item.title || '')) || text;
  const mediaUrl = safeHttpsUrl(item.photo_url);
  const media = (item.media_type === 'image' || item.media_type === 'video') && mediaUrl
    ? { type: item.media_type, url: item.media_type === 'video' ? (safeHttpsUrl(item.video_url) || mediaUrl) : mediaUrl,
        posterUrl: item.media_type === 'video' ? mediaUrl : null }
    : null;
  return {
    id,
    type: itemType(item, u),
    title: truncate(titleSrc, TITLE_MAX),
    description: truncate(text, DESC_MAX),
    platforms: PLATFORMS.filter((p) => item[p] === true),
    tags: toTags(item, u),
    // The feed only ever shows the compensation KIND (card vs gift icon),
    // never the amount, so the price is not published here either.
    compensation: item.compensation === 'money' ? 'paid' : item.compensation === 'gift' ? 'gift' : null,
    media,
    createdAt: Number(item.time),
    author: toPublicAuthor(u),
  };
}

// ---- data access ----
async function loadUser(db, uid, cache) {
  if (cache.has(uid)) return cache.get(uid);
  const p = Promise.all(USER_FIELDS.map((f) => db.ref(`users/${uid}/${f}`).once('value')))
    .then((snaps) => {
      const u = {};
      snaps.forEach((s, i) => { const v = s.val(); if (v !== null && v !== undefined) u[USER_FIELDS[i]] = v; });
      return Object.keys(u).length ? u : null;
    });
  cache.set(uid, p);
  return p;
}

async function readFeed(db, { type, cursor, limit }) {
  const want = type === 'all' ? null : TYPES[type];
  const users = new Map();
  const out = [];
  let end = cursor;
  let exhausted = false;
  const batch = Math.min(BATCH_MAX, Math.max(limit * 3, 24));
  for (let b = 0; b < MAX_BATCHES && out.length < limit && !exhausted; b++) {
    let q = db.ref('items').orderByChild('time');
    if (end !== null) q = q.endAt(end - 1);
    const snap = await q.limitToLast(batch).once('value');
    const rows = [];
    snap.forEach((child) => { rows.push([child.key, child.val()]); });
    if (rows.length < batch) exhausted = true;
    if (!rows.length) break;
    rows.sort((a, b2) => Number(b2[1] && b2[1].time) - Number(a[1] && a[1].time)); // newest first
    end = Number(rows[rows.length - 1][1] && rows[rows.length - 1][1].time);
    if (!Number.isFinite(end)) exhausted = true;
    const visible = rows.filter(([, it]) => !itemIsHidden(it));
    const authors = await Promise.all(visible.map(([, it]) => loadUser(db, it.uid, users)));
    for (let i = 0; i < visible.length && out.length < limit; i++) {
      const u = authors[i];
      if (userIsHidden(u) || !publicRole(u)) continue;
      const pub = toPublicItem(visible[i][0], visible[i][1], u);
      if (want && pub.type !== want) continue;
      out.push(pub);
    }
  }
  let next = null;
  if (out.length === limit) {
    const last = out[out.length - 1].createdAt;
    if (!(exhausted && last <= end)) next = last;      // more rows may follow the last one shown
  } else if (!exhausted && Number.isFinite(end)) {
    next = end;                                        // scan budget used up; resume below what was read
  }
  return { items: out, next_cursor: next };
}

function parseQuery(query) {
  const q = query || {};
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  let type = String(one(q.type) || 'all').toLowerCase();
  if (type !== 'all' && !TYPES[type]) type = 'all';
  let limit = parseInt(one(q.limit), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  let cursor = Number(one(q.cursor));
  cursor = one(q.cursor) !== undefined && one(q.cursor) !== '' && Number.isFinite(cursor) && cursor > 0 ? Math.floor(cursor) : null;
  return { type, cursor, limit };
}

function clientIp(req) {
  const h = (req.headers && (req.headers['x-real-ip'] || req.headers['x-forwarded-for'])) || '';
  return String(h).split(',')[0].trim();
}

async function handler(req, res) {
  const empty = { items: [], next_cursor: null };
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json(Object.assign({ error: 'method_not_allowed' }, empty));
  }
  if (rateLimited(clientIp(req), Date.now())) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', '60');
    return res.status(429).json(Object.assign({ error: 'rate_limited' }, empty));
  }
  try {
    const admin = require('../_lib/firebase');
    const result = await readFeed(admin.database(), parseQuery(req.query));
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(result);
  } catch (err) {
    console.error('public/explore failed:', err && err.message ? err.message : 'unknown');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json(Object.assign({ error: 'unavailable' }, empty));
  }
}

module.exports = handler;
module.exports._internal = { parseQuery, plainText, redactContacts, truncate, toPublicItem, itemIsHidden, userIsHidden, readFeed, rlHits };
