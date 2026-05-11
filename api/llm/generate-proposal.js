/**
 * POST /api/llm/generate-proposal
 * Generates AI-powered proposal captions for influencer collaborations
 *
 * Security features:
 * - Firebase token authentication
 * - Role-based access (influencers only)
 * - Atomic rate limiting (10 req/hour)
 * - Multi-layered prompt injection defense
 * - Input sanitization and output validation
 *
 * Request body:
 * {
 *   "itemKey": "abc123",      // Required: Item/gig key
 *   "platform": "instagram",  // Optional: Override platform
 *   "style": "professional"   // Optional: Writing style
 * }
 *
 * Headers:
 *   Authorization: Bearer <firebase-id-token>
 */

const { authenticate } = require('./_lib/auth');
const { getDatabase } = require('./_lib/firebase-admin');
const { generateProposal } = require('./_lib/anthropic');
const { validatePlatform, validateStyle } = require('./_lib/sanitize');

module.exports = async function handler(req, res) {
  // CORS headers for client-side fetch
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    // SECURITY: Authenticate, validate role, and check rate limit
    const { user, rateLimit } = await authenticate(req);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', '10');
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.resetAt);

    // Parse and validate request body
    const { itemKey, platform, style } = req.body || {};

    if (!itemKey || typeof itemKey !== 'string') {
      return res.status(400).json({ error: 'itemKey is required and must be a string' });
    }

    // Validate itemKey format (Firebase keys are alphanumeric with some special chars)
    if (!/^[-a-zA-Z0-9_]+$/.test(itemKey)) {
      return res.status(400).json({ error: 'Invalid itemKey format' });
    }

    const db = getDatabase();

    // PERFORMANCE: Fetch user profile first (needed to validate gig ownership)
    const userSnapshot = await db.ref(`users/${user.uid}`).once('value');
    const userData = userSnapshot.val();

    if (!userData) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Get the current gig path to find the item
    const gigPath = userData.current_gig;
    if (!gigPath) {
      return res.status(400).json({ error: 'No active gig found' });
    }

    // Extract item key from gig path (format: items/{itemKey}/influencers/{gigKey})
    const pathParts = gigPath.split('/');
    if (pathParts.length < 2) {
      return res.status(400).json({ error: 'Invalid gig path format' });
    }
    const gigItemKey = pathParts[1];

    // SECURITY: Verify the requested item key matches the user's active gig
    if (itemKey !== gigItemKey) {
      return res.status(403).json({ error: 'Item key does not match active gig' });
    }

    // PERFORMANCE: Fetch item, marketer, and gig data in parallel
    const [itemSnapshot, gigSnapshot] = await Promise.all([
      db.ref(`items/${itemKey}`).once('value'),
      db.ref(gigPath).once('value'),
    ]);

    const itemData = itemSnapshot.val();
    const gigData = gigSnapshot.val();

    if (!itemData) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Fetch marketer profile (needs itemData.uid first)
    const marketerSnapshot = await db.ref(`users/${itemData.uid}`).once('value');
    const marketerData = marketerSnapshot.val();

    if (!marketerData) {
      return res.status(404).json({ error: 'Marketer profile not found' });
    }

    // Validate and normalize platform/style inputs
    const targetPlatform = validatePlatform(platform || gigData?.platform);
    const targetStyle = validateStyle(style);

    // SECURITY: Generate proposal with multi-layered prompt security
    const result = await generateProposal({
      platform: targetPlatform,
      style: targetStyle,
      item: itemData,
      user: userData,
      marketer: marketerData,
    });

    const duration = Date.now() - startTime;

    // Log for monitoring (in production, send to logging service)
    console.log(`Proposal generated: uid=${user.uid}, platform=${targetPlatform}, duration=${duration}ms, warnings=${result.warnings.length}`);

    return res.status(200).json({
      success: true,
      proposal: result.text,
      platform: targetPlatform,
      style: targetStyle,
      remaining: rateLimit.remaining,
      // Include warnings in response for transparency (could be hidden in production)
      warnings: result.warnings.length > 0 ? result.warnings : undefined,
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Generate proposal error (${duration}ms):`, error.message);

    // Handle specific error types with appropriate status codes
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        resetAt: error.resetAt,
        message: 'You have exceeded the limit of 10 AI generations per hour. Please try again later.',
      });
    }

    if (error.code === 'INVALID_ROLE') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only influencers can generate proposals',
      });
    }

    if (error.message === 'Missing or invalid Authorization header' ||
        error.message === 'No token provided' ||
        error.message === 'Invalid or expired token') {
      return res.status(401).json({ error: error.message });
    }

    // Anthropic API errors
    if (error.status === 429) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'AI service is busy. Please try again in a moment.',
      });
    }

    // Generic error - don't leak internal details
    return res.status(500).json({
      error: 'Failed to generate proposal',
      message: 'An unexpected error occurred. Please try again.',
    });
  }
};
