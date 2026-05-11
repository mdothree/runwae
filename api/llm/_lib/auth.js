/**
 * Authentication and rate limiting middleware
 * Verifies Firebase ID tokens and enforces atomic rate limits
 */

const { getAuth, getDatabase } = require('./firebase-admin');

const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Verify Firebase ID token from Authorization header
 * @param {string} authHeader - Authorization header value (Bearer <token>)
 * @returns {Promise<{uid: string, email: string}>} Decoded token claims
 */
async function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    throw new Error('No token provided');
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Atomic rate limit check using Firebase transaction
 * Prevents race conditions in concurrent requests
 * @param {string} uid - User ID
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
 */
async function checkRateLimit(uid) {
  const db = getDatabase();
  const rateLimitRef = db.ref(`rate_limits/llm/${uid}`);
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Use transaction for atomic read-modify-write
  const result = await rateLimitRef.transaction((currentData) => {
    // Initialize if no data exists
    if (currentData === null) {
      return {
        requests: [now],
        lastRequest: now,
      };
    }

    // Filter out requests outside the current window
    const recentRequests = (currentData.requests || []).filter(
      (timestamp) => timestamp > windowStart
    );

    // Check if limit exceeded
    if (recentRequests.length >= RATE_LIMIT_REQUESTS) {
      // Return current data unchanged (transaction will abort)
      // We'll detect this case after the transaction
      return currentData;
    }

    // Add current request and update
    recentRequests.push(now);
    return {
      requests: recentRequests,
      lastRequest: now,
    };
  });

  // Check transaction result
  const data = result.snapshot.val();
  const recentRequests = (data.requests || []).filter(
    (timestamp) => timestamp > windowStart
  );

  // If the transaction didn't add our request, we're rate limited
  const wasAdded = recentRequests.includes(now);

  if (!wasAdded || recentRequests.length > RATE_LIMIT_REQUESTS) {
    const oldestRequest = Math.min(...recentRequests);
    const resetAt = oldestRequest + RATE_LIMIT_WINDOW_MS;

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_REQUESTS - recentRequests.length,
    resetAt: now + RATE_LIMIT_WINDOW_MS,
  };
}

/**
 * Validate that user has required role for LLM access
 * @param {string} uid - User ID
 * @returns {Promise<{valid: boolean, role: string}>}
 */
async function validateUserRole(uid) {
  const db = getDatabase();
  const userRef = db.ref(`users/${uid}/role`);
  const snapshot = await userRef.once('value');
  const role = snapshot.val();

  // Only influencers can generate proposals (they write them)
  const valid = role === 'influencer';

  return { valid, role: role || 'unknown' };
}

/**
 * Full authentication middleware
 * Verifies token, validates role, and checks rate limit
 * @param {Request} req - Vercel request object
 * @returns {Promise<{user: {uid: string, email: string}, rateLimit: object}>}
 */
async function authenticate(req) {
  const authHeader = req.headers.authorization;

  // Step 1: Verify Firebase token
  const user = await verifyToken(authHeader);

  // Step 2: Validate user role (run in parallel with rate limit for performance)
  const [roleResult, rateLimit] = await Promise.all([
    validateUserRole(user.uid),
    checkRateLimit(user.uid),
  ]);

  // Check role
  if (!roleResult.valid) {
    const error = new Error('Only influencers can generate proposals');
    error.code = 'INVALID_ROLE';
    error.role = roleResult.role;
    throw error;
  }

  // Check rate limit
  if (!rateLimit.allowed) {
    const error = new Error('Rate limit exceeded');
    error.code = 'RATE_LIMIT_EXCEEDED';
    error.resetAt = rateLimit.resetAt;
    throw error;
  }

  return { user, rateLimit };
}

module.exports = {
  verifyToken,
  checkRateLimit,
  validateUserRole,
  authenticate,
};
