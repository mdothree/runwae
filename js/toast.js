/* ==========================================================================
   Runwae Toast Notification System
   Non-intrusive feedback for user actions
   ========================================================================== */

const Toast = {
  container: null,
  defaultDuration: 5000,
  maxToasts: 5,

  /**
   * Initialize the toast system
   */
  init: function() {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.setAttribute('role', 'alert');
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(this.container);
  },

  /**
   * Show a toast notification
   * @param {object} options - Toast options
   * @param {string} options.title - Toast title
   * @param {string} options.message - Toast message
   * @param {string} options.type - Toast type: 'success', 'error', 'warning', 'info'
   * @param {number} options.duration - Auto-dismiss duration in ms (0 for persistent)
   * @param {boolean} options.closable - Show close button
   * @returns {HTMLElement} The toast element
   */
  show: function(options = {}) {
    this.init();

    const {
      title = '',
      message = '',
      type = 'info',
      duration = this.defaultDuration,
      closable = true
    } = options;

    // Enforce max toasts
    while (this.container.children.length >= this.maxToasts) {
      this.dismiss(this.container.firstChild);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');

    // Icon based on type
    const icons = {
      success: 'checkmark-circle',
      error: 'alert-circle',
      warning: 'warning',
      info: 'information-circle'
    };

    toast.innerHTML = `
      <div class="toast-icon">
        <ion-icon name="${icons[type] || icons.info}"></ion-icon>
      </div>
      <div class="toast-content">
        ${title ? `<p class="toast-title">${this.escapeHtml(title)}</p>` : ''}
        ${message ? `<p class="toast-message">${this.escapeHtml(message)}</p>` : ''}
      </div>
      ${closable ? `
        <button class="toast-close" aria-label="Dismiss notification">
          <ion-icon name="close"></ion-icon>
        </button>
      ` : ''}
      ${duration > 0 ? `<div class="toast-progress" style="animation-duration: ${duration}ms"></div>` : ''}
    `;

    // Add to container
    this.container.appendChild(toast);

    // Bind close button
    if (closable) {
      const closeBtn = toast.querySelector('.toast-close');
      closeBtn.addEventListener('click', () => this.dismiss(toast));
    }

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto dismiss
    if (duration > 0) {
      toast.dismissTimeout = setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }

    // Pause on hover
    toast.addEventListener('mouseenter', () => {
      if (toast.dismissTimeout) {
        clearTimeout(toast.dismissTimeout);
        const progress = toast.querySelector('.toast-progress');
        if (progress) progress.style.animationPlayState = 'paused';
      }
    });

    toast.addEventListener('mouseleave', () => {
      if (duration > 0) {
        const progress = toast.querySelector('.toast-progress');
        if (progress) progress.style.animationPlayState = 'running';
        toast.dismissTimeout = setTimeout(() => {
          this.dismiss(toast);
        }, duration / 2); // Resume with half time
      }
    });

    return toast;
  },

  /**
   * Dismiss a toast
   * @param {HTMLElement} toast - The toast element to dismiss
   */
  dismiss: function(toast) {
    if (!toast || !toast.parentNode) return;

    if (toast.dismissTimeout) {
      clearTimeout(toast.dismissTimeout);
    }

    toast.classList.remove('show');
    toast.classList.add('hiding');

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: function() {
    if (!this.container) return;
    Array.from(this.container.children).forEach(toast => this.dismiss(toast));
  },

  /**
   * Convenience methods for different toast types
   */
  success: function(message, title = 'Success') {
    return this.show({ type: 'success', title, message });
  },

  error: function(message, title = 'Error') {
    return this.show({ type: 'error', title, message, duration: 8000 });
  },

  warning: function(message, title = 'Warning') {
    return this.show({ type: 'warning', title, message });
  },

  info: function(message, title = '') {
    return this.show({ type: 'info', title, message });
  },

  /**
   * Show a loading toast that must be manually dismissed
   * @param {string} message - Loading message
   * @returns {object} Object with dismiss method
   */
  loading: function(message = 'Loading...') {
    const toast = this.show({
      type: 'info',
      message,
      duration: 0,
      closable: false
    });

    // Replace icon with spinner
    const iconContainer = toast.querySelector('.toast-icon');
    if (iconContainer) {
      iconContainer.innerHTML = '<div class="ai-spinner"></div>';
    }

    return {
      dismiss: () => this.dismiss(toast),
      update: (newMessage) => {
        const msgEl = toast.querySelector('.toast-message');
        if (msgEl) msgEl.textContent = newMessage;
      },
      success: (successMessage) => {
        this.dismiss(toast);
        this.success(successMessage);
      },
      error: (errorMessage) => {
        this.dismiss(toast);
        this.error(errorMessage);
      }
    };
  },

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml: function(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Toast.init());
} else {
  Toast.init();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Toast;
} else {
  window.Toast = Toast;
}
