/**
 * Console Toggle Utility
 * Controls console output based on environment/configuration
 *
 * Usage:
 * - Set window.RUNWAE_DEBUG = true to enable console output
 * - Or add ?debug=true to URL
 * - Or set localStorage.setItem('runwae_debug', 'true')
 */
(function() {
    'use strict';

    // Determine if debug mode should be enabled
    var isDebugMode = (function() {
        // Check window flag
        if (typeof window.RUNWAE_DEBUG !== 'undefined') {
            return window.RUNWAE_DEBUG;
        }

        // Check URL parameter
        var urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') === 'true') {
            return true;
        }

        // Check localStorage
        try {
            if (localStorage.getItem('runwae_debug') === 'true') {
                return true;
            }
        } catch (e) {
            // localStorage not available
        }

        // Check if running on localhost/development
        var hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
            return true;
        }

        // Default: production mode (no console output)
        return false;
    })();

    // Store original console methods
    var originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info,
        debug: console.debug
    };

    // Create no-op function
    var noop = function() {};

    // Override console methods if not in debug mode
    if (!isDebugMode) {
        console.log = noop;
        console.info = noop;
        console.debug = noop;
        // Keep warn and error for critical issues
        // console.warn = noop;
        // console.error = noop;
    }

    // Expose utility to enable/disable debug mode at runtime
    window.RunwaeDebug = {
        enable: function() {
            console.log = originalConsole.log;
            console.warn = originalConsole.warn;
            console.error = originalConsole.error;
            console.info = originalConsole.info;
            console.debug = originalConsole.debug;
            try {
                localStorage.setItem('runwae_debug', 'true');
            } catch (e) {}
            originalConsole.log('[Runwae] Debug mode enabled');
        },
        disable: function() {
            console.log = noop;
            console.info = noop;
            console.debug = noop;
            try {
                localStorage.removeItem('runwae_debug');
            } catch (e) {}
        },
        isEnabled: function() {
            return isDebugMode;
        }
    };

    // Log status if debug is enabled
    if (isDebugMode) {
        originalConsole.log('[Runwae] Debug mode enabled');
    }
})();
