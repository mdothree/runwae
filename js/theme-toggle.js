/* ==========================================================================
   Runwae Theme Toggle
   Light/Dark mode management with system preference detection
   ========================================================================== */

const ThemeManager = {
  STORAGE_KEY: 'runwae-theme',
  ATTRIBUTE: 'data-theme',

  /**
   * Initialize the theme manager
   */
  init: function() {
    // Apply theme immediately to prevent flash
    this.applyInitialTheme();

    // Bind event listeners once DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.bindToggle();
        this.watchSystemTheme();
      });
    } else {
      this.bindToggle();
      this.watchSystemTheme();
    }
  },

  /**
   * Apply initial theme (called immediately, before DOM ready)
   */
  applyInitialTheme: function() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (systemPrefersDark ? 'dark' : 'light');

    document.documentElement.setAttribute(this.ATTRIBUTE, theme);
  },

  /**
   * Get the current theme
   * @returns {string} 'light' or 'dark'
   */
  getTheme: function() {
    return document.documentElement.getAttribute(this.ATTRIBUTE) || 'light';
  },

  /**
   * Set the theme
   * @param {string} theme - 'light' or 'dark'
   */
  setTheme: function(theme) {
    document.documentElement.setAttribute(this.ATTRIBUTE, theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.updateToggleIcon(theme);
    this.dispatchThemeChange(theme);
  },

  /**
   * Toggle between light and dark themes
   */
  toggle: function() {
    const current = this.getTheme();
    const newTheme = current === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  },

  /**
   * Update the toggle button icon
   * @param {string} theme - Current theme
   */
  updateToggleIcon: function(theme) {
    const icons = document.querySelectorAll('.theme-toggle ion-icon');
    icons.forEach(icon => {
      icon.setAttribute('name', theme === 'dark' ? 'sunny-outline' : 'moon-outline');
    });

    // Update title/tooltip
    const toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(toggle => {
      toggle.setAttribute('title', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  },

  /**
   * Bind click events to theme toggle buttons
   */
  bindToggle: function() {
    // Update icons to match current theme
    this.updateToggleIcon(this.getTheme());

    // Event delegation for toggle buttons
    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('.theme-toggle');
      if (toggle) {
        e.preventDefault();
        this.toggle();
      }
    });

    // Keyboard accessibility
    document.addEventListener('keydown', (e) => {
      const toggle = e.target.closest('.theme-toggle');
      if (toggle && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        this.toggle();
      }
    });
  },

  /**
   * Watch for system theme changes
   */
  watchSystemTheme: function() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    mediaQuery.addEventListener('change', (e) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  },

  /**
   * Dispatch a custom event when theme changes
   * @param {string} theme - New theme
   */
  dispatchThemeChange: function(theme) {
    const event = new CustomEvent('themechange', {
      detail: { theme },
      bubbles: true
    });
    document.dispatchEvent(event);
  },

  /**
   * Reset to system preference
   */
  resetToSystem: function() {
    localStorage.removeItem(this.STORAGE_KEY);
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.setTheme(systemPrefersDark ? 'dark' : 'light');
  }
};

// Initialize immediately
ThemeManager.init();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
} else {
  window.ThemeManager = ThemeManager;
}
