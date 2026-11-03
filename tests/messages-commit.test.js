/**
 * Draft must be cleared only after the database acknowledges the message write.
 *   node --test tests/messages-commit.test.js
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function setup() {
  const ta = { val: 'hello there' };
  const writes = []; const emails = []; const alerts = [];
  const mkRef = () => {
    const ref = {
      child: () => ref, update: () => {}, once: () => {},
      push: () => ({ key: 'k1', set: (v, cb) => writes.push({ v, cb }) }),
    };
    return ref;
  };
  const $ = (sel) => (sel === 'textarea#messageInput'
    ? { val: (x) => { if (x === undefined) return ta.val; ta.val = x; } }
    : { click() {}, text() {}, attr() {} });
  const ctx = {
    $, database: { ref: mkRef }, sendEmail: (...a) => emails.push(a), alert: (m) => alerts.push(m),
    firebase: { auth: () => ({ onAuthStateChanged() {} }) }, window: { location: { href: '' } },
    updateUnreadMessagesCount() {}, displayConversations() {}, displayConversation() {}, Date,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'unobfrunwaejs', 'messagesHQ.js'), 'utf8'), ctx);
  const me = { key: 'u1', val: () => ({ name: 'Me Self' }) };
  const them = { key: 'u2', val: () => ({ name: 'Bo Peep', email: 'b@x.test' }) };
  return { ta, writes, emails, alerts, send: () => ctx.write(me, them, 'c1') };
}

test('draft is kept until the message write is acknowledged', () => {
  const t = setup();
  t.send();
  assert.strictEqual(t.writes.length, 1);
  assert.strictEqual(t.ta.val, 'hello there', 'draft must not clear before ack');
  assert.strictEqual(t.emails.length, 0);
  t.writes[0].cb(null);
  assert.strictEqual(t.ta.val, '');
  assert.strictEqual(t.emails.length, 1);
  assert.ok(String(t.emails[0][2][1]).includes('hello there'), 'email body carries the sent text');
});

test('failed write keeps the draft, sends no email, and tells the user', () => {
  const t = setup();
  t.send();
  t.writes[0].cb(new Error('PERMISSION_DENIED'));
  assert.strictEqual(t.ta.val, 'hello there');
  assert.strictEqual(t.emails.length, 0);
  assert.strictEqual(t.alerts.length, 1);
});
