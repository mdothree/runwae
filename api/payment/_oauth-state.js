/**
 * Stripe Connect OAuth `state` (RW-SEC-02/23). Not a route ("_" prefix).
 *
 * The state is a random 192-bit value issued by api/payment/connect-start to a
 * signed-in user. Only its SHA-256 is stored, server-side, bound to that uid:
 *   oauth_states/{uid} = { h, exp, replace }      (rules: no client access)
 * It is single-use (consumed by connect-oauth) and expires after STATE_TTL_MS.
 * A Stripe `code` minted for someone else's flow can therefore not be attached to
 * a victim's account: the victim's session holds no matching state.
 */
const crypto = require('crypto');

const STATE_TTL_MS = 15 * 60 * 1000;
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

async function issueState(db, uid, opts) {
  const state = crypto.randomBytes(24).toString('hex');
  await db.ref(`oauth_states/${uid}`).set({
    h: sha256(state),
    exp: Date.now() + STATE_TTL_MS,
    replace: !!(opts && opts.replace),
  });
  return state;
}

/** Consume the uid's state if it matches. Returns the stored record or null. */
async function consumeState(db, uid, state) {
  if (typeof state !== 'string' || !/^[0-9a-f]{48}$/.test(state)) return null;
  const ref = db.ref(`oauth_states/${uid}`);
  const rec = (await ref.once('value')).val();
  if (!rec || typeof rec.h !== 'string' || rec.used) return null;
  const a = Buffer.from(rec.h, 'hex');
  const b = Buffer.from(sha256(state), 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  // Single use: mark it used (with our own nonce) only if it is still unused.
  // (cur === null is the SDK's first local guess; the server value follows.)
  const mine = crypto.randomBytes(8).toString('hex');
  const res = await ref.transaction((cur) => {
    if (cur === null) return { h: rec.h, exp: rec.exp, replace: !!rec.replace, used: mine };
    if (!cur || cur.h !== rec.h || cur.used) return; // abort
    return Object.assign({}, cur, { used: mine });
  });
  if (!res.committed || !res.snapshot.val() || res.snapshot.val().used !== mine) return null;
  if (!(Number(rec.exp) > Date.now())) return null;
  return rec;
}

module.exports = { issueState, consumeState, STATE_TTL_MS };
