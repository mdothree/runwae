/**
 * RTDB rules regression probe (RW-SEC-01/03 + the 2026-10-14 audit probes).
 * LOCAL EMULATOR ONLY (project demo-runwae). Run on xps:
 *   firebase emulators:exec --only database --project demo-runwae \
 *     "node tests/security/rules-probe.js <rules.json> <phase1|phase2> [--json out.json]"
 *
 * phase1 = data as it is today (private fields still under users/{uid}); used for
 *          the deployed-today rules and the new phase-1 rules (before MIGRATE).
 * phase2 = data after MIGRATE (private fields only under users_private/{uid})
 *          with database.rules.phase2.json.
 *
 * Lines:  VULN = attack succeeded (write 200, or a read returned private data)
 *         ok   = attack blocked
 *         CTRL = legitimate flow allowed     CTRL-FAIL = legitimate flow BLOCKED (regression)
 * Exit code 1 if any CTRL-FAIL. (Derived from swarm-sec rules-probe.js.)
 */
'use strict';
const fs = require('fs');
const HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
if (!HOST || !/^(127\.0\.0\.1|localhost):\d+$/.test(HOST)) { console.error('Refusing: not a local emulator'); process.exit(2); }
const NS = 'demo-runwae';
const RULES = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const PHASE = process.argv[3] || 'phase1';
const jsonOut = process.argv.indexOf('--json') > 0 ? process.argv[process.argv.indexOf('--json') + 1] : null;

async function call(method, p, body, uid, opts = {}) {
  let url = `http://${HOST}/${p}.json?ns=${NS}`;
  if (uid === 'ANON') url += '&auth_variable_override=null';
  else if (uid) url += '&auth_variable_override=' + encodeURIComponent(JSON.stringify({ uid, token: { email_verified: !!opts.ev } }));
  const r = await fetch(url, { method, headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  return { status: r.status, text };
}
const admin = (m, p, b) => call(m, p, b, null);
const as = (uid, opts) => (m, p, b) => call(m, p, b, uid, opts);
const brand = as('uBrand'), creator = as('uCreator'), eve = as('uEve'), anon = as('ANON'), newbie = as('uNew');
const out = [];
const results = [];
let vulns = 0, ctrlFail = 0;
const exposed = (r) => r.status === 200 && r.text !== 'null' && r.text !== '""' && r.text !== '{}';

async function probe(id, name, resP, kind = 'attack', show) {
  const r = await resP;
  let tag, bad;
  if (kind === 'attack') { bad = r.status === 200; tag = bad ? 'VULN' : 'ok  '; if (bad) vulns++; }
  else if (kind === 'read') { bad = exposed(r); tag = bad ? 'VULN' : 'ok  '; if (bad) vulns++; }
  else { bad = r.status !== 200; tag = bad ? 'CTRL-FAIL' : 'CTRL'; if (bad) ctrlFail++; }
  let line = `${tag} [${id}] ${name} -> HTTP ${r.status}`;
  if (show && r.status === 200) line += `  body=${show(r.text)}`;
  if (tag === 'CTRL-FAIL') line += `  ${r.text.slice(0, 120)}`;
  out.push(line);
  results.push({ id, name, tag: tag.trim(), status: r.status });
  return r;
}
const seq = async (...ps) => { let last; for (const p of ps) last = await p(); return last; };

const legacyPrivate = (uid, partner) => PHASE === 'phase1' ? {
  email: uid.toLowerCase().slice(1) + '@example.test', email_prefs: { messages: true },
  conversations: { cBC: { uid: partner, read_or_unread: 'read' } }, transactions: { tx1: { path: 'items/it1/influencers/g1', time: 1 } },
  notifications: { n0: { uid: partner, action: 'followed', read_or_unread: 'unread', time: 1 } },
} : {};
const privateRec = (uid, partner) => PHASE === 'phase2' ? {
  email: uid.toLowerCase().slice(1) + '@example.test', email_prefs: { messages: true },
  conversations: { cBC: { uid: partner, read_or_unread: 'read' } }, transactions: { tx1: { path: 'items/it1/influencers/g1', time: 1 } },
  notifications: { n0: { uid: partner, action: 'followed', read_or_unread: 'unread', time: 1 } },
} : undefined;

(async () => {
  const lr = await fetch(`http://${HOST}/.settings/rules.json?ns=${NS}`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: JSON.stringify(RULES) });
  if (lr.status !== 200) throw new Error('rules load ' + lr.status + ' ' + await lr.text());
  const seedAll = () => admin('PUT', '', {
    users: {
      uBrand: Object.assign({ role: 'marketer', name: 'Brand', username: 'brand', verified: false, followers_count: 3 }, legacyPrivate('uBrand', 'uCreator')),
      uCreator: Object.assign({ role: 'influencer', name: 'Creator', username: 'creator' }, legacyPrivate('uCreator', 'uBrand')),
      uEve: Object.assign({ role: 'influencer', name: 'Eve', username: 'eve' }, PHASE === 'phase1' ? { email: 'eve@example.test' } : {}),
    },
    users_private: PHASE === 'phase2' ? { uBrand: privateRec('uBrand', 'uCreator'), uCreator: privateRec('uCreator', 'uBrand'), uEve: { email: 'eve@example.test' } } : {},
    items: {
      it1: { uid: 'uBrand', caption: 'campaign', time: 1, status: 'active', price: '500', compensation: 'money',
        influencers: { g1: { uid: 'uCreator', status: 4, platform: 'instagram', transaction_key: 'tx1', ledger: { l1: { time: 1, type: 'payment submitted', event: 'Marketer paid $500' } } } },
        interests: { i1: { uid: 'uCreator', time: 1 } } },
      itG: { uid: 'uBrand', caption: 'gift campaign', time: 1, status: 'active', price: '0', compensation: 'gift', influencers: '' },
    },
    conversations: { cBC: { m1: { uid: 'uBrand', body: 'private deal terms', time: 1 } } },
    transactions: { tx1: { path: 'items/it1/influencers/g1', status: 'incomplete', price: '500', marketerID: 'uBrand', influencerID: 'uCreator', marketer_transactionID: 'ch_test' } },
    gig_verifications: {}, oauth_states: { uCreator: { h: 'ab', exp: 9e15 } },
  });
  await seedAll();
  const redactEmails = (t) => (t.match(/[a-z]+@example\.test/g) || []).join(',') || '(no emails)';
  const G1 = 'items/it1/influencers/g1';

  // ======================= audit probes (unchanged ids) =======================
  await probe('R1', 'Eve bulk-reads /users: emails exposed?', (async () => {
    const r = await eve('GET', 'users');
    return { status: r.status === 200 && !/@example\.test/.test(r.text) ? 401 : r.status, text: r.text }; // VULN only if emails come back
  })(), 'attack', redactEmails);
  await probe('R2', "Eve reads Brand's email", eve('GET', 'users/uBrand/email'), 'read', (t) => t);
  await probe('R3', "Eve reads Brand's email_prefs", eve('GET', 'users/uBrand/email_prefs'), 'read');
  await probe('R4', "Eve reads Brand's conversation index", eve('GET', 'users/uBrand/conversations'), 'read', (t) => t);
  await probe('R5', "Eve reads Brand's transactions index", eve('GET', 'users/uBrand/transactions'), 'read', (t) => t);
  await probe('R6', 'Eve reads a conversation she is not in', eve('GET', 'conversations/cBC'));
  await probe('R7', 'Eve reads transactions/tx1 (not a party)', eve('GET', 'transactions/tx1'));
  await probe('R8', 'Eve lists /transactions', eve('GET', 'transactions'));
  await probe('R9', 'Eve lists /disputes', eve('GET', 'disputes'));
  await probe('R10', 'Eve reads stripe_accounts/uCreator', eve('GET', 'stripe_accounts/uCreator'));
  await probe('R11', 'Eve reads plans/uBrand', eve('GET', 'plans/uBrand'));
  await probe('R12', 'Eve hijacks cBC: overwrite users/uBrand/conversations/cBC.uid=uEve', eve('PATCH', 'users/uBrand/conversations/cBC', { uid: 'uEve', read_or_unread: 'unread' }));
  await probe('C1', 'control: Creator (party) reads transactions/tx1', creator('GET', 'transactions/tx1'), 'ctrl');
  await probe('C2', 'control: Creator (participant) reads conversations/cBC', creator('GET', 'conversations/cBC'), 'ctrl');

  await probe('W1', 'Creator sets own gig status 4 -> 6 ("post verified") without marketer', creator('PATCH', G1, { status: 6 }));
  await probe('W2', 'Creator sets own gig status -> 7 (complete)', creator('PATCH', G1, { status: 7 }));
  await probe('W3', 'Creator writes gig transaction_key', creator('PATCH', G1, { transaction_key: 'txFORGED' }));
  await probe('W4', 'Creator deletes gig transaction_key (delete skips .validate)', creator('DELETE', G1 + '/transaction_key'));
  await admin('PATCH', G1, { transaction_key: 'tx1', status: 4 });
  await probe('W5', 'Creator rewrites gig uid to Eve', creator('PATCH', G1, { uid: 'uEve' }));
  await probe('W6', 'Eve (not on gig) sets gig status', eve('PATCH', G1, { status: 6 }));
  await probe('W7', 'Eve creates a gig for herself on Brand item', eve('PUT', 'items/it1/influencers/gEve', { uid: 'uEve', status: 6 }));
  await probe('W8', '[P3 RW-SEC-12, out of scope] Brand rewrites item price after charge', brand('PATCH', 'items/it1', { price: '1' }));
  await admin('PATCH', 'items/it1', { price: '500' });
  await probe('W9', 'Brand deletes paid gig g1 and recreates it for Eve', (async () => {
    await brand('DELETE', G1);
    return brand('PUT', G1, { uid: 'uEve', status: 0 });
  })());
  await admin('PUT', G1, { uid: 'uCreator', status: 4, platform: 'instagram', transaction_key: 'tx1', ledger: { l1: { time: 1, type: 'payment submitted', event: 'Marketer paid $500' } } });
  await probe('W10', 'Creator writes transactions/tx1 status complete', creator('PATCH', 'transactions/tx1', { status: 'complete' }));
  await probe('W11', 'Creator writes stripe_accounts/uCreator', creator('PUT', 'stripe_accounts/uCreator', { stripe_user_id: 'acct_x' }));

  await probe('P1', '[P2 RW-SEC-04] Eve writes fake 5-star review into her own reviews_received', eve('PUT', 'users/uEve/reviews_received/r1', { uid: 'uBrand', time: 1, rating: 5, body: 'Best' }));
  await probe('P2', '[P2 RW-SEC-04] Eve adds fake followers to herself', eve('PUT', 'users/uEve/followers/f1', { uid: 'uBrand', time: 1 }));
  await probe('P3', "[P2 RW-SEC-04] Eve sets Brand's followers_count to 0", eve('PUT', 'users/uBrand/followers_count', 0));
  await probe('P4', '[P2 RW-SEC-04] Eve sets her own counts to 9,999,999', eve('PATCH', 'users/uEve', { reviews_received_count: 9999999, gigs_count: 9999999 }));
  await probe('P5', "[P2 RW-SEC-04] Eve sets Brand item's interests_count", eve('PUT', 'items/it1/interests_count', 9999999));
  await probe('P6', 'Eve sets verified=true', eve('PUT', 'users/uEve/verified', true));
  await probe('P7', 'Eve sets email_verified=true with unverified token', eve('PUT', 'users/uEve/email_verified', true));
  await probe('P8', 'Eve switches role directly', eve('PUT', 'users/uEve/role', 'marketer'));
  await probe('P9', '[P2 RW-SEC-05] Eve switches role via DELETE then PUT', seq(() => eve('DELETE', 'users/uEve/role'), () => eve('PUT', 'users/uEve/role', 'marketer')));
  await admin('PUT', 'users/uEve/role', 'influencer');
  await probe('P10', 'Eve writes users/uEve/plan', eve('PUT', 'users/uEve/plan', { status: 'active' }));
  await probe('P11', '[P2 RW-SEC-04] Eve reviews Brand with no gig, rating "999"', eve('PUT', 'users/uBrand/reviews_received/rE', { uid: 'uEve', time: 1, rating: '999', body: 'scam' }));
  await probe('P12', '[P3 RW-SEC-11] Eve injects a notification into Brand (legacy path)', eve('PUT', 'users/uBrand/notifications/nE', { uid: 'uEve', action: '<img src=x onerror=alert(1)>', read_or_unread: 'unread', time: 1 }));
  await probe('P13', '[P2 RW-SEC-08] Eve sets her own current_gig', eve('PUT', 'users/uEve/current_gig', G1));

  await probe('I1', 'Brand forges an interest with uid=Eve on own item', brand('PUT', 'items/it1/interests/iF', { uid: 'uEve', time: 1 }));
  await probe('I2', 'Brand forges a comment from Eve on own item', brand('PUT', 'items/it1/comments/cF', { uid: 'uEve', time: 1, comment: 'I love this brand' }));
  await probe('I3', 'Eve writes an interest with uid=Creator', eve('PUT', 'items/it1/interests/iX', { uid: 'uCreator', time: 1 }));
  await probe('I4', "Eve deletes Creator's interest", eve('DELETE', 'items/it1/interests/i1'));
  await probe('I5', 'Eve writes activity as Brand', eve('PUT', 'activity/aX', { actorID: 'uBrand', action: 'x', time: 1 }));
  await probe('I6', '[P3] Eve writes activity with arbitrary action text', eve('PUT', 'activity/aE', { actorID: 'uEve', action: '<svg onload=alert(1)>', time: 1 }));
  await probe('I7', 'Eve files a dispute on a gig she is not party to', eve('PUT', 'disputes/dX', { marketerID: 'uBrand', influencerID: 'uEve', path: G1, time: 1 }));

  await probe('U1', 'anonymous reads /users', anon('GET', 'users'));
  await probe('U2', '[P3 RW-SEC-09] anonymous writes subscriptions', anon('PUT', 'subscriptions/s1', { email: 'victim@example.test', time: 1 }));
  await probe('U3', '[P3 RW-SEC-09] anonymous writes guides lead', anon('PUT', 'guides/g1', { email: 'victim@example.test', time: 1, type: 'marketer' }));
  await probe('U4', '[P3 RW-SEC-09] anonymous creates analytics/visitingPages keys', anon('PUT', 'analytics/visitingPages/junk' + Date.now(), { host: 'attacker.example', visits: 1 }));
  await probe('U5', '[P3 RW-SEC-09] anonymous increments analytics hits', anon('PUT', 'analytics/pages/profile/hits', 1));
  await probe('U6', 'anonymous reads subscriptions', anon('GET', 'subscriptions'));

  // ======================= new attacks (this fix) =======================
  await seedAll();
  await probe('N1', 'Creator PUTs status 6 on the status path (4 -> 6)', creator('PUT', G1 + '/status', 6));
  await admin('PUT', G1 + '/status', 5);
  await probe('N2', 'Creator sets status 5 -> 6', creator('PUT', G1 + '/status', 6));
  await probe('N3', 'Creator sets status 5 -> 7', creator('PUT', G1 + '/status', 7));
  await probe('N4', 'Brand sets status 5 -> 6 without verify-post (client write)', brand('PUT', G1 + '/status', 6));
  await admin('PUT', G1 + '/status', 2); await admin('DELETE', G1 + '/transaction_key');
  await probe('N5', 'Brand marks an UNPAID money gig paid (2 -> 4)', brand('PUT', G1 + '/status', 4));
  await admin('PATCH', G1, { status: 6, transaction_key: 'tx1' });
  await probe('N6', 'Brand sets 6 -> 7 (payout accepted)', brand('PUT', G1 + '/status', 7));
  await probe('N7', 'Creator sets 6 -> 7 (payout accepted) by client', creator('PUT', G1 + '/status', 7));
  await probe('N8', 'Creator writes status as string "6"', creator('PUT', G1 + '/status', '6'));
  await probe('N9', 'Creator forges gig_verifications record', creator('PUT', 'gig_verifications/it1/g1', { by: 'uBrand', time: 1 }));
  await probe('N10', 'Brand writes gig_verifications record directly', brand('PUT', 'gig_verifications/it1/g1', { by: 'uBrand', time: 1 }));
  await probe('N11', 'Creator reads gig_verifications', creator('GET', 'gig_verifications'));
  await probe('N12', 'Creator writes oauth_states (forge a Connect state)', creator('PUT', 'oauth_states/uCreator', { h: 'x', exp: 9e15 }));
  await probe('N13', 'Creator reads oauth_states', creator('GET', 'oauth_states/uCreator'));
  await probe('N14', 'Eve reads users_private/uBrand', eve('GET', 'users_private/uBrand'));
  await probe('N15', 'Eve lists users_private', eve('GET', 'users_private'));
  await probe('N16', "Eve hijacks Brand's private conversation index entry cBC", eve('PATCH', 'users_private/uBrand/conversations/cBC', { uid: 'uEve', read_or_unread: 'unread' }));
  await admin('PUT', 'users_private/uBrand/conversations/cBP', { uid: 'uCreator', read_or_unread: 'read' });
  await probe('N36', "Eve shadows Brand's PRIVATE index entry cBP with a legacy users/ entry", eve('PUT', 'users/uBrand/conversations/cBP', { uid: 'uEve', read_or_unread: 'unread' }));
  await probe('N37', 'Eve then reads conversation cBC/cBP via forged indexes', seq(
    () => eve('PUT', 'users_private/uEve/conversations/cBC', { uid: 'uBrand', read_or_unread: 'read' }),
    () => eve('PUT', 'users_private/uEve/conversations/cBP', { uid: 'uBrand', read_or_unread: 'read' }),
    async () => { const a = await eve('GET', 'conversations/cBC'); const b = await eve('GET', 'conversations/cBP'); return a.status === 200 ? a : b; }));
  await probe('N17', "Eve writes a transactions index entry into Brand's private record", eve('PUT', 'users_private/uBrand/transactions/txE', { path: G1, time: 1 }));
  await probe('N18', 'Owner forges own private transactions index (server-only)', creator('PUT', 'users_private/uCreator/transactions/txF', { path: G1, time: 1 }));
  await probe('N19', 'Brand rewrites the proposal at status 6', brand('PATCH', G1 + '/proposal', { caption: 'forged' }));
  await probe('N20', 'Creator rewrites the proposal after payment (status 6)', creator('PATCH', G1 + '/proposal', { caption: 'changed' }));
  await probe('N21', 'Brand overwrites an existing ledger entry', brand('PUT', G1 + '/ledger/l1', { time: 2, type: 'x', event: 'rewritten' }));
  await probe('N22', 'Creator writes a 600-char ledger event', creator('PUT', G1 + '/ledger/lBig', { time: 2, type: 'x', event: 'a'.repeat(600) }));
  await probe('N23', 'Brand sets tracking_number on a MONEY gig', brand('PUT', G1 + '/tracking_number', '1Z'));
  await probe('N24', 'Creator deletes the paid gig', creator('DELETE', G1));
  await probe('N25', 'Brand replaces the whole item (PUT items/it1, drops influencers)', brand('PUT', 'items/it1', { uid: 'uBrand', caption: 'x', status: 'active' }));
  await probe('N26', 'Brand overwrites influencers via an item update', brand('PATCH', 'items/it1', { influencers: { g1: { uid: 'uEve', status: 6 } } }));
  await probe('N27', 'Creator adds an unknown field to the gig', creator('PATCH', G1, { payout_override: 'acct_x' }));
  await probe('N28', 'Eve creates an item owned by Brand', eve('PUT', 'items/itE', { uid: 'uBrand', caption: 'x' }));
  await probe('N29', "Eve writes a field on Brand's item", eve('PUT', 'items/it1/caption', 'pwned'));
  await admin('PUT', G1 + '/status', 1);
  await probe('N30', 'Creator submits proposal with a javascript: photo_url', creator('PATCH', G1 + '/proposal', { caption: 'c', photo_url: 'javascript:alert(1)', time: 1 }));
  await probe('N31', 'Brand pre-fills the proposal at status 1', brand('PATCH', G1 + '/proposal', { caption: 'forged', photo_url: false, time: 1 }));
  await probe('N32', 'Eve reads Brand private notifications', eve('GET', 'users_private/uBrand/notifications'));

  // ======================= legitimate flows (must stay allowed) =======================
  await seedAll();
  const now = Date.now();
  // --- item lifecycle (writePost / caption / deactivate) ---
  await probe('L1', 'Brand creates an item (writePost update, all fields)', brand('PATCH', 'items/itNew', {
    caption: 'new', time: now, media_type: 'image', duration: 7, photo_url: 'https://x/y.png', video_url: '', interests: '', influencers: '', shares: '', comments: '',
    uid: 'uBrand', compensation: 'money', gift_method: '', price: '250', gift_description: '', interests_count: 0, gigs_count: 0, shares_count: 0, comments_count: 0,
    status: 'active', instagram: true, twitter: false, facebook: false, linkedin: false }), 'ctrl');
  await probe('L2', 'Brand edits caption / deactivates own item', seq(() => brand('PATCH', 'items/itNew', { caption: 'edited' }), () => brand('PATCH', 'items/itNew', { status: 'inactive' })), 'ctrl');
  await probe('L3', 'Creator shows interest; count update', seq(() => creator('PATCH', 'items/itNew/interests/iC', { time: now, platform: 'instagram', uid: 'uCreator' }), () => creator('PATCH', 'items/itNew', { interests_count: 1 })), 'ctrl');
  await probe('L4', 'Eve comments; Brand (owner) deletes the comment', seq(() => eve('PATCH', 'items/itNew/comments/cE', { uid: 'uEve', time: now, comment: 'hi' }), () => brand('DELETE', 'items/itNew/comments/cE')), 'ctrl');
  await probe('L5', 'Eve shares an item', eve('PATCH', 'items/itNew/shares/sE', { uid: 'uEve', time: now }), 'ctrl');
  // --- money gig: request proposal path ---
  const GM = 'items/itNew/influencers/gM';
  await probe('L6', 'Brand creates gig (writeEngage: status 0, uid, time, platform)', brand('PATCH', GM, { status: 0, uid: 'uCreator', time: now, platform: 'instagram' }), 'ctrl');
  await probe('L7', 'Brand + creator gig indexes (users/*/gigs)', seq(() => brand('PUT', 'users/uCreator/gigs/gM', { path: GM, time: now, platform: 'instagram', status: 'open', uid: 'uBrand' }), () => brand('PUT', 'users/uBrand/gigs/gM', { path: GM, time: now, platform: 'instagram', status: 'open', uid: 'uCreator' })), 'ctrl');
  await probe('L8', 'Brand requests a proposal (ledger + 0 -> 1)', seq(() => brand('PUT', GM + '/ledger/a1', { time: now, type: 'proposal requested', event: 'Marketer requested a proposal' }), () => brand('PATCH', GM, { status: 1 })), 'ctrl');
  await probe('L9', 'Creator submits proposal (proposal + ledger + 1 -> 2)', seq(() => creator('PATCH', GM + '/proposal', { caption: 'my pitch', photo_url: 'https://firebasestorage.googleapis.com/p.png', watermarked_photo_url: false, time: now }), () => creator('PUT', GM + '/ledger/a2', { time: now, type: 'proposal submitted', event: 'Influencer submitted a proposal' }), () => creator('PATCH', GM, { status: 2 })), 'ctrl');
  await probe('L10', 'Brand declines (2 -> 3); creator resubmits (3 -> 2)', seq(() => brand('PATCH', GM, { status: 3 }), () => creator('PATCH', GM + '/proposal', { caption: 'v2', time: now }), () => creator('PATCH', GM, { status: 2 })), 'ctrl');
  await admin('PATCH', GM, { status: 4, transaction_key: 'txM' }); // charge-marketer (server)
  await probe('L11', 'Brand client re-writes status 4 after the server set it (no-op)', brand('PATCH', GM, { status: 4 }), 'ctrl');
  await probe('L12', 'Brand ledger "payment submitted"', brand('PUT', GM + '/ledger/a3', { time: now, type: 'payment submitted', event: 'Marketer paid $250' }), 'ctrl');
  await probe('L13', 'Creator: post completed (ledger + 4 -> 5)', seq(() => creator('PUT', GM + '/ledger/a4', { time: now, type: 'post completed', event: 'Influencer posted on instagram' }), () => creator('PATCH', GM, { status: 5 })), 'ctrl');
  await admin('PATCH', GM, { status: 6 }); // verify-post (server)
  await probe('L14', 'Brand ledger "post verified" after verify-post', brand('PUT', GM + '/ledger/a5', { time: now, type: 'post verified', event: 'Marketer verified the post' }), 'ctrl');
  await admin('PATCH', GM, { status: 7 }); // pay-influencer (server)
  await probe('L15', 'Creator after payout: ledger, status 7 no-op, gig counts, close gig indexes', seq(
    () => creator('PUT', GM + '/ledger/a6', { time: now, type: 'payment accepted', event: 'Influencer accepted payment' }),
    () => creator('PATCH', GM, { status: 7 }),
    () => creator('PUT', 'items/itNew/gigs_count', 1), () => creator('PUT', 'users/uBrand/gigs_count', 1), () => creator('PUT', 'users/uCreator/gigs_count', 1),
    () => creator('PATCH', 'users/uBrand/gigs/gM', { status: 'closed' }), () => creator('PATCH', 'users/uCreator/gigs/gM', { status: 'closed' })), 'ctrl');
  await probe('L16', 'Creator files a dispute (gig disputes + /disputes)', seq(() => creator('PUT', GM + '/disputes/d1', { time: now, description: 'late', status: 'open' }), () => creator('PUT', 'disputes/d1', { time: now, marketerID: 'uBrand', influencerID: 'uCreator', path: GM, description: 'late', status: 'open' })), 'ctrl');
  // --- money gig: bypass proposal ---
  const GB = 'items/itNew/influencers/gB';
  await probe('L17', 'Brand bypasses the proposal (create 0, proposal {photo_url:false}, 0 -> 2)', seq(
    () => brand('PATCH', GB, { status: 0, uid: 'uEve', time: now, platform: 'twitter' }),
    () => brand('PATCH', GB + '/proposal', { caption: 'Marketer selected to pay immediately', photo_url: false, time: now }),
    () => brand('PUT', GB + '/ledger/b1', { time: now, type: 'proposal bypassed', event: 'Marketer chose to pay immediately' }),
    () => brand('PATCH', GB, { status: 2 })), 'ctrl');
  // --- decline gig before payment ---
  await probe('L18', 'Creator declines (deletes) an unpaid gig', seq(() => brand('PATCH', 'items/itNew/influencers/gD', { status: 0, uid: 'uCreator', time: now, platform: 'x' }), () => brand('PATCH', 'items/itNew/influencers/gD', { status: 1 }), () => creator('DELETE', 'items/itNew/influencers/gD')), 'ctrl');
  await probe('L19', 'Brand declines (deletes) an unpaid gig', seq(() => brand('PATCH', 'items/itNew/influencers/gD2', { status: 0, uid: 'uCreator', time: now, platform: 'x' }), () => brand('DELETE', 'items/itNew/influencers/gD2')), 'ctrl');
  // --- gift gig ---
  const GG = 'items/itG/influencers/gG';
  await probe('L20', 'Gift: brand creates gig + requests proposal', seq(() => brand('PATCH', GG, { status: 0, uid: 'uCreator', time: now, platform: 'twitter' }), () => brand('PATCH', GG, { status: 1 })), 'ctrl');
  await probe('L21', 'Gift: creator proposal (1 -> 2)', seq(() => creator('PATCH', GG + '/proposal', { caption: 'gift pitch', photo_url: 'https://x/p.png', watermarked_photo_url: false, time: now }), () => creator('PATCH', GG, { status: 2 })), 'ctrl');
  await probe('L22', 'Gift: brand ships (tracking_number, ledger, 2 -> 4)', seq(() => brand('PATCH', GG, { tracking_number: '1Z999' }), () => brand('PUT', GG + '/ledger/g1', { time: now, type: 'payment submitted', event: 'Marketer shipped an item' }), () => brand('PATCH', GG, { status: 4 })), 'ctrl');
  await probe('L23', 'Gift: creator posted (4 -> 5)', creator('PATCH', GG, { status: 5 }), 'ctrl');
  await admin('PATCH', GG, { status: 6 }); await admin('PATCH', GG, { status: 7, transaction_key: 'txG' }); // verify-post, record-gift
  await probe('L24', 'Gift: creator post-accept writes (ledger, 7 no-op)', seq(() => creator('PUT', GG + '/ledger/g2', { time: now, type: 'payment accepted', event: 'Influencer accepted the payment' }), () => creator('PATCH', GG, { status: 7 })), 'ctrl');
  await probe('L25', 'Gift skip-proposal: brand ships from status 1 (1 -> 4)', seq(() => brand('PATCH', 'items/itG/influencers/gS', { status: 0, uid: 'uEve', time: now, platform: 'x' }), () => brand('PATCH', 'items/itG/influencers/gS', { status: 1 }), () => brand('PATCH', 'items/itG/influencers/gS', { tracking_number: '1Z1' }), () => brand('PATCH', 'items/itG/influencers/gS', { status: 4 })), 'ctrl');
  // --- profile / explore reads ---
  await probe('L26', 'Eve reads Brand public profile (users/uBrand)', eve('GET', 'users/uBrand'), 'ctrl');
  await probe('L27', 'Eve lists users (who-to-follow / explore)', eve('GET', 'users'), 'ctrl');
  await probe('L28', 'Eve reads items (feed)', eve('GET', 'items'), 'ctrl');
  await probe('L29', 'Owner reads own users_private', creator('GET', 'users_private/uCreator'), 'ctrl');
  await probe('L30', 'Owner writes own profile + current_gig + unread counts', creator('PATCH', 'users/uCreator', { name: 'C2', current_gig: GM, unread_notifications_count: 0, unread_messages_count: 0 }), 'ctrl');
  // --- messages (private index) ---
  await probe('L31', 'Brand opens a new conversation with Eve (both private indexes + message)', seq(
    () => brand('PATCH', 'users_private/uBrand/conversations/cBE', { read_or_unread: 'read', uid: 'uEve', time: now }),
    () => brand('PATCH', 'users_private/uEve/conversations/cBE', { read_or_unread: 'unread', uid: 'uBrand', time: now }),
    () => brand('PUT', 'conversations/cBE/m1', { uid: 'uBrand', body: 'hello', time: now })), 'ctrl');
  await probe('L32', 'Eve reads + replies + marks read', seq(() => eve('GET', 'conversations/cBE'), () => eve('PATCH', 'users_private/uEve/conversations/cBE', { read_or_unread: 'read' }), () => eve('PUT', 'conversations/cBE/m2', { uid: 'uEve', body: 'hi', time: now })), 'ctrl');
  await probe('L33', 'Existing conversation cBC: creator replies (index from seed)', creator('PUT', 'conversations/cBC/m9', { uid: 'uCreator', body: 'ok', time: now }), 'ctrl');
  if (PHASE === 'phase1') {
    await probe('L34', 'Mixed: Brand moves legacy cBC index to private, creator still in (legacy) can reply', seq(
      () => brand('PUT', 'users_private/uBrand/conversations/cBC', { uid: 'uCreator', read_or_unread: 'read' }),
      () => brand('DELETE', 'users/uBrand/conversations/cBC'),
      () => creator('PUT', 'conversations/cBC/m10', { uid: 'uCreator', body: 'still here', time: now }),
      () => brand('GET', 'conversations/cBC')), 'ctrl');
    await probe('L35', 'Stale client: legacy notification + conversation index writes still accepted in phase 1', seq(
      () => eve('PUT', 'users/uCreator/notifications/nL', { uid: 'uEve', action: 'followed', read_or_unread: 'unread', time: now })), 'ctrl');
  }
  // --- notifications (private) ---
  await probe('L36', 'Eve notifies Creator (users_private/uCreator/notifications)', eve('PATCH', 'users_private/uCreator/notifications/nE', { action: 'followed', target: 'you', username: 'eve', target_key: 'uEve', uid: 'uEve', read_or_unread: 'unread', time: now }), 'ctrl');
  await probe('L37', 'Creator marks read + removes own notification', seq(() => creator('PATCH', 'users_private/uCreator/notifications/nE', { read_or_unread: 'read' }), () => creator('DELETE', 'users_private/uCreator/notifications/nE')), 'ctrl');
  // --- signup ---
  await probe('L38', 'Signup: new user record (public fields) + users_private {email, customer_id}', seq(
    () => newbie('PUT', 'users/uNew', { role: 'influencer', username: 'new', photo_url: 'https://runwae.com/img/newuser.png', header_url: 'https://runwae.com/img/newheader.png', name: 'New', current_profile: 'uNew', email_verified: false, verified: false, exploreTutorialCompleted: false, description: '', gigs: '', interests: '', posts: '', shares: '', followers: '', following: '', favortied: '', favorites: '', current_group: '', current_contact: '', current_conversation: '', current_item: '', current_gig: '', unread_messages_count: 0, unread_notifications_count: 0, favorited_count: 0, favorites_count: 0, followers_count: 0, following_count: 0, gigs_count: 0, location: '', time: now, city: '', region: '', country: '', facebook: '', instagram: '', twitter: '', linkedin: '', website: '', badges: { foodie: 0 } }),
    () => newbie('PUT', 'users_private/uNew', { email: 'new@example.test', customer_id: '' })), 'ctrl');
  if (PHASE === 'phase2') {
    await probe('N33', 'Phase 2: a stale client writes email into public users/{uid}', creator('PATCH', 'users/uCreator', { email: 'x@example.test' }));
    await probe('N34', 'Phase 2: legacy notification write into public users/{uid}', eve('PUT', 'users/uCreator/notifications/nL', { uid: 'uEve', action: 'followed', read_or_unread: 'unread', time: now }));
    await probe('N35', 'Phase 2: legacy conversation index write into public users/{uid}', eve('PUT', 'users/uCreator/conversations/cX', { uid: 'uEve', read_or_unread: 'unread' }));
  }

  const vulnIds = results.filter((r) => r.tag === 'VULN').map((r) => r.id);
  console.log(`rules file: ${process.argv[2]}  data: ${PHASE}`);
  console.log(out.join('\n'));
  console.log(`\n${vulns} attack(s) allowed: ${vulnIds.join(' ')}`);
  console.log(`${results.filter((r) => r.tag.startsWith('CTRL')).length} legit-flow checks, ${ctrlFail} blocked (CTRL-FAIL)`);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ rules: process.argv[2], phase: PHASE, vulns: vulnIds, ctrlFail, results }, null, 2));
  process.exit(ctrlFail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
