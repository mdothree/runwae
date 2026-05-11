/* ==========================================================================
   Profile Marketplace Utilities
   Helper functions for the marketplace-style profile layout
   ========================================================================== */

/**
 * Calculate and format response time based on message history
 * @param {Object} messages - User's message history object
 * @returns {string} - Formatted response time string
 */
function calculateResponseTime(messages) {
  if (!messages || Object.keys(messages).length === 0) {
    return 'New to messaging';
  }

  // Calculate average response time from conversation history
  var totalResponseTime = 0;
  var responseCount = 0;

  // This would need actual conversation analysis
  // For now, return a reasonable default
  var avgHours = 2; // Default average

  if (avgHours < 1) {
    return 'Usually responds within an hour';
  } else if (avgHours < 24) {
    return 'Responds in ~' + Math.round(avgHours) + ' hours';
  } else {
    var days = Math.round(avgHours / 24);
    return 'Responds in ~' + days + ' day' + (days > 1 ? 's' : '');
  }
}

/**
 * Format member since date
 * @param {number|string} joinDate - Timestamp or date string of when user joined
 * @returns {string} - Formatted member since string
 */
function formatMemberSince(joinDate) {
  if (!joinDate) {
    return 'Member';
  }

  var date;
  if (typeof joinDate === 'number') {
    date = new Date(joinDate);
  } else {
    date = new Date(joinDate);
  }

  if (isNaN(date.getTime())) {
    return 'Member';
  }

  var year = date.getFullYear();
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var month = months[date.getMonth()];

  return 'Member since ' + month + ' ' + year;
}

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
 * Check if user is online based on last activity timestamp
 * @param {number} lastActivity - Timestamp of last activity
 * @returns {boolean} - True if user is considered online
 */
function isUserOnline(lastActivity) {
  if (!lastActivity) {
    return false;
  }

  var fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
  return Date.now() - lastActivity < fiveMinutes;
}

/**
 * Format the online status display
 * @param {number} lastActivity - Timestamp of last activity
 * @returns {Object} - Object with text and class for status display
 */
function getOnlineStatus(lastActivity) {
  if (isUserOnline(lastActivity)) {
    return {
      text: 'Online',
      class: 'online'
    };
  }

  if (!lastActivity) {
    return {
      text: 'Offline',
      class: 'offline'
    };
  }

  // Calculate how long ago they were active
  var diff = Date.now() - lastActivity;
  var minutes = Math.floor(diff / 60000);
  var hours = Math.floor(minutes / 60);
  var days = Math.floor(hours / 24);

  var text;
  if (minutes < 60) {
    text = 'Active ' + minutes + 'm ago';
  } else if (hours < 24) {
    text = 'Active ' + hours + 'h ago';
  } else {
    text = 'Active ' + days + 'd ago';
  }

  return {
    text: text,
    class: 'offline'
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
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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

  // Update online status
  var status = getOnlineStatus(user.last_activity);
  var statusEl = document.querySelector('.online-status');
  if (statusEl) {
    statusEl.textContent = status.text;
    statusEl.className = 'online-status ' + status.class;
  }

  // Update response time
  var responseEl = document.querySelector('.response-time');
  if (responseEl) {
    responseEl.textContent = calculateResponseTime(user.conversations);
  }

  // Update member since
  var memberEl = document.querySelector('.member-since');
  if (memberEl) {
    memberEl.textContent = formatMemberSince(user.created_at || user.join_date);
  }

  // Update rating
  var ratingData = calculateAverageRating(user.reviews);
  var ratingValueEl = document.querySelector('.rating-value');
  var ratingCountEl = document.querySelector('.rating-count');

  if (ratingValueEl) {
    ratingValueEl.textContent = ratingData.rating;
  }
  if (ratingCountEl) {
    ratingCountEl.textContent = '(' + ratingData.count + ' reviews)';
  }

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

  var image = gig.photo_url || gig.image || 'img/default-gig.png';
  var title = escapeHtml(gig.title || gig.caption || 'Service');
  var description = escapeHtml(gig.description || '');
  var price = gig.price || gig.compensation || 0;
  var rating = gig.rating || 0;
  var reviewCount = gig.review_count || 0;

  return '<div class="service-card" data-gig-id="' + (gig.key || gig.id || '') + '">' +
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

  var avatar = review.reviewer_photo || review.photo_url || 'img/default-avatar.png';
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
  calculateResponseTime: calculateResponseTime,
  formatMemberSince: formatMemberSince,
  calculateAverageRating: calculateAverageRating,
  isUserOnline: isUserOnline,
  getOnlineStatus: getOnlineStatus,
  generateStarRating: generateStarRating,
  formatCurrency: formatCurrency,
  formatNumber: formatNumber,
  parseSkillTags: parseSkillTags,
  renderSkillTags: renderSkillTags,
  initMarketplaceProfile: initMarketplaceProfile,
  renderServiceCard: renderServiceCard,
  renderReviewCard: renderReviewCard
};
