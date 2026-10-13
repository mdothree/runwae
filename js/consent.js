/*
 * SURF-008: first-party cookie consent for runwae.com (no third-party CMP).
 *
 * Load this file synchronously in <head> on every page, BEFORE any inline Firebase init:
 *   <script src="/js/consent.js"></script>
 *
 * Tracker scripts are written into the HTML as inert placeholders:
 *   <script type="text/plain" data-consent="analytics" data-src="https://..."></script>
 * They are only turned into real <script> elements after the visitor clicks "Accept".
 * Until then no Google Analytics (Firebase Analytics / gtag), AdSense, ManyChat, Facebook SDK
 * or first-party page-hit counter is loaded, and no tracking cookie is set.
 *
 * Inline page code calls RunwaeConsent.analytics() instead of firebase.analytics(); it returns
 * a stand-in whose logEvent()/setUserId()/... calls are dropped until consent is given, then
 * forwarded to the real Firebase Analytics instance.
 *
 * The choice is stored in a first-party cookie (runwae_consent, 180 days) mirrored to
 * localStorage. A "Cookie settings" control (footer, and the privacy page) reopens the banner.
 */
(function () {
  'use strict';

  var COOKIE = 'runwae_consent';
  var VERSION = '1';
  var MAX_AGE = 60 * 60 * 24 * 180; // 180 days (~6 months)
  var PRIVACY_URL = '/privacy#cookies';

  // ---- stored choice ------------------------------------------------------
  function readChoice() {
    var m = document.cookie.match(/(?:^|;\s*)runwae_consent=([^;]*)/);
    var v = m ? decodeURIComponent(m[1]) : null;
    if (!v) {
      try { v = window.localStorage.getItem(COOKIE); } catch (e) { v = null; }
    }
    if (v === VERSION + '.granted') return 'granted';
    if (v === VERSION + '.denied') return 'denied';
    return null;
  }

  function writeChoice(choice) {
    var v = VERSION + '.' + choice;
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = COOKIE + '=' + encodeURIComponent(v) + '; Max-Age=' + MAX_AGE + '; Path=/; SameSite=Lax' + secure;
    try { window.localStorage.setItem(COOKIE, v); } catch (e) { /* storage blocked: cookie is enough */ }
  }

  var choice = readChoice();

  // ---- analytics stand-in -------------------------------------------------
  var realAnalytics = null;
  function forward(method) {
    return function () {
      if (realAnalytics && typeof realAnalytics[method] === 'function') {
        try { return realAnalytics[method].apply(realAnalytics, arguments); } catch (e) { /* never break the page */ }
      }
    };
  }
  var analyticsProxy = {
    logEvent: forward('logEvent'),
    setUserId: forward('setUserId'),
    setUserProperties: forward('setUserProperties'),
    setCurrentScreen: forward('setCurrentScreen'),
    setAnalyticsCollectionEnabled: forward('setAnalyticsCollectionEnabled')
  };

  // ---- Google Consent Mode v2 (only set up once trackers are allowed) ------
  function consentModeGranted() {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () { window.dataLayer.push(arguments); };
    }
    window.gtag('consent', 'default', {
      ad_storage: 'denied', analytics_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('consent', 'update', {
      ad_storage: 'granted', analytics_storage: 'granted',
      ad_user_data: 'granted', ad_personalization: 'granted'
    });
  }

  // ---- loading gated scripts ---------------------------------------------
  var activated = false;

  function initFirebaseAnalytics(tries) {
    var fb = window.firebase;
    if (fb && typeof fb.analytics === 'function' && fb.apps && fb.apps.length) {
      try { realAnalytics = fb.analytics(); } catch (e) { /* analytics unsupported in this browser */ }
      return;
    }
    if ((tries || 0) < 100) setTimeout(function () { initFirebaseAnalytics((tries || 0) + 1); }, 100);
  }

  function loadPlaceholder(ph, done) {
    var s = document.createElement('script');
    s.src = ph.getAttribute('data-src');
    s.async = true;
    var copy = ['data-ad-client', 'crossorigin', 'integrity'];
    for (var i = 0; i < copy.length; i++) {
      if (ph.hasAttribute(copy[i])) s.setAttribute(copy[i], ph.getAttribute(copy[i]));
    }
    var init = ph.getAttribute('data-consent-init');
    s.onload = function () {
      if (init === 'firebase-analytics') initFirebaseAnalytics(0);
      done();
    };
    s.onerror = function () { done(); };
    ph.parentNode.insertBefore(s, ph.nextSibling);
  }

  function activate() {
    if (activated) return;
    activated = true;
    consentModeGranted();
    var list = document.querySelectorAll('script[type="text/plain"][data-consent][data-src]');
    // Independent scripts load in parallel; Firebase Analytics is initialised in its own onload,
    // and the Firebase app/database they rely on are already set up by the page at this point.
    for (var i = 0; i < list.length; i++) loadPlaceholder(list[i], function () {});
  }

  function clearTrackingCookies() {
    var names = document.cookie.split(';').map(function (c) { return c.split('=')[0].trim(); });
    var host = location.hostname;
    var domains = ['', host, '.' + host.replace(/^www\./, '')];
    names.forEach(function (n) {
      if (/^(_ga|_gid|_gat|_gcl_|__gads|__gpi|__eoi|_fbp|mc_)/.test(n)) {
        domains.forEach(function (d) {
          document.cookie = n + '=; Max-Age=0; Path=/' + (d ? '; Domain=' + d : '');
        });
      }
    });
  }

  // ---- banner UI ----------------------------------------------------------
  var CSS = [
    '#rw-consent{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#1f1d2e;color:#fff;',
    'box-shadow:0 -4px 16px rgba(0,0,0,.25);font:15px/1.5 Roboto,Arial,sans-serif;padding:16px}',
    '#rw-consent[hidden]{display:none}',
    '#rw-consent .rw-c-inner{max-width:1100px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:12px 24px}',
    '#rw-consent .rw-c-text{flex:1 1 420px;margin:0;color:#fff}',
    '#rw-consent .rw-c-title{display:block;font-weight:700;font-size:16px;margin:0 0 4px;color:#fff}',
    '#rw-consent a{color:#c9c4ff;text-decoration:underline}',
    '#rw-consent .rw-c-actions{display:flex;gap:12px;flex:0 0 auto}',
    '#rw-consent button{min-width:112px;min-height:44px;padding:10px 20px;border-radius:6px;border:2px solid #fff;',
    'background:#fff;color:#1f1d2e;font:700 15px/1 Roboto,Arial,sans-serif;cursor:pointer}',
    '#rw-consent button:hover{background:#e9e7ff}',
    '#rw-consent a:focus-visible,#rw-consent button:focus-visible{outline:3px solid #ffd54a;outline-offset:2px}',
    '@media (max-width:600px){#rw-consent .rw-c-actions{width:100%}#rw-consent button{flex:1 1 0}}',
    '.rw-cookie-settings{background:none;border:0;padding:0 4px;margin:0;color:inherit;font:inherit;',
    'text-decoration:underline;cursor:pointer;min-height:44px;display:inline-flex;align-items:center}',
    '.rw-cookie-settings:focus-visible,.rw-cookie-btn:focus-visible{outline:3px solid #ffd54a;outline-offset:2px}',
    '.rw-cookie-btn{background:#6259e8;color:#fff;border:0;border-radius:6px;min-height:44px;padding:10px 20px;',
    'font:700 15px/1.2 Roboto,Arial,sans-serif;cursor:pointer}.rw-cookie-btn:hover{background:#4f46d4}'
  ].join('');

  var banner = null;
  var returnFocusTo = null;

  function ensureStyle() {
    if (document.getElementById('rw-consent-style')) return;
    var style = document.createElement('style');
    style.id = 'rw-consent-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function buildBanner() {
    ensureStyle();

    banner = document.createElement('section');
    banner.id = 'rw-consent';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-labelledby', 'rw-consent-title');
    banner.setAttribute('aria-describedby', 'rw-consent-desc');
    banner.hidden = true;
    banner.innerHTML =
      '<div class="rw-c-inner">' +
        '<p class="rw-c-text"><span class="rw-c-title" id="rw-consent-title">Cookies and analytics</span>' +
        '<span id="rw-consent-desc">With your OK we use Google Analytics (via Firebase), Google AdSense, ' +
        'the ManyChat chat widget, the Facebook SDK (on some pages) and our own page-visit counter. ' +
        'They set cookies and send usage data to those providers. None of them load unless you accept. ' +
        '<a href="' + PRIVACY_URL + '">How we use cookies</a></span></p>' +
        '<div class="rw-c-actions" role="group" aria-label="Cookie choice">' +
          '<button type="button" data-rw-consent="granted">Accept</button>' +
          '<button type="button" data-rw-consent="denied">Reject</button>' +
        '</div>' +
      '</div>';

    banner.addEventListener('click', function (ev) {
      var t = ev.target.closest ? ev.target.closest('[data-rw-consent]') : null;
      if (t) decide(t.getAttribute('data-rw-consent'));
    });

    // Keep the skip link first in tab order; otherwise the banner is the first thing reached.
    var first = document.body.firstElementChild;
    if (first && first.classList && first.classList.contains('skip-link')) {
      document.body.insertBefore(banner, first.nextSibling);
    } else {
      document.body.insertBefore(banner, document.body.firstChild);
    }
  }

  function show(focus) {
    if (!banner) buildBanner();
    banner.hidden = false;
    if (focus) {
      var b = banner.querySelector('button');
      if (b) b.focus();
    }
  }

  function hide() {
    if (banner) banner.hidden = true;
    if (returnFocusTo && document.contains(returnFocusTo)) returnFocusTo.focus();
    returnFocusTo = null;
  }

  function decide(next) {
    var prev = choice;
    choice = next;
    writeChoice(next);
    hide();
    if (next === 'granted') {
      activate();
    } else {
      if (activated) {
        // Stop Google tags writing cookies again before we clear them and reload.
        try { window.gtag('consent', 'update', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }); } catch (e) { /* ignore */ }
        analyticsProxy.setAnalyticsCollectionEnabled(false);
      }
      clearTrackingCookies();
      // Scripts that already ran cannot be unloaded; a reload starts the page clean.
      if (prev === 'granted' || activated) location.reload();
    }
  }

  function open(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    returnFocusTo = (ev && ev.currentTarget) || document.activeElement;
    show(true);
  }

  function addSettingsLinks() {
    var slots = document.querySelectorAll('.sub-footer-copyright, .footer-bottom');
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].querySelector('[data-cookie-settings]')) continue;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rw-cookie-settings';
      btn.setAttribute('data-cookie-settings', '');
      btn.textContent = 'Cookie settings';
      slots[i].appendChild(document.createTextNode(' '));
      slots[i].appendChild(btn);
    }
    var triggers = document.querySelectorAll('[data-cookie-settings]');
    for (var j = 0; j < triggers.length; j++) {
      triggers[j].addEventListener('click', open);
    }
    if (triggers.length) ensureStyle();
  }

  function onReady() {
    addSettingsLinks();
    if (choice === 'granted') activate();
    else if (choice === 'denied') clearTrackingCookies(); // leftovers from an earlier Accept
    else show(false);
  }

  window.RunwaeConsent = {
    analytics: function () { return analyticsProxy; },
    status: function () { return choice; },
    open: open
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
