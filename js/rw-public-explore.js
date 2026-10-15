/*
 * rw-public-explore.js: the signed-out /explore view (2026-10-14, Principal: "Public explore feed").
 *
 * Signed in: does nothing (the legacy feed in exploreHQ.js renders as before).
 * Signed out: hides the legacy layout and renders a read-only feed from GET /api/public/explore.
 *
 * Safety: the API returns plain text that is NOT HTML-escaped. Everything here is built with
 * createElement + textContent / setAttribute. No innerHTML, no template replaceText(). Image src is
 * set only from https: URLs (checked again here, even though the API already filters them).
 * Every action (card, author, apply, message, follow, search) opens the sign-up prompt; nothing
 * redirects and nothing writes.
 */
(function () {
  'use strict';

  var API = '/api/public/explore';
  var LIMIT = 12;
  var TYPES = ['all', 'campaigns', 'services', 'posts'];
  var TYPE_LABEL = { campaign: 'Campaign', service: 'Service', post: 'Post' };
  var FILTER_NOUN = { all: 'opportunities', campaigns: 'campaigns', services: 'services', posts: 'posts' };
  var PLATFORM_LABEL = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook', twitter: 'X (Twitter)', linkedin: 'LinkedIn' };
  var COMP_LABEL = { paid: 'Paid', gift: 'Gifted product' };
  var PROMPT = {
    open: 'Sign up to see the full details.',
    author: 'Sign up to see profiles on Runwae.',
    apply: 'Sign up to apply to campaigns.',
    message: 'Sign up to message brands and influencers.',
    follow: 'Sign up to follow brands and influencers.',
    search: 'Sign up to search brands and influencers.'
  };

  var state = { started: false, type: 'all', cursor: null, seq: 0, loading: false };
  var el = {};

  // ---------------------------------------------------------------- helpers
  function own(o, k) { return typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null; }
  function httpsUrl(v) {
    if (typeof v !== 'string' || !v || v.length > 2048) return null;
    try {
      var u = new URL(v, window.location.href);
      return u.protocol === 'https:' && /^https:\/\//i.test(v) ? u.href : null;
    } catch (e) { return null; }
  }
  function str(v, max) {
    if (typeof v !== 'string') return '';
    return max && v.length > max ? v.slice(0, max) : v;
  }
  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function initials(name) {
    return str(name, 100).trim().split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase() || 'R';
  }
  function ago(ms) {
    var t = Number(ms);
    if (!isFinite(t) || t <= 0) return '';
    var s = Math.max(0, (Date.now() - t) / 1000);
    var steps = [[60, 'second'], [60, 'minute'], [24, 'hour'], [30, 'day'], [12, 'month'], [Infinity, 'year']];
    for (var i = 0; i < steps.length; i++) {
      if (s < steps[i][0]) {
        var n = Math.floor(s);
        if (i === 0) return 'just now';
        return n + ' ' + steps[i][1] + (n === 1 ? '' : 's') + ' ago';
      }
      s = s / steps[i][0];
    }
    return '';
  }

  // ---------------------------------------------------------------- sign-up prompt
  function openPrompt(kind) {
    var d = el.dialog;
    if (!d) return;
    el.promptText.textContent = own(PROMPT, kind) || PROMPT.open;
    d.setAttribute('data-kind', kind || 'open');
    if (typeof d.showModal === 'function') {
      if (!d.open) d.showModal();
    } else {
      d.setAttribute('open', '');
    }
    var first = d.querySelector('.rw-btn');
    if (first) first.focus();
  }
  function closePrompt() {
    var d = el.dialog;
    if (!d) return;
    if (typeof d.close === 'function' && d.open) d.close(); else d.removeAttribute('open');
  }

  // ---------------------------------------------------------------- card
  function avatar(author) {
    var wrap = node('span', 'rw-avatar rw-pubx-avatar');
    var src = httpsUrl(author && author.avatarUrl);
    if (src) {
      var img = document.createElement('img');
      img.setAttribute('alt', '');
      img.setAttribute('loading', 'lazy');
      img.setAttribute('referrerpolicy', 'no-referrer');
      img.addEventListener('error', function () { img.remove(); wrap.textContent = initials(author.displayName); });
      img.setAttribute('src', src);
      wrap.appendChild(img);
    } else {
      wrap.textContent = initials(author && author.displayName);
    }
    return wrap;
  }

  function actionButton(label, act, quiet) {
    var b = node('button', 'rw-btn rw-btn--sm ' + (quiet ? 'rw-btn--text' : 'rw-btn--quiet'), label);
    b.type = 'button';
    b.setAttribute('data-act', act);
    return b;
  }

  function card(item) {
    var author = item && typeof item.author === 'object' && item.author ? item.author : {};
    var type = own(TYPE_LABEL, item.type) ? item.type : 'post';
    var name = str(author.displayName, 100) || 'Runwae member';

    var art = node('article', 'rw-card rw-pubx-card');
    art.setAttribute('data-type', type);
    if (item.id !== undefined) art.setAttribute('data-id', str(String(item.id), 128));

    var row = node('div', 'rw-row');
    row.appendChild(avatar(author));
    var body = node('div', 'rw-row__body');

    var meta = node('div', 'rw-row__meta');
    var who = node('button', 'rw-pubx-author', name);
    who.type = 'button';
    who.setAttribute('data-act', 'author');
    meta.appendChild(who);
    var handle = str(author.handle, 64);
    if (handle) meta.appendChild(node('span', 'rw-pubx-handle', '@' + handle.replace(/^@+/, '')));
    var when = ago(item.createdAt);
    if (when) { meta.appendChild(node('span', null, '·')); meta.appendChild(node('span', null, when)); }
    body.appendChild(meta);

    var kind = node('span', 'rw-pubx-kind', TYPE_LABEL[type] + (author.role === 'brand' ? ' from a brand' : author.role === 'influencer' ? ' from an influencer' : ''));
    body.appendChild(kind);

    var title = str(item.title, 120);
    if (title) body.appendChild(node('h3', 'rw-pubx-title', title));
    var desc = str(item.description, 400);
    if (desc && desc !== title) body.appendChild(node('p', 'rw-muted rw-pubx-desc', desc));

    var m = item.media && typeof item.media === 'object' ? item.media : null;
    var mediaSrc = m ? httpsUrl(m.type === 'video' ? (m.posterUrl || null) : m.url) : null;
    if (mediaSrc) {
      var fig = node('div', 'rw-pubx-media' + (m.type === 'video' ? ' rw-pubx-media--video' : ''));
      var im = document.createElement('img');
      im.setAttribute('alt', '');
      im.setAttribute('loading', 'lazy');
      im.setAttribute('referrerpolicy', 'no-referrer');
      im.addEventListener('error', function () { fig.remove(); });
      im.setAttribute('src', mediaSrc);
      fig.appendChild(im);
      body.appendChild(fig);
    }

    var tags = node('div', 'rw-chips rw-pubx-tags');
    (Array.isArray(item.platforms) ? item.platforms : []).forEach(function (p) {
      if (own(PLATFORM_LABEL, p)) tags.appendChild(node('span', 'rw-tag', own(PLATFORM_LABEL, p)));
    });
    (Array.isArray(item.tags) ? item.tags.slice(0, 5) : []).forEach(function (t) {
      var s = str(t, 40);
      if (s) tags.appendChild(node('span', 'rw-tag rw-tag--plain', s));
    });
    if (own(COMP_LABEL, item.compensation)) tags.appendChild(node('span', 'rw-tag', own(COMP_LABEL, item.compensation)));
    if (tags.childNodes.length) body.appendChild(tags);

    var acts = node('div', 'rw-actions rw-pubx-actions');
    if (type === 'campaign') { acts.appendChild(actionButton('Apply', 'apply')); acts.appendChild(actionButton('Message', 'message', true)); }
    else if (type === 'service') { acts.appendChild(actionButton('Message', 'message')); acts.appendChild(actionButton('Follow', 'follow', true)); }
    else { acts.appendChild(actionButton('Follow', 'follow')); acts.appendChild(actionButton('Message', 'message', true)); }
    body.appendChild(acts);

    row.appendChild(body);
    art.appendChild(row);
    return art;
  }

  // ---------------------------------------------------------------- states
  function showState(kind) {
    var s = el.state;
    if (!kind) { s.hidden = true; return; }
    s.hidden = false;
    var img = s.querySelector('img');
    var h = s.querySelector('h3');
    var p = s.querySelector('p');
    var btn = s.querySelector('[data-state-btn]');
    s.setAttribute('data-state', kind);
    if (kind === 'empty') {
      img.setAttribute('src', '/img/illo/research.png');
      h.textContent = state.type === 'all' ? 'Nothing to explore yet' : 'No ' + FILTER_NOUN[state.type] + ' yet';
      p.textContent = 'New campaigns, services and posts show up here as people share them. Check back soon.';
      btn.textContent = state.type === 'all' ? 'Sign up' : 'Show everything';
      btn.setAttribute('data-state-btn', state.type === 'all' ? 'signup' : 'all');
      btn.classList.add('rw-btn--quiet'); // the aside's Sign up stays the one primary button
    } else {
      img.setAttribute('src', '/img/illo/connection.png');
      h.textContent = "The feed didn't load";
      p.textContent = 'Something went wrong on our side or with the connection. Please try again.';
      btn.textContent = 'Try again';
      btn.setAttribute('data-state-btn', 'retry');
      btn.classList.remove('rw-btn--quiet');
    }
  }

  function setBusy(on) {
    state.loading = on;
    el.feed.setAttribute('aria-busy', on ? 'true' : 'false');
    el.more.disabled = on;
    el.more.textContent = on && el.feed.childNodes.length ? 'Loading…' : 'Load more';
    el.loading.hidden = !(on && !el.feed.childNodes.length);
  }

  // ---------------------------------------------------------------- data
  function load(append) {
    var seq = ++state.seq;
    var q = '?type=' + encodeURIComponent(state.type) + '&limit=' + LIMIT;
    if (append && state.cursor !== null) q += '&cursor=' + encodeURIComponent(String(state.cursor));
    el.moreError.hidden = true;
    if (!append) { el.feed.textContent = ''; showState(null); el.more.hidden = true; }
    setBusy(true);
    fetch(API + q, { credentials: 'omit', headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (seq !== state.seq) return;
        if (!data || !Array.isArray(data.items)) throw new Error('bad payload');
        var frag = document.createDocumentFragment();
        data.items.forEach(function (it) { if (it && typeof it === 'object') frag.appendChild(card(it)); });
        el.feed.appendChild(frag);
        var nc = Number(data.next_cursor);
        state.cursor = data.next_cursor !== null && data.next_cursor !== undefined && isFinite(nc) && nc > 0 ? nc : null;
        setBusy(false);
        el.more.hidden = state.cursor === null;
        if (!el.feed.childNodes.length) showState('empty');
      })
      .catch(function () {
        if (seq !== state.seq) return;
        setBusy(false);
        if (append && el.feed.childNodes.length) {
          el.moreError.hidden = false;
          el.more.hidden = false;
        } else {
          el.more.hidden = true;
          showState('error');
        }
      });
  }

  function setFilter(type) {
    if (TYPES.indexOf(type) < 0) type = 'all';
    state.type = type;
    state.cursor = null;
    var chips = el.filters.querySelectorAll('[data-type]');
    for (var i = 0; i < chips.length; i++) chips[i].setAttribute('aria-pressed', chips[i].getAttribute('data-type') === type ? 'true' : 'false');
    load(false);
  }

  // ---------------------------------------------------------------- start (signed out only)
  function start() {
    if (state.started) return;
    var root = document.getElementById('rwPublicExplore');
    if (!root) return;
    state.started = true;
    el.root = root;
    el.feed = document.getElementById('rwPubxFeed');
    el.state = document.getElementById('rwPubxState');
    el.more = document.getElementById('rwPubxMore');
    el.moreError = document.getElementById('rwPubxMoreError');
    el.loading = document.getElementById('rwPubxLoading');
    el.filters = document.getElementById('rwPubxFilters');
    el.dialog = document.getElementById('rwSignupPrompt');
    el.promptText = document.getElementById('rwSignupPromptText');

    // swap the legacy signed-in layout for the public one
    document.documentElement.classList.add('rw-pubx-on');
    var legacy = document.getElementById('rwAppExplore');
    if (legacy) legacy.hidden = true;
    var legacyMain = document.getElementById('main-content');
    if (legacyMain) legacyMain.hidden = true;
    root.hidden = false;
    var skip = document.querySelector('.skip-link');
    if (skip) skip.setAttribute('href', '#rwPublicExplore');

    el.filters.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-type]');
      if (b && b.getAttribute('aria-pressed') !== 'true') setFilter(b.getAttribute('data-type'));
    });
    el.more.addEventListener('click', function () { if (!state.loading && state.cursor !== null) load(true); });
    el.feed.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-act]');
      if (t && el.feed.contains(t)) { e.preventDefault(); openPrompt(t.getAttribute('data-act')); return; }
      if (e.target.closest && e.target.closest('.rw-pubx-card')) openPrompt('open');
    });
    el.state.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-state-btn]');
      if (!b) return;
      var k = b.getAttribute('data-state-btn');
      if (k === 'retry') load(false);
      else if (k === 'all') setFilter('all');
      else openPrompt('open');
    });
    var search = document.getElementById('rwPubxSearch');
    if (search) search.addEventListener('submit', function (e) { e.preventDefault(); openPrompt('search'); });
    if (el.dialog) {
      el.dialog.addEventListener('click', function (e) {
        if (e.target === el.dialog || (e.target.closest && e.target.closest('[data-close]'))) closePrompt();
      });
    }
    setFilter('all');
  }

  // test hooks for the screenshot harness (read-only)
  window.__rwPublicExplore = { openPrompt: openPrompt, closePrompt: closePrompt, setFilter: setFilter, state: state };

  function init() {
    if (!window.firebase || typeof firebase.auth !== 'function') { start(); return; }
    firebase.auth().onAuthStateChanged(function (user) { if (!user) start(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
