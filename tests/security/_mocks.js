/**
 * Mocks for the payment API security tests: in-memory firebase-admin RTDB,
 * Stripe and Anthropic. No network, no credentials. Refuses to run if a live
 * Stripe key is anywhere in the environment.
 * (Derived from the swarm-sec api-probe.test.js, 2026-10-14.)
 */
'use strict';
const LIVE = /^(sk|rk)_live_/;
if (Object.values(process.env).some((v) => LIVE.test(String(v || '')))) {
  console.error('live Stripe key in env, refusing'); process.exit(3);
}
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.ANTHROPIC_API_KEY = 'mock';
process.env.RUNWAE_OAUTH_STATE_SECRET = process.env.RUNWAE_OAUTH_STATE_SECRET || 'test-state-secret-0123456789abcdef';

const Module = require('module');
const path = require('path');
const RW = process.env.RW || path.join(__dirname, '..', '..');

function makeDb(initial) {
  let tree = JSON.parse(JSON.stringify(initial || {}));
  let pushN = 0;
  const parts = (p) => String(p || '').split('/').filter(Boolean);
  const get = (p) => parts(p).reduce((n, k) => (n && typeof n === 'object' ? n[k] : undefined), tree);
  const setAt = (p, v) => {
    const ks = parts(p);
    if (!ks.length) { tree = v == null ? {} : JSON.parse(JSON.stringify(v)); return; }
    let n = tree;
    for (let i = 0; i < ks.length - 1; i++) { if (!n[ks[i]] || typeof n[ks[i]] !== 'object') n[ks[i]] = {}; n = n[ks[i]]; }
    if (v == null) delete n[ks[ks.length - 1]]; else n[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v));
  };
  const snap = (p, v) => ({
    val: () => (v === undefined ? null : JSON.parse(JSON.stringify(v))),
    exists: () => v !== undefined && v !== null,
    key: parts(p).pop() || null,
  });
  function ref(p) {
    const base = parts(p).join('/');
    const join = (c) => [base, ...parts(c)].filter(Boolean).join('/');
    return {
      key: parts(base).pop() || null,
      child: (c) => ref(join(c)),
      once: async () => snap(base, get(base)),
      set: async (v) => setAt(base, v),
      remove: async () => setAt(base, null),
      update: async (obj) => { for (const [k, v] of Object.entries(obj)) setAt(join(k), v); },
      push: () => ref(join('k' + (++pushN))),
      transaction: async (fn) => {
        const cur = get(base);
        const next = fn(cur === undefined ? null : JSON.parse(JSON.stringify(cur)));
        if (next === undefined) return { committed: false, snapshot: snap(base, cur) };
        setAt(base, next);
        return { committed: true, snapshot: snap(base, next) };
      },
    };
  }
  return { ref, get, dump: () => tree };
}

const state = { db: makeDb({}), calls: [], oauthAcct: 'acct_new', chargeError: null, authTime: () => Math.floor(Date.now() / 1000) };
const adminMock = {
  apps: [1],
  initializeApp: () => ({}),
  credential: { cert: () => ({}) },
  database: () => state.db,
  auth: () => ({
    verifyIdToken: async (t) => {
      if (!/^tok_/.test(t)) throw new Error('bad token');
      const u = t.slice(4).replace(/_+pad$/, '');
      return { uid: u, email: u + '@example.test', auth_time: state.authTime(u) };
    },
    getUser: async (uid) => ({ uid, email: uid + '@example.test', emailVerified: true }),
  }),
};
const stripeMock = {
  charges: { create: async (o) => { state.calls.push(['charge', o.amount]); if (state.chargeError) throw state.chargeError; return { id: 'ch_mock' }; } },
  transfers: { create: async (o) => { state.calls.push(['transfer', o.amount, o.destination]); return { id: 'tr_mock' }; } },
  oauth: { token: async ({ code }) => { state.calls.push(['oauth', code]); return { stripe_user_id: state.oauthAcct }; } },
};
class AnthropicMock { constructor() { this.messages = { create: async () => ({ content: [{ type: 'text', text: 'mock' }] }) }; } }

const origLoad = Module._load;
Module._load = function (req) {
  if (req === 'firebase-admin') return adminMock;
  if (req === 'stripe') return function () { return stripeMock; };
  if (req === '@anthropic-ai/sdk') return AnthropicMock;
  if (/lib\/stripe$/.test(req)) return stripeMock;
  if (/lib\/firebase$/.test(req)) return adminMock;
  return origLoad.apply(this, arguments);
};
const load = (p) => require(path.join(RW, p));

function call(handler, { method = 'POST', uid, body, headers = {}, query = {} }) {
  return new Promise((resolve) => {
    const res = {
      _h: {}, statusCode: 200,
      setHeader(k, v) { this._h[k.toLowerCase()] = v; }, getHeader(k) { return this._h[k.toLowerCase()]; },
      status(c) { this.statusCode = c; return this; },
      json(o) { resolve({ status: this.statusCode, body: o, headers: this._h }); return this; },
      end() { resolve({ status: this.statusCode, body: null, headers: this._h }); return this; },
    };
    const req = { method, body, query, headers: Object.assign(uid ? { authorization: 'Bearer tok_' + uid + '_______pad' } : {}, headers) };
    Promise.resolve(handler(req, res)).catch((e) => resolve({ status: 'threw', body: String(e && e.stack || e) }));
  });
}

const GIG = 'items/it1/influencers/g1';
function seed(gigStatus, opts) {
  opts = opts || {};
  const gig = Object.assign({ uid: 'uCreator', status: gigStatus, platform: 'instagram' }, opts.gig || {});
  state.db = makeDb(Object.assign({
    users: { uBrand: { role: 'marketer', name: 'Brand' }, uCreator: { role: 'influencer', name: 'Creator' }, uEve: { role: 'influencer', name: 'Eve' } },
    items: { it1: { uid: 'uBrand', price: '500', compensation: opts.compensation || 'money', status: 'active', time: 1, caption: 'c', influencers: { g1: gig } } },
    stripe_accounts: opts.noAccount ? {} : { uCreator: { stripe_user_id: 'acct_creator' } },
  }, opts.extra || {}));
  state.calls.length = 0;
  state.oauthAcct = 'acct_new';
  state.chargeError = null;
  state.authTime = () => Math.floor(Date.now() / 1000);
}

module.exports = { RW, state, load, call, seed, GIG, makeDb };
