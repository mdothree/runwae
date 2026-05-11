/* ==========================================================================
   Runwae Safe Render Utilities
   XSS-safe text rendering with formatting support
   ========================================================================== */

const SafeRender = {
  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} text - Raw text input
   * @returns {string} - Escaped HTML-safe string
   */
  escapeHtml: function(text) {
    if (text == null) return '';
    const str = String(text);
    const htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, char => htmlEscapes[char]);
  },

  /**
   * Render text with newlines converted to <br> tags (XSS-safe)
   * @param {string} text - Raw text with potential newlines
   * @returns {string} - HTML string safe for innerHTML
   */
  textWithBreaks: function(text) {
    if (text == null) return '';
    // First escape HTML, then convert newlines to <br>
    return this.escapeHtml(text).replace(/\n/g, '<br>');
  },

  /**
   * Set element content with newlines as line breaks (XSS-safe)
   * @param {jQuery|Element|string} selector - jQuery object, DOM element, or selector
   * @param {string} text - Text to render
   */
  setTextWithBreaks: function(selector, text) {
    const $el = $(selector);
    if ($el.length) {
      $el.html(this.textWithBreaks(text));
    }
  },

  /**
   * Truncate text to a maximum length with ellipsis
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum character length
   * @returns {string} - Truncated text
   */
  truncate: function(text, maxLength) {
    if (text == null) return '';
    const str = String(text);
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
  },

  /**
   * Render truncated text with line breaks (XSS-safe)
   * @param {string} text - Raw text
   * @param {number} maxLength - Maximum length before truncation
   * @returns {string} - Safe HTML string
   */
  truncateWithBreaks: function(text, maxLength) {
    return this.textWithBreaks(this.truncate(text, maxLength));
  },

  /**
   * Parse and render URLs as clickable links (XSS-safe)
   * @param {string} text - Text potentially containing URLs
   * @returns {string} - HTML with links
   */
  linkify: function(text) {
    if (text == null) return '';
    const escaped = this.escapeHtml(text);
    // URL regex - matches http(s) URLs
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    return escaped.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  },

  /**
   * Render text with both links and line breaks (XSS-safe)
   * @param {string} text - Raw text
   * @returns {string} - Safe HTML string with links and breaks
   */
  richText: function(text) {
    if (text == null) return '';
    // Escape first, then linkify, then add breaks
    let html = this.escapeHtml(text);
    // Linkify URLs
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    html = html.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    // Convert newlines
    html = html.replace(/\n/g, '<br>');
    return html;
  },

  /**
   * Set element with rich text (links + breaks, XSS-safe)
   * @param {jQuery|Element|string} selector - jQuery object, DOM element, or selector
   * @param {string} text - Text to render
   */
  setRichText: function(selector, text) {
    const $el = $(selector);
    if ($el.length) {
      $el.html(this.richText(text));
    }
  },

  /**
   * Parse @mentions and #hashtags (XSS-safe)
   * @param {string} text - Text with mentions/hashtags
   * @param {object} options - Configuration for mention/hashtag URLs
   * @returns {string} - HTML with linked mentions and hashtags
   */
  parseMentions: function(text, options = {}) {
    if (text == null) return '';
    const escaped = this.escapeHtml(text);

    let html = escaped;

    // @mentions
    if (options.mentionUrl) {
      html = html.replace(/@(\w+)/g, `<a href="${options.mentionUrl}$1" class="mention">@$1</a>`);
    }

    // #hashtags
    if (options.hashtagUrl) {
      html = html.replace(/#(\w+)/g, `<a href="${options.hashtagUrl}$1" class="hashtag">#$1</a>`);
    }

    return html;
  },

  /**
   * Format a number for display (e.g., 1000 -> 1K)
   * @param {number} num - Number to format
   * @returns {string} - Formatted number string
   */
  formatNumber: function(num) {
    if (num == null || isNaN(num)) return '0';
    num = Number(num);
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return String(num);
  }
};

// jQuery plugin for convenient usage
if (typeof jQuery !== 'undefined') {
  $.fn.safeHtml = function(text) {
    return this.html(SafeRender.escapeHtml(text));
  };

  $.fn.safeText = function(text) {
    return this.text(text);
  };

  $.fn.textWithBreaks = function(text) {
    return this.html(SafeRender.textWithBreaks(text));
  };

  $.fn.richText = function(text) {
    return this.html(SafeRender.richText(text));
  };
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SafeRender;
} else {
  window.SafeRender = SafeRender;
}
