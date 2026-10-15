/**
 * Every email template renders (sample data AND hostile data), escapes, has a
 * plain-text twin, and only uses absolute https images.
 * Run: node --test tests/email-templates.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const T = require(path.join(__dirname, '..', 'api', 'lib', '_email-templates.js'));
const L = require(path.join(__dirname, '..', 'api', 'lib', '_email-layout.js'));

const EVIL = '<script>alert(1)</script>"\'><img src=x onerror=alert(2)>\r\nBcc: x@evil.test';
function hostile(sample) {
  const walk = (v) => (typeof v === 'string' ? EVIL + v : Array.isArray(v) ? v.map(walk) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, /url|Url/.test(k) ? x : walk(x)])) : v);
  return walk(sample);
}

for (const [name, t] of Object.entries(T)) {
  test(`${name}: renders sample and hostile data safely`, () => {
    assert.ok(['agreements', 'messages', 'activity', 'transactional'].includes(t.category));
    for (const data of [t.sample, hostile(t.sample), {}]) {
      const m = t.render(data);
      assert.ok(m.subject && m.subject.length <= 120, 'subject');
      assert.ok(!/[\r\n]/.test(m.subject), 'subject has no newlines');
      assert.ok(m.html.startsWith('<!DOCTYPE html>'));
      assert.ok(!/<script/i.test(m.html), 'no script tag');
      assert.ok(!/<img src=x/i.test(m.html), 'no injected img');
      assert.ok(!/<[a-z][^>]*\bonerror=/i.test(m.html), 'no live handler');
      assert.ok(m.html.includes('max-width:600px'), '600px container');
      assert.ok(m.html.includes('name="color-scheme" content="light dark"'), 'dark-mode meta');
      assert.ok(m.html.includes('hello@runwae.com'), 'support address in footer');
      assert.ok(/You are getting this|Internal notice/.test(m.html), 'why-you-got-this');
      assert.ok(m.text.length > 80 && m.text.includes('hello@runwae.com'), 'plain text twin');
      // one primary button at most
      assert.ok((m.html.match(/class="rw-btn"/g) || []).length <= 1);
      for (const [, u] of m.html.matchAll(/src="([^"]+)"/g)) assert.match(u, /^https:\/\/runwae\.com\/img\//);
      // accent is the single periwinkle; no other brand purples sneak in
      assert.ok(!/#6259e8|#928bff|#8f87ff/i.test(m.html));
    }
  });
}

test('manage link only on mutable categories', () => {
  for (const [name, t] of Object.entries(T)) {
    const m = t.render(t.sample);
    const has = m.html.includes('Manage email notifications');
    assert.strictEqual(has, t.category !== 'transactional', name);
  }
});

test('assets list is absolute https on runwae.com', () => {
  for (const u of Object.values(L.ASSETS)) assert.match(u, /^https:\/\/runwae\.com\/img\/email\/[a-z-]+\.png$/);
});

test('url() refuses foreign links', () => {
  assert.throws(() => L.url('https://evil.test/'));
  assert.throws(() => L.url('javascript:alert(1)'));
  assert.throws(() => L.url('//evil.test'));
  assert.strictEqual(L.url('/account'), 'https://runwae.com/account');
  assert.strictEqual(L.url('https://runwae.com/account#billing'), 'https://runwae.com/account#billing');
  assert.strictEqual(L.url('https://billing.stripe.com/p/session/x'), 'https://billing.stripe.com/p/session/x');
});

/* ---------------- verifier items, 2026-10-14 ---------------- */
const GIG_TEMPLATES = ['gig_proposal_requested', 'gig_proposal_received', 'gig_proposal_declined', 'gig_proposal_accepted',
  'gig_payment_receipt', 'gig_post_submitted', 'gig_post_verified', 'gig_payout_sent', 'gig_complete', 'gig_dispute'];
const hrefOfButton = (html) => (/<a class="rw-btn" href="([^"]+)"/.exec(html) || [])[1];
function withDeepLinks(on, fn) {
  const prev = process.env.RUNWAE_EMAIL_DEEP_LINKS;
  if (on) process.env.RUNWAE_EMAIL_DEEP_LINKS = '1'; else delete process.env.RUNWAE_EMAIL_DEEP_LINKS;
  try { return fn(); } finally { if (prev === undefined) delete process.env.RUNWAE_EMAIL_DEEP_LINKS; else process.env.RUNWAE_EMAIL_DEEP_LINKS = prev; }
}

test('plan names match plans.html ("Brand plan", "Creator membership")', () => {
  const subs = ['subscription_welcome', 'subscription_receipt', 'subscription_payment_failed', 'subscription_cancelled'];
  for (const name of subs) {
    for (const [given, want, other] of [['Brand', 'Brand plan', 'Creator membership'], ['Creator', 'Creator membership', 'Brand plan'],
      ['Runwae Brand plan', 'Brand plan', 'Creator'], ['brand', 'Brand plan', 'Creator']]) {
      const m = T[name].render(Object.assign({}, T[name].sample, { planName: given }));
      const all = m.subject + m.html + m.text;
      assert.ok(all.includes(want), `${name} ${given}`);
      assert.ok(!all.includes(other), `${name} ${given} mentions ${other}`);
      assert.ok(!/Plan<\/td>\s*<td[^>]*>(Brand|Creator)<\/td>/.test(m.html), `${name}: bare plan name in the Plan row`);
      assert.ok(!/\bplan plan\b|membership plan|Runwae Runwae/i.test(all), `${name}: doubled word`);
    }
    const t = T[name].render(Object.assign({}, T[name].sample, { planName: undefined, planTier: 'creator' }));
    assert.ok(t.html.includes('Creator membership'), `${name} planTier`);
    const u = T[name].render(Object.assign({}, T[name].sample, { planName: 'Runwae' })); // webhook fallback
    assert.ok(/subscription/i.test(u.subject + u.text) && !/Runwae Runwae/.test(u.subject + u.html), `${name} unknown plan`);
  }
});

test('eyebrow is ink text with a periwinkle marker (WCAG AA), never accent-coloured text', () => {
  const m = T.gig_proposal_requested.render(T.gig_proposal_requested.sample);
  const eb = /<p class="rw-ink"[^>]*>(<span aria-hidden="true"[^>]*background:#9389ff[^>]*>&nbsp;<\/span>)Agreement/.exec(m.html);
  assert.ok(eb, 'eyebrow with dot marker');
  assert.ok(/<p class="rw-ink" style="[^"]*color:#000000;[^"]*">\s*<span/.test(m.html), 'ink eyebrow text');
  for (const [, t] of Object.entries(T)) {
    const h = t.render(t.sample).html;
    assert.ok(!/(^|[;"])color:#9389ff/i.test(h), 'no periwinkle text anywhere');
  }
});

test('footer social row matches the site footer: Facebook, Instagram, YouTube, Twitter (bird)', () => {
  const h = T.activity.render(T.activity.sample).html;
  const alts = [...h.matchAll(/<img src="https:\/\/runwae\.com\/img\/email\/(facebook|instagram|youtube|twitter|x)\.png"[^>]*alt="([^"]+)"/g)].map((x) => x[1]);
  assert.deepStrictEqual(alts, ['facebook', 'instagram', 'youtube', 'twitter']);
  assert.ok(h.includes('alt="Runwae on Twitter"') && !/\bX \(Twitter\)|email\/x\.png/.test(h));
});

test('style guide: one black pill button (500 weight, 44px), muted small text 14px, no red outside destructive copy', () => {
  for (const [name, t] of Object.entries(T)) {
    const h = t.render(t.sample).html;
    if (h.includes('class="rw-btn"')) {
      assert.ok(/class="rw-btn" href="[^"]+" style="[^"]*background:#000000;color:#ffffff;[^"]*border-radius:999px;[^"]*font-weight:500;/.test(h), name);
    }
    assert.ok(!/#c62f2f/i.test(h.replace(/<style>[\s\S]*?<\/style>/, '')), `${name}: danger red used`);
    assert.ok(!/font-size:1[23]px/.test(h.replace(/<style>[\s\S]*?<\/style>/, '').replace(/font-size:13px;line-height:1\.3;letter-spacing:\.08em/, '')), `${name}: text below the 14px small size`);
  }
});

test('agreement buttons: /notifications until deep links are live, then the exact agreement', () => {
  const gigPath = 'items/-Nx1_a/influencers/-Nx2-b';
  for (const name of GIG_TEMPLATES) {
    const d = Object.assign({}, T[name].sample, { gigPath });
    withDeepLinks(false, () => assert.strictEqual(hrefOfButton(T[name].render(d).html), 'https://runwae.com/notifications', name));
    withDeepLinks(true, () => {
      assert.strictEqual(hrefOfButton(T[name].render(d).html), 'https://runwae.com/gig?item=-Nx1_a&amp;gig=-Nx2-b', name);
      assert.ok(T[name].render(d).text.includes('https://runwae.com/gig?item=-Nx1_a&gig=-Nx2-b'), `${name} text`);
      // a bad or missing path never becomes a link
      for (const bad of [undefined, 'items/x/influencers/y/z', 'items/../x/influencers/y', 'users/u1']) {
        assert.strictEqual(hrefOfButton(T[name].render(Object.assign({}, d, { gigPath: bad })).html), 'https://runwae.com/notifications', `${name} ${bad}`);
      }
    });
  }
});

test('review email: own profile via /profile?me once live; until then no ambiguous /profile link', () => {
  const t = T.review_new;
  withDeepLinks(false, () => {
    const h = t.render(t.sample).html;
    assert.strictEqual(hrefOfButton(h), 'https://runwae.com/notifications');
    assert.ok(!h.includes('runwae.com/profile"'));
  });
  withDeepLinks(true, () => {
    const h = t.render(t.sample).html;
    assert.strictEqual(hrefOfButton(h), 'https://runwae.com/profile?me');
    assert.ok(h.includes('See your profile'));
  });
});
