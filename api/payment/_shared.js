/**
 * Shared helpers for the payment functions (not a route: Vercel ignores
 * files in api/ whose name starts with "_").
 *
 * All payment records (transactions/*, users/{uid}/transactions/*,
 * stripe_accounts/*, payment_locks/*) are written here with the admin SDK.
 * The browser can no longer write them (see database.rules.json).
 */
const admin = require('../lib/firebase');

const GIG_PATH_RE = /^items\/([A-Za-z0-9_-]{1,128})\/influencers\/([A-Za-z0-9_-]{1,128})$/;

class HttpError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

/** Verify the Firebase ID token in "Authorization: Bearer <token>". Returns uid. */
async function requireUser(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    throw new HttpError(401, 'unauthenticated', 'Sign in required');
  }
  try {
    const decoded = await admin.auth().verifyIdToken(header.slice(7));
    return decoded.uid;
  } catch (e) {
    throw new HttpError(401, 'unauthenticated', 'Invalid or expired token');
  }
}

/** Load item + gig for a gig path "items/{itemId}/influencers/{gigKey}". */
async function loadGig(gigPath) {
  const m = GIG_PATH_RE.exec(String(gigPath || ''));
  if (!m) throw new HttpError(400, 'bad_gig_path', 'Invalid gig path');
  const db = admin.database();
  const [itemSnap, gigSnap] = await Promise.all([
    db.ref(`items/${m[1]}`).once('value'),
    db.ref(gigPath).once('value'),
  ]);
  const item = itemSnap.val();
  const gig = gigSnap.val();
  if (!item || !gig) throw new HttpError(404, 'not_found', 'Gig not found');
  return { db, itemId: m[1], gigKey: m[2], item, gig };
}

/** Whole-dollar price from the item record (server-side source of truth). */
function itemPrice(item) {
  const price = Math.round(Number(item.price));
  if (!Number.isFinite(price) || price <= 0 || price > 100000) {
    throw new HttpError(400, 'bad_price', 'Item has no valid price');
  }
  return price;
}

/**
 * Take a one-shot lock at payment_locks/{itemId}/{gigKey}/{kind}.
 * Returns a release() for the failure path.
 */
async function takeLock(db, itemId, gigKey, kind, uid) {
  const ref = db.ref(`payment_locks/${itemId}/${gigKey}/${kind}`);
  const res = await ref.transaction((cur) => {
    if (cur) return; // abort: already locked or done
    return { uid, time: Date.now(), state: 'pending' };
  });
  if (!res.committed) throw new HttpError(409, 'in_progress', 'This payment is already being processed');
  return {
    release: () => ref.remove(),
    done: (extra) => ref.update(Object.assign({ state: 'done' }, extra || {})),
  };
}

function sendError(res, err) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
  console.error(err);
  return res.status(400).json({ error: err.type || 'payment_failed', message: err.message || 'Payment failed' });
}

module.exports = { admin, HttpError, requireUser, loadGig, itemPrice, takeLock, sendError };
