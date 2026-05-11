/**
 * LLM Service Client
 * Handles communication with the AI proposal generation API
 * Includes retry logic and enhanced error handling
 */

var LLMService = (function() {
  'use strict';

  var MAX_RETRIES = 2;
  var RETRY_DELAY_MS = 1000;

  /**
   * Sleep helper for retry delays
   */
  function sleep(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Generate a proposal caption using AI
   * @param {string} itemKey - The item/gig key
   * @param {string} platform - Target platform (instagram, tiktok, etc.)
   * @param {string} style - Writing style (professional, casual, creative)
   * @returns {Promise<{success: boolean, proposal?: string, error?: string, remaining?: number}>}
   */
  async function generateProposal(itemKey, platform, style) {
    var lastError = null;

    for (var attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Get current user's Firebase ID token
        var user = firebase.auth().currentUser;
        if (!user) {
          return {
            success: false,
            error: 'You must be logged in to use AI generation'
          };
        }

        // Force token refresh on retry attempts
        var forceRefresh = attempt > 0;
        var idToken = await user.getIdToken(forceRefresh);

        var response = await fetch('/api/llm/generate-proposal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + idToken
          },
          body: JSON.stringify({
            itemKey: itemKey,
            platform: platform || 'instagram',
            style: style || 'professional'
          })
        });

        // Parse rate limit headers
        var rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        var rateLimitReset = response.headers.get('X-RateLimit-Reset');

        var data = await response.json();

        if (!response.ok) {
          // Non-retryable errors
          if (response.status === 400) {
            return {
              success: false,
              error: data.message || data.error || 'Invalid request'
            };
          }

          if (response.status === 403) {
            return {
              success: false,
              error: data.message || 'Access denied. Only influencers can generate proposals.'
            };
          }

          if (response.status === 429) {
            var resetTime = data.resetAt ? new Date(data.resetAt).toLocaleTimeString() : 'later';
            return {
              success: false,
              error: 'Rate limit reached (' + rateLimitRemaining + ' remaining). Try again at ' + resetTime,
              resetAt: data.resetAt,
              remaining: 0
            };
          }

          if (response.status === 401) {
            // Token expired - will retry with force refresh
            if (attempt < MAX_RETRIES) {
              lastError = 'Session expired, retrying...';
              await sleep(RETRY_DELAY_MS);
              continue;
            }
            return {
              success: false,
              error: 'Session expired. Please refresh the page and try again.'
            };
          }

          // Server errors (500, 503) - may be retryable
          if (response.status >= 500 && attempt < MAX_RETRIES) {
            lastError = data.message || 'Server error';
            await sleep(RETRY_DELAY_MS * (attempt + 1)); // Exponential backoff
            continue;
          }

          return {
            success: false,
            error: data.message || data.error || 'Failed to generate proposal'
          };
        }

        // Success
        var result = {
          success: true,
          proposal: data.proposal,
          platform: data.platform,
          style: data.style,
          remaining: parseInt(rateLimitRemaining, 10) || data.remaining
        };

        // Include warnings if present (for debugging)
        if (data.warnings && data.warnings.length > 0) {
          console.warn('LLM warnings:', data.warnings);
          result.warnings = data.warnings;
        }

        return result;

      } catch (error) {
        console.error('LLM Service Error (attempt ' + (attempt + 1) + '):', error);
        lastError = error.message || 'Network error';

        // Network errors are retryable
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }

        return {
          success: false,
          error: 'Network error. Please check your connection and try again.'
        };
      }
    }

    // Should not reach here, but handle edge case
    return {
      success: false,
      error: lastError || 'Failed after multiple attempts'
    };
  }

  /**
   * Check if AI generation is available for current user
   * @returns {Promise<{available: boolean, reason?: string}>}
   */
  async function checkAvailability() {
    try {
      var user = firebase.auth().currentUser;
      if (!user) {
        return { available: false, reason: 'Not logged in' };
      }

      // Check user role from Firebase
      var snapshot = await firebase.database().ref('users/' + user.uid + '/role').once('value');
      var role = snapshot.val();

      if (role !== 'influencer') {
        return { available: false, reason: 'Only influencers can use AI generation' };
      }

      return { available: true };
    } catch (error) {
      console.error('Availability check error:', error);
      return { available: false, reason: 'Could not verify access' };
    }
  }

  // Public API
  return {
    generateProposal: generateProposal,
    checkAvailability: checkAvailability
  };
})();
