/* ==========================================================================
   Profile Marketplace Utilities
   Helper functions for the marketplace-style profile layout
   ========================================================================== */

/**
 * Calculate average rating from reviews array
 * @param {Array|Object} reviews - Reviews array or object
 * @returns {Object} - Object with rating and count
 */
function calculateAverageRating(reviews) {
  if (!reviews) {
    return { rating: 0, count: 0 };
  }

  var reviewsArray;
  if (Array.isArray(reviews)) {
    reviewsArray = reviews;
  } else {
    reviewsArray = Object.values(reviews);
  }

  if (reviewsArray.length === 0) {
    return { rating: 0, count: 0 };
  }

  var sum = reviewsArray.reduce(function(acc, review) {
    var rating = review.rating || review.score || 0;
    return acc + rating;
  }, 0);

  var avgRating = sum / reviewsArray.length;

  return {
    rating: avgRating.toFixed(1),
    count: reviewsArray.length
  };
}

/**
 * Generate star rating HTML
 * @param {number} rating - Rating value (1-5 or 1-10)
 * @param {number} maxRating - Maximum rating (default 5)
 * @returns {string} - HTML string with star icons
 */
function generateStarRating(rating, maxRating) {
  maxRating = maxRating || 5;

  // Normalize rating if it's on a 10-point scale
  if (maxRating === 10) {
    rating = rating / 2;
    maxRating = 5;
  }

  var html = '';
  var fullStars = Math.floor(rating);
  var hasHalfStar = rating % 1 >= 0.5;

  for (var i = 0; i < fullStars; i++) {
    html += '<ion-icon name="star"></ion-icon>';
  }

  if (hasHalfStar && fullStars < maxRating) {
    html += '<ion-icon name="star-half"></ion-icon>';
    fullStars++;
  }

  for (var j = fullStars; j < maxRating; j++) {
    html += '<ion-icon name="star-outline"></ion-icon>';
  }

  return html;
}

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default USD)
 * @returns {string} - Formatted currency string
 */
function formatCurrency(amount, currency) {
  currency = currency || 'USD';

  if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  return '$' + amount;
}

/**
 * Format large numbers with K/M suffix
 * @param {number} num - Number to format
 * @returns {string} - Formatted number string
 */
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

/**
 * Parse industry/skills string into array of tags
 * @param {string} industry - Comma-separated industry string
 * @returns {Array} - Array of skill/industry tags
 */
function parseSkillTags(industry) {
  if (!industry) {
    return [];
  }

  return industry.split(',').map(function(tag) {
    return tag.trim();
  }).filter(function(tag) {
    return tag.length > 0;
  });
}

/**
 * Render skill tags HTML
 * @param {string|Array} skills - Skills string or array
 * @returns {string} - HTML string with skill tag spans
 */
function renderSkillTags(skills) {
  var skillsArray;

  if (typeof skills === 'string') {
    skillsArray = parseSkillTags(skills);
  } else if (Array.isArray(skills)) {
    skillsArray = skills;
  } else {
    return '';
  }

  return skillsArray.map(function(skill) {
    return '<span class="skill-tag">' + escapeHtml(skill) + '</span>';
  }).join('');
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  // Same contract as runwaejs/util.js escapeHtml (this file loads later on
  // profile.html and replaces the global): quotes are escaped too, so the
  // result is safe inside quoted attributes, and 0 stays "0".
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

// Only http(s), relative and data:image URLs; anything else (javascript:, ...) -> fallback.
function marketplaceSafeUrl(url, fallback) {
  var str = String(url || '').trim();
  var probe = str.replace(/[\u0000-\u0020\u007f]+/g, '').toLowerCase();
  var scheme = probe.match(/^([a-z][a-z0-9+.\-]*):/);
  if (!str || (scheme && scheme[1] !== 'http' && scheme[1] !== 'https' && !/^data:image\//.test(probe))) return fallback;
  return str;
}

/**
 * Initialize the marketplace profile layout
 * Called after user data is loaded
 * @param {Object} userData - User data snapshot
 */
function initMarketplaceProfile(userData) {
  if (!userData || !userData.val()) {
    return;
  }

  var user = userData.val();

  // Online / response-time / member-since badges were removed (no data behind them); member since and the
  // rating summary are set from the real record by display.js rwTrustSignals and reviews.js rwRatingSummary.

  // Render skill tags
  var skillsEl = document.querySelector('.skill-tags');
  if (skillsEl && user.industry) {
    skillsEl.innerHTML = renderSkillTags(user.industry);
  }
}

/**
 * Render a service card from gig data
 * @param {Object} gig - Gig/service data
 * @returns {string} - HTML string for service card
 */
function renderServiceCard(gig) {
  if (!gig) return '';

  var image = escapeHtml(marketplaceSafeUrl(gig.photo_url || gig.image, 'img/default-gig.png'));
  var title = escapeHtml(gig.title || gig.caption || 'Service');
  var description = escapeHtml(gig.description || '');
  var price = gig.price || gig.compensation || 0;
  var rating = gig.rating || 0;
  var reviewCount = gig.review_count || 0;

  return '<div class="service-card" data-gig-id="' + escapeHtml(gig.key || gig.id || '') + '">' +
    '<img src="' + image + '" alt="' + title + '" class="service-card-image">' +
    '<div class="service-card-body">' +
      '<h4 class="service-title">' + title + '</h4>' +
      '<p class="service-description">' + description + '</p>' +
      '<div class="service-footer">' +
        '<div class="rating-stars">' +
          '<ion-icon name="star"></ion-icon>' +
          '<span>' + rating.toFixed(1) + '</span>' +
          '<span class="review-count">(' + reviewCount + ')</span>' +
        '</div>' +
        '<div class="service-price">' +
          'Starting at <strong>' + formatCurrency(price) + '</strong>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

/**
 * Render a review card
 * @param {Object} review - Review data
 * @returns {string} - HTML string for review card
 */
function renderReviewCard(review) {
  if (!review) return '';

  var avatar = escapeHtml(marketplaceSafeUrl(review.reviewer_photo || review.photo_url, 'img/default-avatar.png'));
  var name = escapeHtml(review.reviewer_name || review.username || 'Anonymous');
  var date = review.time ? timeDisplay(review.time) : '';
  var rating = review.rating || review.score || 5;
  var text = escapeHtml(review.body || review.text || '');

  // Convert 10-point scale to 5-point if needed
  var normalizedRating = rating > 5 ? rating / 2 : rating;

  return '<div class="review-card">' +
    '<div class="review-header">' +
      '<img src="' + avatar + '" alt="" class="reviewer-avatar">' +
      '<div class="reviewer-info">' +
        '<strong>' + name + '</strong>' +
        '<span class="review-date">' + date + '</span>' +
      '</div>' +
      '<div class="rating-stars">' +
        generateStarRating(normalizedRating, 5) +
      '</div>' +
    '</div>' +
    '<p class="review-text">' + text + '</p>' +
  '</div>';
}

// Export functions for global use
window.ProfileMarketplace = {
  calculateAverageRating: calculateAverageRating,
  generateStarRating: generateStarRating,
  formatCurrency: formatCurrency,
  formatNumber: formatNumber,
  parseSkillTags: parseSkillTags,
  renderSkillTags: renderSkillTags,
  initMarketplaceProfile: initMarketplaceProfile,
  renderServiceCard: renderServiceCard,
  renderReviewCard: renderReviewCard
};
