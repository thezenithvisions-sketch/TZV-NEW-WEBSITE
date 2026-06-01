/* Verdant — automatic split-text mask reveal for major headings
 * Standalone module: scans h1/h2/h3 in main content regions and upgrades
 * them with per-word mask wrappers, then reveals them on scroll.
 *
 * Does NOT touch headings owned by animations.js (data-animate="word-stagger").
 * Does NOT touch small body-area headings (team meta, timeline body, etc.).
 * Honors prefers-reduced-motion: reduce by leaving DOM untouched.
 */
(function () {
  'use strict';

  if (window.__verdantTextRevealInit) return;
  window.__verdantTextRevealInit = true;

  var CONTAINER_SELECTOR = 'main, header.about-hero, section, footer';
  var HEADING_SELECTOR = 'h1, h2, h3';

  // Headings inside any of these get skipped — they're small body-area
  // headings where per-word animation would feel noisy.
  var SKIP_ANCESTORS = [
    '.team-card-meta',
    '.timeline-body',
    '.award-body',
    '.principle-item .accordion-content',
    '.story-card-body',
    '.nav'
  ];

  var reduced = (function () {
    try {
      return window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  })();

  // ---------- helpers ----------

  function isInsideSkipAncestor(el) {
    for (var i = 0; i < SKIP_ANCESTORS.length; i++) {
      if (el.closest(SKIP_ANCESTORS[i])) return true;
    }
    return false;
  }

  // Only operate on headings whose children are all text nodes.
  // Anything with <a>, <span>, <strong>, etc. is left alone.
  function hasOnlyTextChildren(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType !== 3) return false;
    }
    return true;
  }

  // Wrap each word in <span class="tr-mask"><span class="tr-word" style="--ti:N">word</span></span>
  // Whitespace runs become plain text nodes between mask wrappers so words still wrap naturally.
  function splitHeading(el) {
    var text = el.textContent;
    if (!text) return false;
    var trimmed = text.replace(/\s+/g, '');
    if (!trimmed.length) return false;

    var tokens = text.split(/(\s+)/);
    while (el.firstChild) el.removeChild(el.firstChild);

    var wordIndex = 0;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t.length === 0) continue;
      if (/^\s+$/.test(t)) {
        el.appendChild(document.createTextNode(t));
      } else {
        var mask = document.createElement('span');
        mask.className = 'tr-mask';
        var word = document.createElement('span');
        word.className = 'tr-word';
        word.style.setProperty('--ti', String(wordIndex));
        word.textContent = t;
        mask.appendChild(word);
        el.appendChild(mask);
        wordIndex++;
      }
    }
    return wordIndex > 0;
  }

  // ---------- observer ----------

  var observer = null;

  function ensureObserver() {
    if (observer) return observer;
    observer = new IntersectionObserver(function (entries, obs) {
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        if (!e.isIntersecting) continue;
        obs.unobserve(e.target);
        e.target.classList.add('is-revealing');
      }
    }, { threshold: 0.2 });
    return observer;
  }

  // ---------- scan ----------

  function scan() {
    if (reduced) return;

    var containers = document.querySelectorAll(CONTAINER_SELECTOR);
    var seen = new Set();

    for (var c = 0; c < containers.length; c++) {
      var headings = containers[c].querySelectorAll(HEADING_SELECTOR);
      for (var h = 0; h < headings.length; h++) {
        var el = headings[h];
        if (seen.has(el)) continue;
        seen.add(el);

        if (el.getAttribute('data-animate') === 'word-stagger') continue;
        if (el.classList.contains('text-reveal')) continue;
        if (isInsideSkipAncestor(el)) continue;
        if (!hasOnlyTextChildren(el)) continue;

        if (!splitHeading(el)) continue;
        el.classList.add('text-reveal');
        ensureObserver().observe(el);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }
})();
