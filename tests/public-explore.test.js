/**
 * Unit test for api/public/explore.js with a MOCKED firebase-admin (no network,
 * no credentials). Run: node --test tests/public-explore.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const path = require('path');

// ---------------- fixture DB ----------------
const T0 = 1760000000000;
const SECRET = {
  email: 'secret-person@example.com',
  phone: '+1 555 010 9999',
  stripe_account_id: 'acct_SECRET123',
  stripe_customer_id: 'cus_SECRET123',
  address: '12 Hidden Lane',
  zip: '99999',
};
function user(role, extra) {
  return Object.assign({
    role, username: role + '_handle', name: role === 'marketer' ? 'Acme <b>Brand</b>' : 'Ivy Influencer',
    photo_url: 'https://firebasestorage.googleapis.com/v0/b/x/o/avatar.png?alt=media&token=t',
    header_url: 'https://example.com/header.png', city: 'Austin', region: 'TX', country: 'US',
    industry: 'Beauty, Skincare, Wellness', description: 'about me', website: 'https://me.example',
    email: SECRET.email, phone: SECRET.phone, stripe_account_id: SECRET.stripe_account_id,
    stripe_customer_id: SECRET.stripe_customer_id, address: SECRET.address, zip: SECRET.zip,
    transactions: { t1: { amount: 500, stripe_payment_intent: 'pi_SECRET' } },
    conversations: { c1: { uid: 'uOther', read_or_unread: 'unread' } },
    gigs: { g1: { path: 'items/x/influencers/y', uid: 'uOther' } },
    notifications: { n1: { action: 'msg', uid: 'uOther' } },
    verified: true, email_verified: true,
  }, extra || {});
}
const users = {
  uBrand: user('marketer'),
  uInf: user('influencer'),
  uBanned: user('marketer', { status: 'banned' }),
  uSusp: user('influencer', { suspended: true }),
  uNoRole: user(undefined),
};
function item(uid, i, extra) {
  return Object.assign({
    uid, time: T0 + i * 1000, status: 'active',
    caption: `<p>Campaign ${i} <script>alert(1)</script>for our <b>serum</b> &amp; toner. Contact secret-person@example.com or +1 (555) 010-9999.</p>`,
    media_type: 'image', photo_url: 'https://firebasestorage.googleapis.com/v0/b/x/o/p.jpg?alt=media&token=t', video_url: '',
    compensation: 'money', price: '25', gift_method: 'ship', gift_description: 'secret gift note',
    instagram: true, twitter: false, facebook: true, linkedin: false,
    interests: { k1: { uid: 'uOther', platform: 'instagram', time: 1 } },
    influencers: { g1: { uid: 'uOther', transaction_key: 'tx_SECRET', stripe_transfer_id: 'tr_SECRET' } },
    comments: { c1: { uid: 'uOther', comment: 'private-ish comment', time: 1 } },
    shares: { s1: { uid: 'uOther', time: 1 } },
    interests_count: 1, comments_count: 1, shares_count: 1, gigs_count: 1,
    transaction_key: 'tx_SECRET', stripe_payment_intent: 'pi_SECRET',
  }, extra || {});
}
const items = {};
// 40 visible brand campaigns (times 1..40) interleaved with hidden ones
for (let i = 1; i <= 40; i++) items['brand' + String(i).padStart(2, '0')] = item('uBrand', i);
items.infService = item('uInf', 41, { compensation: 'gift', price: '15' });
items.infPost = item('uInf', 42, { price: '', compensation: '', media_type: false, photo_url: '' });
items.inactive = item('uBrand', 43, { status: 'inactive' });
items.deleted = item('uBrand', 44, { deleted: true });
items.draft = item('uBrand', 45, { draft: true });
items.hiddenFlag = item('uBrand', 46, { hidden: true });
items.privateVis = item('uBrand', 47, { visibility: 'private' });
items.banned = item('uBanned', 48);
items.suspended = item('uSusp', 49);
items.orphan = item('uGhost', 50);
items.noRole = item('uNoRole', 51);
items.httpMedia = item('uBrand', 52, { photo_url: 'http://insecure.example/p.jpg', caption: 'x'.repeat(600) });

// ---------------- firebase-admin mock ----------------
const reads = [];
function getPath(p) {
  return p.split('/').filter(Boolean).reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), { items, users });
}
function snapOf(key, val) {
  return { key, val: () => (val === undefined ? null : val), exists: () => val !== undefined };
}
function makeRef(p) {
  const q = { order: null, end: null, last: null };
  const api = {
    orderByChild(c) { q.order = c; return api; },
    endAt(v) { q.end = v; return api; },
    endBefore(v) { q.end = v - 1; return api; },
    limitToLast(n) { q.last = n; return api; },
    once(ev) {
      assert.strictEqual(ev, 'value');
      reads.push(p);
      const v = getPath(p);
      if (!q.order) return Promise.resolve(snapOf(p.split('/').pop(), v));
      let rows = Object.entries(v || {}).filter(([, x]) => x && typeof x[q.order] === 'number');
      rows.sort((a, b) => a[1][q.order] - b[1][q.order] || (a[0] < b[0] ? -1 : 1));
      if (q.end !== null) rows = rows.filter(([, x]) => x[q.order] <= q.end);
      if (q.last !== null) rows = rows.slice(-q.last);
      return Promise.resolve({ forEach(fn) { rows.forEach(([k, x]) => fn(snapOf(k, x))); }, val: () => Object.fromEntries(rows) });
    },
  };
  return api;
}
let dbFails = false;
const fakeAdmin = {
  apps: [],
  credential: { cert: (c) => ({ c }) },
  initializeApp() { fakeAdmin.apps.push({}); },
  database() { if (dbFails) throw new Error('boom: secret internal detail'); return { ref: makeRef }; },
};
const origLoad = Module._load;
Module._load = function (req, parent, isMain) {
  if (req === 'firebase-admin') return fakeAdmin;
  return origLoad.apply(this, arguments);
};

const handler = require(path.join(__dirname, '..', 'api', 'public', 'explore.js'));

function call(method, query, ip) {
  return new Promise((resolve) => {
    const headers = {};
    const res = {
      statusCode: 200,
      setHeader(k, v) { headers[k.toLowerCase()] = v; },
      status(c) { this.statusCode = c; return this; },
      json(body) { resolve({ status: this.statusCode, headers, body, raw: JSON.stringify(body) }); return this; },
    };
    handler({ method, query: query || {}, headers: { 'x-forwarded-for': ip || '10.0.0.' + Math.floor(Math.random() * 250) } }, res);
  });
}
const FORBIDDEN = ['secret-person', 'example.com', '555', 'acct_', 'cus_', 'pi_', 'tr_', 'tx_SECRET', 'Hidden Lane', '99999',
  'uBrand', 'uInf', 'uOther', 'uBanned', 'uSusp', 'uGhost', 'Austin', 'secret gift', 'private-ish', '<', '>', 'alert(1)'];
const ITEM_KEYS = ['author', 'compensation', 'createdAt', 'description', 'id', 'media', 'platforms', 'tags', 'title', 'type'].sort();
const AUTHOR_KEYS = ['avatarUrl', 'displayName', 'handle', 'role'].sort();

// ---------------- tests ----------------
test('default page: 12 newest visible items, exact key allowlist, no leaks', async () => {
  const r = await call('GET', {});
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers['cache-control'], 'public, s-maxage=60, stale-while-revalidate=300');
  assert.strictEqual(r.body.items.length, 12);
  assert.deepStrictEqual(Object.keys(r.body).sort(), ['items', 'next_cursor']);
  for (const it of r.body.items) {
    assert.deepStrictEqual(Object.keys(it).sort(), ITEM_KEYS);
    assert.deepStrictEqual(Object.keys(it.author).sort(), AUTHOR_KEYS);
    assert.ok(['brand', 'influencer'].includes(it.author.role));
  }
  for (const f of FORBIDDEN) assert.ok(!r.raw.includes(f), 'response leaks ' + JSON.stringify(f));
  const keys = new Set();
  (function walk(o) { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { keys.add(k.toLowerCase()); walk(v); } })(r.body);
  for (const k of ['uid', 'email', 'stripe', 'phone', 'price', 'transaction', 'gift_', 'interests', 'comments', 'influencers', 'city', 'region', 'status']) {
    assert.ok(![...keys].some((x) => x.includes(k)), 'response has a key like ' + k);
  }
  for (const k of ['stripe', 'transaction', 'city', 'region']) assert.ok(!r.raw.toLowerCase().includes(k), 'response text contains ' + k);
  // newest first; hidden/banned/suspended/orphan/no-role skipped
  const ids = r.body.items.map((i) => i.id);
  assert.deepStrictEqual(ids.slice(0, 3), ['httpMedia', 'infPost', 'infService']);
  for (const bad of ['inactive', 'deleted', 'draft', 'hiddenFlag', 'privateVis', 'banned', 'suspended', 'orphan', 'noRole']) {
    assert.ok(!ids.includes(bad), bad + ' must be filtered');
  }
  const times = r.body.items.map((i) => i.createdAt);
  assert.deepStrictEqual(times, [...times].sort((a, b) => b - a));
  assert.strictEqual(r.body.next_cursor, times[times.length - 1]);
});

test('field mapping: plain text, redaction, truncation, types, media', async () => {
  const r = await call('GET', { limit: '24' });
  const by = Object.fromEntries(r.body.items.map((i) => [i.id, i]));
  const c = by.brand40;
  assert.strictEqual(c.type, 'campaign');
  assert.strictEqual(c.author.role, 'brand');
  assert.strictEqual(c.author.displayName, 'Acme Brand');
  assert.strictEqual(c.author.handle, 'marketer_handle');
  assert.match(c.author.avatarUrl, /^https:\/\//);
  assert.ok(c.description.startsWith('Campaign 40 for our serum & toner.'), c.description);
  assert.ok(c.description.includes('[email hidden]') && c.description.includes('[phone hidden]'), c.description);
  assert.deepStrictEqual(c.platforms, ['instagram', 'facebook']);
  assert.deepStrictEqual(c.tags, ['Beauty', 'Skincare', 'Wellness']);
  assert.strictEqual(c.compensation, 'paid');
  assert.deepStrictEqual(c.media, { type: 'image', url: items.brand40.photo_url, posterUrl: null });
  assert.ok(c.title.length <= 80);
  assert.strictEqual(by.infService.type, 'service');
  assert.strictEqual(by.infService.compensation, 'gift');
  assert.strictEqual(by.infPost.type, 'post');
  assert.strictEqual(by.infPost.media, null);
  assert.strictEqual(by.infPost.compensation, null);
  assert.strictEqual(by.httpMedia.media, null, 'non-https media dropped');
  assert.ok(by.httpMedia.description.length <= 280 && by.httpMedia.description.endsWith('\u2026'));
  assert.ok(by.httpMedia.title.length <= 80);
});

test('type filter', async () => {
  for (const [q, t] of [['campaigns', 'campaign'], ['services', 'service'], ['posts', 'post']]) {
    const r = await call('GET', { type: q, limit: '24' });
    assert.ok(r.body.items.length > 0, q);
    assert.ok(r.body.items.every((i) => i.type === t), q);
  }
  const s = await call('GET', { type: 'services' });
  assert.deepStrictEqual(s.body.items.map((i) => i.id), ['infService']);
  const bogus = await call('GET', { type: 'users' });
  assert.strictEqual(bogus.body.items.length, 12, 'unknown type falls back to all');
});

test('limit clamp', async () => {
  assert.strictEqual((await call('GET', { limit: '500' })).body.items.length, 24);
  assert.strictEqual((await call('GET', { limit: '0' })).body.items.length, 12);
  assert.strictEqual((await call('GET', { limit: '-3' })).body.items.length, 12);
  assert.strictEqual((await call('GET', { limit: 'abc' })).body.items.length, 12);
  assert.strictEqual((await call('GET', { limit: '5' })).body.items.length, 5);
});

test('cursor paging walks every visible item exactly once', async () => {
  const seen = [];
  let cursor;
  for (let page = 0; page < 20; page++) {
    const r = await call('GET', Object.assign({ limit: '7' }, cursor ? { cursor: String(cursor) } : {}));
    assert.strictEqual(r.status, 200);
    seen.push(...r.body.items.map((i) => i.id));
    if (r.body.items.length) assert.ok(r.body.items.every((i) => !cursor || i.createdAt < cursor));
    cursor = r.body.next_cursor;
    if (!cursor) break;
  }
  assert.strictEqual(cursor, null, 'paging terminates');
  assert.strictEqual(new Set(seen).size, seen.length, 'no duplicates');
  assert.strictEqual(seen.length, 43, '40 campaigns + service + post + httpMedia');
  const empty = await call('GET', { cursor: String(T0) });
  assert.deepStrictEqual(empty.body, { items: [], next_cursor: null });
});

test('author lookups read only allowlisted user children, never the whole node or email', async () => {
  reads.length = 0;
  await call('GET', { limit: '24' });
  const userReads = reads.filter((p) => p.startsWith('users/'));
  assert.ok(userReads.length > 0);
  for (const p of userReads) {
    assert.strictEqual(p.split('/').length, 3, 'whole user node read: ' + p);
    assert.ok(!/\/(email|phone|stripe|transactions|conversations|address)/.test(p), p);
  }
});

test('non-GET -> 405 with empty items', async () => {
  const r = await call('POST', {});
  assert.strictEqual(r.status, 405);
  assert.deepStrictEqual(r.body.items, []);
  assert.strictEqual(r.headers.allow, 'GET, HEAD');
});

test('DB failure -> 503 {items:[]} without internals', async () => {
  dbFails = true;
  const origErr = console.error; console.error = () => {};
  try {
    const r = await call('GET', {});
    assert.strictEqual(r.status, 503);
    assert.deepStrictEqual(r.body, { error: 'unavailable', items: [], next_cursor: null });
    assert.ok(!r.raw.includes('boom') && !r.raw.includes('stack'));
    assert.strictEqual(r.headers['cache-control'], 'no-store');
  } finally { dbFails = false; console.error = origErr; }
});

test('per-IP rate limit (best effort, per instance)', async () => {
  handler._internal.rlHits.clear();
  let last;
  for (let i = 0; i < 61; i++) last = await call('GET', { limit: '1' }, '203.0.113.9');
  assert.strictEqual(last.status, 429);
  assert.deepStrictEqual(last.body.items, []);
  const other = await call('GET', { limit: '1' }, '203.0.113.10');
  assert.strictEqual(other.status, 200);
});

test('plainText helper', () => {
  const { plainText } = handler._internal;
  assert.strictEqual(plainText('<img src=x onerror=alert(1)>Hi &lt;b&gt;there&lt;/b&gt; &#39;you&#39;'), "Hi there 'you'");
  assert.strictEqual(plainText(null), '');
  assert.strictEqual(plainText({ a: 1 }), '');
});
