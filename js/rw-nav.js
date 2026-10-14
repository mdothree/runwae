/* rw-nav.js — wiring for the one rw header (2026-10-14 style port). No new features:
 * 1. The "Profile" nav item does what clicking your avatar always did (navHQ.js binds
 *    #navProfilePicture -> profileRelocate); before sign-in resolves it is a plain link.
 * 2. The avatar menu (<details class="rw-menu">) shows your photo, closes on outside click / Escape.
 * 3. Unread badges (.unreadMessagesCount / .unreadNotificationsCount, filled by messages.js /
 *    notifications.js) are hidden when empty or zero, so no empty badge squares.
 */
(function () {
  'use strict';
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    var pic = document.getElementById('navProfilePicture');
    var prof = document.querySelectorAll('.rw-nav-profile');
    for (var i = 0; i < prof.length; i++) {
      prof[i].addEventListener('click', function (e) {
        if (pic && window.jQuery && jQuery._data && (jQuery._data(pic, 'events') || {}).click) { e.preventDefault(); jQuery(pic).trigger('click'); }
      });
    }
    var me = document.querySelectorAll('.rw-avatar--me img');
    function syncPic() { if (!pic) return; var s = pic.getAttribute('src'); for (var j = 0; j < me.length; j++) if (s) me[j].setAttribute('src', s); }
    if (pic && me.length) { syncPic(); new MutationObserver(syncPic).observe(pic, { attributes: true, attributeFilter: ['src'] }); }

    function zero(el) { var t = (el.textContent || '').trim(); return !t || t === '0' || t === 'undefined' || t === 'null'; }
    function syncBadges() {
      var b = document.querySelectorAll('.unreadMessagesCount, .unreadNotificationsCount');
      for (var k = 0; k < b.length; k++) { if (zero(b[k])) b[k].setAttribute('data-zero', ''); else b[k].removeAttribute('data-zero'); }
      var dot = document.querySelector('.rw-menu .rw-dot'), n = document.querySelector('.rw-menu .unreadNotificationsCount');
      if (dot) { if (n && !zero(n)) dot.removeAttribute('data-zero'); else dot.setAttribute('data-zero', ''); }
    }
    syncBadges();
    var badges = document.querySelectorAll('.unreadMessagesCount, .unreadNotificationsCount');
    for (var m = 0; m < badges.length; m++) new MutationObserver(syncBadges).observe(badges[m], { childList: true, characterData: true, subtree: true });

    var menu = document.querySelector('details.rw-menu');
    if (menu) {
      document.addEventListener('click', function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.open) { menu.open = false; var s = menu.querySelector('summary'); if (s) s.focus(); } });
    }
  });
})();
