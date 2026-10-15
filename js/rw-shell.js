/*
 * rw-shell.js — behaviour for the shared rw.css header/footer (2026-10-14 style port).
 * Pure progressive enhancement over the legacy JS hooks; it never talks to Firebase itself.
 *  - count badges (.unreadMessagesCount / .unreadNotificationsCount, filled by messages.js / notifications.js)
 *    are hidden at 0 or empty; the avatar dot shows only when there are unread notifications.
 *  - auth state for the header: html[data-rw-auth="in"|"out"] from what navHQ.js does to .nav-prof
 *    (navHQ shows it when signed in, removes it when signed out).
 *  - the Profile tab reuses navHQ's own #navName click handler (profileRelocate) when it is bound.
 *  - the avatar menu (<details>) closes on outside click / Escape; the Theme row shows the current theme.
 */
(function () {
  'use strict';
  var root = document.documentElement;

  function num(el) {
    var n = parseInt((el.textContent || '').replace(/[^\d-]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  }

  function syncCounts() {
    var els = document.querySelectorAll('.unreadMessagesCount, .unreadNotificationsCount');
    for (var i = 0; i < els.length; i++) {
      var on = num(els[i]) > 0;
      if (els[i].hidden === on) els[i].hidden = !on;
    }
    var notes = document.querySelector('.rw-header .unreadNotificationsCount');
    var dot = document.querySelector('.rw-header .rw-dot');
    if (dot) {
      var show = !!(notes && num(notes) > 0);
      if (dot.hidden === show) dot.hidden = !show;
      var sum = document.querySelector('.rw-menu > summary');
      if (sum) sum.setAttribute('aria-label', show ? 'Your Account, ' + num(notes) + ' unread notifications' : 'Your Account');
    }
  }

  function syncAuth() {
    var header = document.querySelector('.rw-header');
    if (!header) return;
    var prof = header.querySelector('.nav-prof');
    var state;
    if (!prof) {
      state = 'out';
    } else if (header.classList.contains('rw-header--app')) {
      var name = document.getElementById('navName');
      var pic = document.getElementById('navProfilePicture');
      state = (name && name.textContent.trim()) || (pic && pic.getAttribute('src')) ? 'in' : 'pending';
    } else {
      state = prof.style.display && prof.style.display !== 'none' ? 'in' : 'pending';
    }
    if (root.getAttribute('data-rw-auth') !== state) root.setAttribute('data-rw-auth', state);
    var pic2 = document.getElementById('navProfilePicture');
    if (pic2) {
      var has = !!pic2.getAttribute('src');
      pic2.parentNode.classList.toggle('rw-avatar--has-img', has);
      var nm = document.getElementById('navName');
      var initials = nm ? nm.textContent.trim().split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2) : '';
      pic2.parentNode.setAttribute('data-initials', initials.toUpperCase());
    }
  }

  function syncTheme() {
    var l = document.getElementById('rwThemeLabel');
    if (l) l.textContent = root.getAttribute('data-theme') === 'dark' ? 'Dark' : 'Light';
  }

  var queued = false;
  function syncAll() {
    queued = false;
    syncCounts();
    syncAuth();
    syncTheme();
  }
  function queue() {
    if (!queued) { queued = true; (window.requestAnimationFrame || setTimeout)(syncAll); }
  }

  function init() {
    syncAll();
    if ('MutationObserver' in window) {
      var header = document.querySelector('.rw-header');
      var mo = new MutationObserver(queue);
      if (header) mo.observe(header, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style', 'src'] });
      mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
      // counts can also live in page bodies
      var counts = document.querySelectorAll('.unreadMessagesCount, .unreadNotificationsCount');
      for (var i = 0; i < counts.length; i++) {
        if (!header || !header.contains(counts[i])) mo.observe(counts[i], { childList: true, characterData: true, subtree: true });
      }
    }
    document.addEventListener('themechange', syncTheme);

    // Profile tab -> navHQ's profileRelocate via its #navName handler (keeps the encrypted profile URL logic in one place)
    var plink = document.querySelector('.rw-profile-link');
    if (plink) {
      plink.addEventListener('click', function (e) {
        var $ = window.jQuery, name = document.getElementById('navName');
        var ev = $ && name && $._data ? $._data(name, 'events') : null;
        if (ev && ev.click && ev.click.length) {
          e.preventDefault();
          $(name).trigger('click');
        }
      });
    }

    // Avatar menu: close on outside click and Escape
    var menu = document.getElementById('rwMenu');
    if (menu) {
      document.addEventListener('click', function (e) {
        if (menu.open && !menu.contains(e.target)) menu.open = false;
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && menu.open) {
          menu.open = false;
          var s = menu.querySelector('summary');
          if (s) s.focus();
        }
      });
      // the AI assistant / theme rows act, then the menu closes
      menu.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('.llm-chat-toggle')) menu.open = false;
      });
    }
  }

  // Legacy layout guard (gig): the agreement stepper's panels are position:absolute, so they take no space in
  // flow and the shared footer would be drawn over them. Reserve room under the lowest visible panel.
  function guardAbsolute() {
    var main = document.querySelector('main.main-header');
    var tabs = document.querySelectorAll('.progress_inner .tab, #detailsContainer .ui-block, #historyContainer .ui-block, #disputesContainer .ui-block');
    if (!main || !tabs.length) return;
    var top = main.getBoundingClientRect().top, bottom = 0;
    for (var i = 0; i < tabs.length; i++) {
      var r = tabs[i].getBoundingClientRect();
      if (r.height) bottom = Math.max(bottom, r.bottom - top);
    }
    var need = Math.ceil(bottom + 48);
    if (need > 48 && parseInt(main.style.minHeight || '0', 10) !== need) main.style.minHeight = need + 'px';
  }
  if (document.querySelector('.progress_inner')) {
    window.addEventListener('load', guardAbsolute);
    window.addEventListener('resize', guardAbsolute);
    document.addEventListener('change', function () { setTimeout(guardAbsolute, 50); });
    document.addEventListener('click', function () { setTimeout(guardAbsolute, 50); setTimeout(guardAbsolute, 600); });
    var n = 0, iv = setInterval(function () { guardAbsolute(); if (++n > 20) clearInterval(iv); }, 500);
  }

  // every <details class="rw-menu"> (avatar menu, mobile public menu): close on outside click / Escape
  document.addEventListener('click', function (e) {
    var open = document.querySelectorAll('details.rw-menu[open]');
    for (var i = 0; i < open.length; i++) if (!open[i].contains(e.target)) open[i].open = false;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = document.querySelectorAll('details.rw-menu[open]');
    for (var i = 0; i < open.length; i++) { open[i].open = false; var s = open[i].querySelector('summary'); if (s) s.focus(); }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
