/*
 * PERF-001 follow-up (cycle 8): the landing-page subset of js/base-init.js.
 * welcome.html used to load base-init.js plus ~25 jQuery plugins it never uses
 * (calendar, charts, date pickers, sliders, media players, ...), because
 * base-init.js calls several of those plugins without checking they exist.
 * This file keeps only what /welcome needs: the fixed header, the mobile menu,
 * the nav scroll container and the floating-label form fields.
 */
(function ($) {
    "use strict";
    if (!$) return;

    $(function () {
        // Fixed header (Headroom).
        var $header = $('#header--standard');
        if ($header.length && $.fn.headroom) {
            $header.headroom({
                "offset": 100,
                "tolerance": 5,
                "classes": { "initial": "animated", "pinned": "slideDown", "unpinned": "slideUp" }
            });
        }

        // Nav scroll container.
        if ($.fn.perfectScrollbar) {
            $('.mCustomScrollbar').perfectScrollbar({ wheelPropagation: false });
        }

        // Floating labels on the subscribe/guide email fields.
        if ($.material) {
            $.material.init();
        }

        // Mobile menu: open, close, expand (same classes as base-init.js),
        // with aria-expanded kept in sync on the toggle button.
        var $menu = $('.header-menu');
        var $openBtn = $('.js-open-responsive-menu');
        function sync() { $openBtn.attr('aria-expanded', $menu.hasClass('open') ? 'true' : 'false'); }
        $openBtn.attr('aria-expanded', 'false');
        $openBtn.on('click', function () { $menu.toggleClass('open'); sync(); return false; });
        $('.js-close-responsive-menu').on('click', function () { $menu.removeClass('open'); sync(); return false; });
        $('.js-expanded-menu').on('click', function () { $menu.toggleClass('expanded-menu'); return false; });
        $(window).on('keydown', function (e) {
            if (e.which === 27 && $menu.hasClass('open')) { $menu.removeClass('open'); sync(); $openBtn.trigger('focus'); }
        });
        $(document).on('click', function (e) {
            if (!$(e.target).closest('.window-popup').length && $menu.hasClass('open')) { $menu.removeClass('open'); sync(); }
        });
    });
})(window.jQuery);
