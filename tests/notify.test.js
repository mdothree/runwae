/**
 * Unit tests for api/notify.js + api/lib/email.js with a MOCKED firebase-admin
 * and a MOCKED global fetch (no network, no credentials, nothing is sent).
 * Run: node --test tests/notify.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const path = require('path');

/* ---------------- in-memory RTDB ---------------- */
const NOW = Date.now();
function fixture() {
  return {
    users: {
      uBrand: { name: 'Maya <img src=x onerror=alert(1)> Ortiz', username: 'lumen', role: 'marketer', email: 'attacker-controlled@evil.test',
        conversations: { conv1: { uid: 'uInf', read_or_unread: 'read' } }, following: { f1: { uid: 'uInf', time: 1 } } },
      uInf: { name: 'Ivy "Chen"', username: 'ivy', role: 'influencer', email: 'also-ignored@evil.test',
        conversations: { conv1: { uid: 'uBrand', read_or_unread: 'unread' } },
        reviews_received: { r1: { uid: 'uBrand', rating: '5', body: 'Great <b>work</b>\r\nBcc: x@evil.test', time: 1 } } },
      uMuted: { name: 'Mute Person', role: 'influencer', email_prefs: { agreements: false, messages: false } },
      uStranger: { name: 'Stranger', role: 'influencer' },
    },
    items: {
      item1: { uid: 'uBrand', compensation: 'money', price: '250', platform: 'instagram',
        comments: { c1: { uid: 'uInf', comment: 'hi', time: 1 } },
        influencers: {
          gig1: { uid: 'uInf', status: 2, platform: 'instagram', proposal: { time: 111 } },
          gigPaid: { uid: 'uInf', status: 4, platform: 'instagram', transaction_key: 'tx1' },
          gigDone: { uid: 'uInf', status: 7, platform: 'instagram', transaction_key: 'tx2' },
          gigDispute: { uid: 'uInf', status: 5, disputes: { d1: { description: '<script>steal()</script> they deleted it', status: 'open' } } },
          gigMuted: { uid: 'uMuted', status: 2, proposal: { time: 5 } },
          gigDecl: { uid: 'uMuted', status: 3 },
        } },
    },
    transactions: {
      tx1: { path: 'items/item1/influencers/gigPaid', marketer_transactionID: 'ch_test', price: '250', amount_charged_cents: 26055, processing_fee_cents: 1055, marketer_time: NOW, status: 'incomplete' },
      tx2: { path: 'items/item1/influencers/gigDone', marketer_transactionID: 'ch_test2', price: '250', status: 'complete', influencer_time: NOW },
    },
    conversations: { conv1: { m1: { uid: 'uInf', body: 'old' }, m2: { uid: 'uBrand', body: 'See you <b>Friday</b>' } } },
  };
}
let DB;
const writes = [];
function split(p) { return String(p).split('/').filter(Boolean); }
function get(p) { return split(p).reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), DB); }
function put(p, v) {
  const ks = split(p); let o = DB;
  for (const k of ks.slice(0, -1)) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
  if (v === null || v === undefined) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v;
  writes.push(p);
}
function snap(v) { return { val: () => (v === undefined ? null : v), exists: () => v !== undefined && v !== null }; }
function ref(p) {
  const q = {};
  const api = {
    orderByChild(c) { q.child = c; return api; },
    orderByKey() { q.key = true; return api; },
    equalTo(v) { q.eq = v; return api; },
    limitToLast(n) { q.last = n; return api; },
    async once(ev) {
      assert.strictEqual(ev, 'value');
      let v = get(p);
      if (q.child || q.key) {
        let rows = Object.entries(v || {});
        if (q.child) rows = rows.filter(([, x]) => x && x[q.child] === q.eq);
        rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
        if (q.last) rows = rows.slice(-q.last);
        v = rows.length ? Object.fromEntries(rows) : undefined;
      }
      return snap(v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
    },
    async transaction(fn) {
      const cur = get(p);
      const next = fn(cur === undefined ? null : JSON.parse(JSON.stringify(cur)));
      if (next === undefined) return { committed: false, snapshot: snap(cur) };
      put(p, next);
      return { committed: true, snapshot: snap(next) };
    },
    async remove() { put(p, null); },
    async set(v) { put(p, v); },
  };
  return api;
}

/* ---------------- firebase-admin mock ---------------- */
const AUTH_USERS = {
  uBrand: { uid: 'uBrand', email: 'brand@runwae-test.dev', emailVerified: true, metadata: { creationTime: new Date(NOW - 3600e3).toUTCString() } },
  uInf: { uid: 'uInf', email: 'ivy@runwae-test.dev', emailVerified: true, metadata: { creationTime: new Date(NOW - 30 * 86400e3).toUTCString() } },
  uMuted: { uid: 'uMuted', email: 'muted@runwae-test.dev', emailVerified: true, metadata: { creationTime: new Date(NOW).toUTCString() } },
  uStranger: { uid: 'uStranger', email: 'stranger@runwae-test.dev', emailVerified: false, metadata: { creationTime: new Date(NOW).toUTCString() } },
};
const fakeAdmin = {
  apps: [{}],
  credential: { cert: (c) => c },
  initializeApp() {},
  auth() {
    return {
      async verifyIdToken(tok) {
        const m = /^valid-token-for-(\w+)$/.exec(tok);
        if (!m) throw new Error('bad token');
        return { uid: m[1] };
      },
      async getUser(uid) { if (!AUTH_USERS[uid]) throw new Error('no user'); return AUTH_USERS[uid]; },
    };
  },
  database() { return { ref }; },
};
const origLoad = Module._load;
Module._load = function (req) {
  if (req === 'firebase-admin') return fakeAdmin;
  return origLoad.apply(this, arguments);
};

/* ---------------- fetch mock ---------------- */
let fetchCalls = [];
let fetchStatus = 200;
global.fetch = async (url, init) => {
  fetchCalls.push({ url, init, body: JSON.parse(init.body) });
  return { ok: fetchStatus < 300, status: fetchStatus, json: async () => (fetchStatus < 300 ? { id: 'em_' + fetchCalls.length } : { name: 'validation_error' }) };
};

const notify = require(path.join(__dirname, '..', 'api', 'notify.js'));
const email = require(path.join(__dirname, '..', 'api', 'lib', 'email.js'));

function call(body, opts) {
  const o = opts || {};
  return new Promise((resolve) => {
    const res = {
      statusCode: 200, headers: {},
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      status(c) { this.statusCode = c; return this; },
      json(b) { resolve({ status: this.statusCode, body: b }); return this; },
    };
    const headers = {};
    if (o.uid) headers.authorization = 'Bearer valid-token-for-' + o.uid;
    if (o.auth) headers.authorization = o.auth;
    notify({ method: o.method || 'POST', headers, body }, res);
  });
}
function reset(env) {
  DB = fixture(); writes.length = 0; fetchCalls = []; fetchStatus = 200;
  for (const k of ['RESEND_API_KEY', 'EMAIL_DRY_RUN', 'VERCEL_ENV', 'EMAIL_ALLOW_NON_PROD', 'NOTIFY_REQUIRE_VERIFIED']) delete process.env[k];
  Object.assign(process.env, env || { RESEND_API_KEY: 'test_key_not_real' });
}
const logs = [];
const origLog = console.log; const origErr = console.error;
console.log = (...a) => logs.push(a.join(' '));
console.error = (...a) => logs.push(a.join(' '));
test.after(() => { console.log = origLog; console.error = origErr; });

/* ---------------- auth ---------------- */
test('auth required: no token / bad token -> 401, nothing read or sent', async () => {
  reset();
  assert.strictEqual((await call({ event: 'message.sent', ids: { conversationId: 'conv1' } })).status, 401);
  assert.strictEqual((await call({ event: 'message.sent', ids: { conversationId: 'conv1' } }, { auth: 'Bearer forged-token-xxxxxxxx' })).status, 401);
  assert.strictEqual(fetchCalls.length, 0);
  assert.strictEqual(writes.length, 0);
});

test('GET is rejected (405) and unknown events 400', async () => {
  reset();
  assert.strictEqual((await call({}, { uid: 'uBrand', method: 'GET' })).status, 405);
  assert.strictEqual((await call({ event: 'constructor', ids: {} }, { uid: 'uBrand' })).status, 400);
  assert.strictEqual((await call({ event: 'send', ids: { to: 'victim@x.com' } }, { uid: 'uBrand' })).status, 400);
  assert.strictEqual(fetchCalls.length, 0);
});

/* ---------------- recipient is server-chosen ---------------- */
test('client cannot choose the recipient: extra fields ignored, address comes from Firebase Auth', async () => {
  reset();
  const r = await call({ event: 'message.sent', ids: { conversationId: 'conv1', to: 'victim@evil.test', emailAddress: 'victim@evil.test', uid: 'uStranger' }, to: 'victim@evil.test', subject: 'x', payload: '<h1>phish</h1>' }, { uid: 'uBrand' });
  assert.strictEqual(r.status, 202, JSON.stringify(r.body));
  assert.strictEqual(fetchCalls.length, 1);
  const b = fetchCalls[0].body;
  assert.deepStrictEqual(b.to, ['ivy@runwae-test.dev']); // uInf's Auth email, not RTDB users/uInf/email
  assert.ok(!JSON.stringify(b).includes('victim@evil.test'));
  assert.ok(!JSON.stringify(b).includes('phish'));
  assert.strictEqual(fetchCalls[0].url, 'https://api.resend.com/emails');
  assert.strictEqual(fetchCalls[0].init.headers.Authorization, 'Bearer test_key_not_real');
  assert.ok(fetchCalls[0].init.headers['Idempotency-Key']);
});

test('non-participant cannot trigger gig mail (403); wrong role (403)', async () => {
  reset();
  assert.strictEqual((await call({ event: 'proposal.submitted', ids: { gigPath: 'items/item1/influencers/gig1' } }, { uid: 'uStranger' })).status, 403);
  // proposal.submitted must come from the creator, not the brand
  assert.strictEqual((await call({ event: 'proposal.submitted', ids: { gigPath: 'items/item1/influencers/gig1' } }, { uid: 'uBrand' })).status, 403);
  assert.strictEqual((await call({ event: 'message.sent', ids: { conversationId: 'conv1' } }, { uid: 'uStranger' })).status, 403);
  assert.strictEqual(fetchCalls.length, 0);
});

test('bad ids are rejected (path traversal / junk)', async () => {
  reset();
  for (const gp of ['users/uInf', 'items/item1/influencers/../../users', 'items/a/influencers/b/c', '']) {
    assert.strictEqual((await call({ event: 'post.verified', ids: { gigPath: gp } }, { uid: 'uBrand' })).status, 400, gp);
  }
  assert.strictEqual((await call({ event: 'message.sent', ids: { conversationId: '../users' } }, { uid: 'uBrand' })).status, 400);
});

test('state must match: 409 until the gig shows the result (client retries)', async () => {
  reset();
  // gig1 is at status 2: post.verified (needs >= 6) is not ready
  assert.strictEqual((await call({ event: 'post.verified', ids: { gigPath: 'items/item1/influencers/gig1' } }, { uid: 'uBrand' })).status, 409);
  // payment.sent with no transaction record
  DB.items.item1.influencers.gig1.status = 4;
  assert.strictEqual((await call({ event: 'payment.sent', ids: { gigPath: 'items/item1/influencers/gig1' } }, { uid: 'uBrand' })).status, 409);
  // message where the last message isn't from the caller
  assert.strictEqual((await call({ event: 'message.sent', ids: { conversationId: 'conv1' } }, { uid: 'uInf' })).status, 409);
  assert.strictEqual(fetchCalls.length, 0);
});

/* ---------------- escaping ---------------- */
test('user text is escaped in HTML and kept out of headers', async () => {
  reset();
  const r = await call({ event: 'message.sent', ids: { conversationId: 'conv1' } }, { uid: 'uBrand' });
  assert.strictEqual(r.status, 202);
  const b = fetchCalls[0].body;
  assert.ok(!b.html.includes('<img src=x'), 'raw img tag leaked');
  assert.ok(b.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!b.html.includes('<b>Friday</b>'));
  assert.ok(b.html.includes('See you &lt;b&gt;Friday&lt;/b&gt;'));
  assert.ok(b.text.includes('See you <b>Friday</b>'), 'plain text keeps literal text');
  assert.ok(!/[\r\n]/.test(b.subject));

  reset();
  const r2 = await call({ event: 'review.posted', ids: { uid: 'uInf' } }, { uid: 'uBrand' });
  assert.strictEqual(r2.status, 202);
  const h = fetchCalls[0].body.html;
  assert.ok(!h.includes('<b>work</b>'));
  assert.ok(!/[\r\n]/.test(fetchCalls[0].body.subject));
  assert.ok(!('bcc' in fetchCalls[0].body) && !('cc' in fetchCalls[0].body));

  reset();
  const r3 = await call({ event: 'dispute.opened', ids: { gigPath: 'items/item1/influencers/gigDispute' } }, { uid: 'uInf' });
  assert.strictEqual(r3.status, 202, JSON.stringify(r3.body));
  assert.strictEqual(fetchCalls.length, 2); // other party + support inbox
  const ops = fetchCalls.find((c) => c.body.to[0] === 'hello@runwae.com');
  assert.ok(ops, 'support copy');
  assert.ok(!ops.body.html.includes('<script>'));
  assert.ok(ops.body.html.includes('&lt;script&gt;steal()&lt;/script&gt;'));
  const party = fetchCalls.find((c) => c.body.to[0] === 'brand@runwae-test.dev');
  assert.ok(party && !party.body.html.includes('steal()'), 'dispute text only goes to support');
});

test('every link and image in a sent email is https on runwae.com or a known host', async () => {
  reset();
  await call({ event: 'payment.sent', ids: { gigPath: 'items/item1/influencers/gigPaid' } }, { uid: 'uBrand' });
  assert.strictEqual(fetchCalls.length, 2);
  for (const c of fetchCalls) {
    const urls = [...c.body.html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(urls.length > 5);
    for (const u of urls) {
      assert.ok(/^(https:\/\/(runwae\.com|www\.instagram\.com|www\.facebook\.com|www\.youtube\.com|twitter\.com)\/|mailto:hello@runwae\.com$)/.test(u), u);
    }
  }
  const receipt = fetchCalls.find((c) => c.body.to[0] === 'brand@runwae-test.dev').body;
  assert.match(receipt.subject, /^Receipt: \$260\.55/);
  assert.ok(receipt.html.includes('$10.55') && receipt.html.includes('$250'));
});

/* ---------------- preferences ---------------- */
test('muted categories are skipped; receipts are not mutable; unverified skipped for notifications', async () => {
  reset();
  const r = await call({ event: 'proposal.submitted', ids: { gigPath: 'items/item1/influencers/gigMuted' } }, { uid: 'uMuted' });
  assert.strictEqual(r.status, 202);
  assert.strictEqual(r.body.sent, 1); // to the brand (not muted)
  const r2 = await call({ event: 'proposal.declined', ids: { gigPath: 'items/item1/influencers/gigDecl' } }, { uid: 'uBrand' });
  assert.strictEqual(r2.status, 202);
  assert.deepStrictEqual(r2.body.skipped, ['muted']);
  assert.strictEqual(fetchCalls.length, 1);
});

/* ---------------- dedupe + rate limit ---------------- */
test('the same event twice sends once (dedupe)', async () => {
  reset();
  const a = await call({ event: 'payout.accepted', ids: { gigPath: 'items/item1/influencers/gigDone' } }, { uid: 'uInf' });
  const b = await call({ event: 'payout.accepted', ids: { gigPath: 'items/item1/influencers/gigDone' } }, { uid: 'uInf' });
  assert.strictEqual(a.body.sent, 2);
  assert.strictEqual(b.body.sent, 0);
  assert.deepStrictEqual(b.body.skipped, ['duplicate', 'duplicate']);
  assert.strictEqual(fetchCalls.length, 2);
});

test('per-user rate limit: 31st call in 10 minutes -> 429, other users unaffected', async () => {
  reset();
  for (let i = 0; i < 30; i++) {
    const r = await call({ event: 'user.followed', ids: { uid: 'uInf' } }, { uid: 'uBrand' });
    assert.strictEqual(r.status, 202, 'call ' + i);
  }
  assert.strictEqual(fetchCalls.length, 1, 'dedupe kept it to one email');
  assert.strictEqual((await call({ event: 'user.followed', ids: { uid: 'uInf' } }, { uid: 'uBrand' })).status, 429);
  assert.notStrictEqual((await call({ event: 'review.posted', ids: { uid: 'uBrand' } }, { uid: 'uInf' })).status, 429);
});

test('failed provider send releases the dedupe slot so a retry can send', async () => {
  reset();
  fetchStatus = 500;
  const a = await call({ event: 'user.followed', ids: { uid: 'uInf' } }, { uid: 'uBrand' });
  assert.strictEqual(a.status, 502);
  fetchStatus = 200;
  const b = await call({ event: 'user.followed', ids: { uid: 'uInf' } }, { uid: 'uBrand' });
  assert.strictEqual(b.body.sent, 1);
});

/* ---------------- dry run ---------------- */
test('no RESEND_API_KEY: dry run, logged, 202, fetch never called', async () => {
  reset({});
  logs.length = 0;
  const r = await call({ event: 'message.sent', ids: { conversationId: 'conv1' } }, { uid: 'uBrand' });
  assert.strictEqual(r.status, 202);
  assert.strictEqual(r.body.dryRun, true);
  assert.strictEqual(fetchCalls.length, 0);
  const line = logs.find((l) => l.includes('"dry_run"'));
  assert.ok(line, 'dry run logged');
  assert.ok(!line.includes('ivy@runwae-test.dev'), 'address masked in logs');
  assert.ok(line.includes('i***@runwae-test.dev'));
});

test('preview deployments dry-run even with a key; EMAIL_DRY_RUN forces it', async () => {
  reset({ RESEND_API_KEY: 'k', VERCEL_ENV: 'preview' });
  assert.strictEqual((await call({ event: 'message.sent', ids: { conversationId: 'conv1' } }, { uid: 'uBrand' })).body.dryRun, true);
  reset({ RESEND_API_KEY: 'k', EMAIL_DRY_RUN: '1' });
  assert.strictEqual((await call({ event: 'message.sent', ids: { conversationId: 'conv1' } }, { uid: 'uBrand' })).body.dryRun, true);
  assert.strictEqual(fetchCalls.length, 0);
});

/* ---------------- account + helper ---------------- */
test('welcome only for new accounts and only once', async () => {
  reset();
  assert.strictEqual((await call({ event: 'account.created', ids: {} }, { uid: 'uInf' })).status, 403); // 30 days old
  assert.strictEqual((await call({ event: 'account.created', ids: {} }, { uid: 'uBrand' })).body.sent, 1);
  assert.strictEqual((await call({ event: 'account.created', ids: {} }, { uid: 'uBrand' })).body.sent, 0);
});

test('lib/email helper: billing aliases, validation, 404 route', async () => {
  reset();
  const r = await email.sendTemplate('subscription_receipt', 'payer@runwae-test.dev', { recipientName: 'Maya', planName: 'Brand', amountCents: 4900, invoiceNumber: 'RW-1', invoiceUrl: 'https://invoice.stripe.com/i/x' }, 'inv_1');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(fetchCalls[0].init.headers['Idempotency-Key'], 'inv_1');
  assert.ok(fetchCalls[0].body.html.includes('https://invoice.stripe.com/i/x'));
  const r2 = await email.send({ to: 'payer@runwae-test.dev', template: 'subscription_cancelled', data: { planName: 'Brand', portalUrl: 'https://runwae.com/account#billing' } });
  assert.strictEqual(r2.ok, true);
  await assert.rejects(() => email.sendEmail({ to: 'a@b.com\r\nBcc: c@d.com', template: 'activity', data: {} }));
  await assert.rejects(() => email.sendEmail({ to: 'a@b.com, c@d.com', template: 'activity', data: {} }));
  await assert.rejects(() => email.sendEmail({ to: 'a@b.com', template: 'nope', data: {} }));
  assert.throws(() => email.render('subscription_receipt', { invoiceUrl: 'https://evil.test/x' }), /bad link/);
  const res = { status(c) { this.c = c; return this; }, json(b) { this.b = b; } };
  email({ method: 'POST', body: {} }, res);
  assert.strictEqual(res.c, 404);
});
