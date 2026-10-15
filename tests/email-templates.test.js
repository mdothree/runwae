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
