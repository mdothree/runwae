/**
 * Input sanitization and validation for LLM requests
 * Multi-layered defense against prompt injection
 */

// Allowed values for validation
const ALLOWED_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'x'];
const ALLOWED_STYLES = ['professional', 'casual', 'creative', 'friendly', 'enthusiastic'];

// Maximum lengths for user-provided content
const MAX_LENGTHS = {
  name: 100,
  username: 50,
  industry: 50,
  caption: 500,
  giftDescription: 300,
};

// Patterns that may indicate injection attempts
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/i,
  /disregard\s+(all\s+)?(previous|above|prior)/i,
  /forget\s+(everything|all|your)\s+(previous|instructions?)/i,
  /new\s+instructions?:/i,
  /system\s*prompt/i,
  /\bact\s+as\b/i,
  /\byou\s+are\s+now\b/i,
  /\bpretend\s+(to\s+be|you('re|r))\b/i,
  /\brole\s*play\b/i,
  /<\/?system>/i,
  /<\/?user>/i,
  /<\/?assistant>/i,
  /\[\[.*\]\]/,  // Double bracket injection
  /\{\{.*\}\}/,  // Handlebars-style injection
];

/**
 * Check if text contains potential injection patterns
 * @param {string} text - Text to check
 * @returns {boolean} True if suspicious patterns found
 */
function containsInjectionPattern(text) {
  if (!text || typeof text !== 'string') return false;
  return INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Sanitize text input by removing/escaping dangerous content
 * @param {string} text - Raw text input
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized text
 */
function sanitizeText(text, maxLength = 200) {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Escape XML/HTML-like tags that could confuse the model
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Remove potential delimiter abuse
    .replace(/---+/g, '-')
    .replace(/===+/g, '=')
    .trim();

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }

  return sanitized;
}

/**
 * Validate and normalize platform input
 * @param {string} platform - Platform name
 * @returns {string} Validated platform or default
 */
function validatePlatform(platform) {
  if (!platform || typeof platform !== 'string') return 'instagram';
  const normalized = platform.toLowerCase().trim();
  return ALLOWED_PLATFORMS.includes(normalized) ? normalized : 'instagram';
}

/**
 * Validate and normalize style input
 * @param {string} style - Style name
 * @returns {string} Validated style or default
 */
function validateStyle(style) {
  if (!style || typeof style !== 'string') return 'professional';
  const normalized = style.toLowerCase().trim();
  return ALLOWED_STYLES.includes(normalized) ? normalized : 'professional';
}

/**
 * Sanitize all user-provided context data
 * @param {object} context - Raw context object
 * @returns {{sanitized: object, warnings: string[]}} Sanitized context and any warnings
 */
function sanitizeContext(context) {
  const warnings = [];
  const { platform, style, item, user, marketer } = context;

  // Check for injection patterns in all text fields
  const fieldsToCheck = [
    { name: 'brand name', value: marketer?.name },
    { name: 'brand username', value: marketer?.username },
    { name: 'caption guidance', value: item?.caption },
    { name: 'gift description', value: item?.gift_description },
    { name: 'influencer name', value: user?.name },
    { name: 'influencer username', value: user?.username },
  ];

  for (const field of fieldsToCheck) {
    if (containsInjectionPattern(field.value)) {
      warnings.push(`Suspicious pattern detected in ${field.name}`);
    }
  }

  const sanitized = {
    platform: validatePlatform(platform),
    style: validateStyle(style),
    item: {
      caption: sanitizeText(item?.caption, MAX_LENGTHS.caption),
      compensation: sanitizeText(item?.compensation, 20),
      gift_description: sanitizeText(item?.gift_description, MAX_LENGTHS.giftDescription),
    },
    user: {
      name: sanitizeText(user?.name, MAX_LENGTHS.name),
      username: sanitizeText(user?.username, MAX_LENGTHS.username),
      industry: sanitizeText(user?.industry, MAX_LENGTHS.industry),
    },
    marketer: {
      name: sanitizeText(marketer?.name, MAX_LENGTHS.name),
      username: sanitizeText(marketer?.username, MAX_LENGTHS.username),
      industry: sanitizeText(marketer?.industry, MAX_LENGTHS.industry),
    },
  };

  return { sanitized, warnings };
}

/**
 * Validate LLM output for safety
 * @param {string} output - Raw LLM output
 * @returns {{safe: boolean, cleaned: string, issues: string[]}}
 */
function validateOutput(output) {
  const issues = [];

  if (!output || typeof output !== 'string') {
    return { safe: false, cleaned: '', issues: ['Empty or invalid output'] };
  }

  let cleaned = output;

  // Check for leaked system prompt indicators
  const leakPatterns = [
    /you are a professional influencer/i,
    /your task is to generate/i,
    /guidelines:/i,
    /system prompt/i,
    /as an ai/i,
    /as a language model/i,
    /i('m| am) an ai/i,
    /i('m| am) claude/i,
  ];

  for (const pattern of leakPatterns) {
    if (pattern.test(output)) {
      issues.push('Potential system prompt leak detected');
      break;
    }
  }

  // Check for refusals or meta-commentary
  const refusalPatterns = [
    /i (cannot|can't|won't|will not) (help|assist|generate)/i,
    /i('m| am) (unable|not able) to/i,
    /this request (is|seems|appears)/i,
    /as an ai assistant/i,
  ];

  for (const pattern of refusalPatterns) {
    if (pattern.test(output)) {
      issues.push('Model refusal or meta-commentary detected');
      break;
    }
  }

  // Remove any residual XML-like tags that shouldn't be in output
  cleaned = cleaned
    .replace(/<\/?[a-z_]+>/gi, '')
    .trim();

  // Ensure reasonable length (not too short or too long)
  if (cleaned.length < 20) {
    issues.push('Output too short');
  }
  if (cleaned.length > 3000) {
    cleaned = cleaned.substring(0, 3000);
    issues.push('Output truncated due to length');
  }

  return {
    safe: issues.length === 0,
    cleaned,
    issues,
  };
}

module.exports = {
  sanitizeText,
  validatePlatform,
  validateStyle,
  sanitizeContext,
  validateOutput,
  containsInjectionPattern,
  ALLOWED_PLATFORMS,
  ALLOWED_STYLES,
};
