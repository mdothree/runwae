/**
 * Replays the client RTDB writes captured by the fake-Firebase harness
 * (xps ~/mdo-qa/rw-sec/harness: verify1 vshoot.mjs + PAYMOCK=1 payment-API mock) against the LOCAL
 * emulator under a rules file, as the signed-in user of each scenario.
 * Mocked payment-API calls are turned into their server-side effects at the
 * point the page made them (charge -> status 4, verify-post -> record + 6,
 * record-gift / pay-influencer -> 7), so the client writes that follow see the
 * same state they would in production.
 *   firebase emulators:exec --only database --project demo-runwae \
 *     "node tests/security/replay-writes.js <rules.json> <harness-out>/console.json [--json out.json]"
 * Prints every DENIED client write. Exit 0 always (the caller compares runs).
 */
'use strict';
const fs = require('fs');
const HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
if (!HOST || !/^(127\.0\.0\.1|localhost):\d+$/.test(HOST)) { console.error('Refusing: not a local emulator'); process.exit(2); }
const NS = 'demo-runwae';
const [rulesFile, consoleFile] = process.argv.slice(2);
const jsonOut = process.argv.indexOf('--json') > 0 ? process.argv[process.argv.indexOf('--json') + 1] : null;
const report = JSON.parse(fs.readFileSync(consoleFile, 'utf8'));

async function call(method, p, body, uid) {
  let url = `http://${HOST}/${p.replace(/^\/+/, '')}.json?ns=${NS}`;
  if (uid) url += '&auth_variable_override=' + encodeURIComponent(JSON.stringify({ uid, token: { email_verified: true } }));
  const r = await fetch(url, { method, headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, text: await r.text() };
}
const GIG_RE = /^items\/([^/]+)\/influencers\/([^/]+)$/;
async function serverEffect(c, uid) {
  const g = c.body && c.body.gigPath; const m = GIG_RE.exec(g || '');
  if (!m) return;
  if (c.ep === 'charge-marketer') {
    await call('PATCH', '', { [`transactions/tx_mock`]: { path: g, status: 'incomplete', price: '1', marketerID: uid, influencerID: 'x', marketer_transactionID: 'ch_mock' }, [`${g}/transaction_key`]: 'tx_mock', [`${g}/status`]: 4 });
  } else if (c.ep === 'verify-post') {
    await call('PATCH', '', { [`gig_verifications/${m[1]}/${m[2]}`]: { by: uid, time: 1, mode: c.body.mode }, [`${g}/status`]: 6 });
  } else if (c.ep === 'record-gift') {
    await call('PATCH', '', { [`${g}/transaction_key`]: 'tx_gift', [`${g}/status`]: 7 });
  } else if (c.ep === 'pay-influencer') {
    await call('PATCH', '', { [`${g}/status`]: 7 });
  }
}

(async () => {
  const lr = await fetch(`http://${HOST}/.settings/rules.json?ns=${NS}`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: fs.readFileSync(rulesFile) });
  if (lr.status !== 200) throw new Error('rules load ' + lr.status);
  const summary = { rules: rulesFile, consoleFile, scenarios: {}, totalWrites: 0, denied: 0 };
  for (const [key, L] of Object.entries(report)) {
    if (!Array.isArray(L.writes) || !L.fixtureDb || !L.uid) continue;
    await call('PUT', '', L.fixtureDb);
    const calls = (L.payCalls || []).slice().sort((a, b) => a.wn - b.wn);
    let ci = 0;
    const denied = [];
    for (let i = 0; i < L.writes.length; i++) {
      while (ci < calls.length && calls[ci].wn <= i && calls[ci].wn >= 0) await serverEffect(calls[ci++], L.uid);
      const w = L.writes[i];
      const method = { set: 'PUT', update: 'PATCH', remove: 'DELETE', transaction: 'PUT' }[w.op];
      if (!method) continue;
      const body = w.op === 'remove' ? undefined : (w.value === undefined ? null : w.value);
      const r = await call(method, w.path, method === 'PATCH' && (body === null || typeof body !== 'object') ? {} : body, L.uid);
      if (r.status !== 200) denied.push(`${w.op} ${w.path} ${JSON.stringify(w.value === undefined ? null : w.value).slice(0, 100)}`);
    }
    summary.scenarios[key] = { writes: L.writes.length, denied, payCalls: (L.payCalls || []).map((c) => c.ep), actions: L.actions };
    summary.totalWrites += L.writes.length; summary.denied += denied.length;
    console.log(`${key.padEnd(46)} writes=${String(L.writes.length).padStart(3)} denied=${denied.length} api=[${(L.payCalls || []).map((c) => c.ep).join(',')}]`);
    for (const d of denied) console.log('    DENIED ' + d);
  }
  console.log(`\nTOTAL client writes ${summary.totalWrites}, denied ${summary.denied}  (rules: ${rulesFile})`);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(summary, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
