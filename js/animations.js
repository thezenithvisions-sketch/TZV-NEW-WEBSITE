/* Zenith — scroll-reveal animation engine
 * Single IntersectionObserver, one-shot triggers, vanilla ES2020.
 *
 * Supported data-animate values:
 *   fade-up | fade-in | blur-in | scale-in | slide-left | slide-right
 *   word-stagger | count-up
 *
 * Attributes:
 *   data-delay    (ms) -> style.transitionDelay
 *   data-duration (ms) -> CSS var --anim-dur (and count-up duration)
 *   data-stagger  (ms) -> word-stagger: CSS var --word-stagger
 *
 * Respects prefers-reduced-motion: reduce by snapping to final state.
 * Public API: window.ZenithAnim.refresh() — re-scan for new [data-animate] nodes.
 */
(function () {
  'use strict';

  // Guard against double-init across multiple script tags.
  if (window.__zenithAnimInit) return;
  window.__zenithAnimInit = true;

  var SELECTOR = '[data-animate]';
  var COUNT_MODE = 'count-up';
  var WORD_MODE = 'word-stagger';
  var COUNT_DURATION = 1500;

  var reduced = (function () {
    try {
      return window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  })();

  var numberFmt = new Intl.NumberFormat('en-US');
  var prepared = new WeakSet();
  var observer = null;

  // ---------- helpers ----------

  function getMode(el) {
    return (el.getAttribute('data-animate') || '').trim();
  }

  // Apply data-delay / data-duration / data-stagger as inline styles + CSS vars.
  function applyTiming(el) {
    var delay = el.getAttribute('data-delay');
    var dur = el.getAttribute('data-duration');
    var stagger = el.getAttribute('data-stagger');

    if (delay) el.style.transitionDelay = parseFloat(delay) + 'ms';
    if (dur) el.style.setProperty('--anim-dur', parseFloat(dur) + 'ms');
    if (getMode(el) === WORD_MODE) {
      var s = stagger ? parseFloat(stagger) : 60;
      el.style.setProperty('--word-stagger', s + 'ms');
    }
  }

  // Split textContent into word spans, preserving whitespace tokens between them.
  // Punctuation stays attached to its word (we only split on whitespace).
  function splitWords(el) {
    if (el.getAttribute('data-split') === 'done') return;
    var text = el.textContent;
    if (!text) { el.setAttribute('data-split', 'done'); return; }

    // /(\s+)/ keeps whitespace runs as separate tokens via capture group.
    var tokens = text.split(/(\s+)/);
    while (el.firstChild) el.removeChild(el.firstChild);

    var wordIndex = 0;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t.length === 0) continue;
      if (/^\s+$/.test(t)) {
        el.appendChild(document.createTextNode(t));
      } else {
        var span = document.createElement('span');
        span.className = 'word';
        span.style.setProperty('--i', String(wordIndex++));
        span.textContent = t;
        el.appendChild(span);
      }
    }
    el.setAttribute('data-split', 'done');
  }

  // Parse e.g. "1,500+" -> { target: 1500, suffix: "+" }.
  // Suffix is any trailing non-digit, non-dot characters (handles +, %, etc.).
  function parseCountTarget(el) {
    var raw = (el.textContent || '').trim();
    var match = raw.match(/^([\d.,]+)(\D*)$/);
    if (!match) return { target: 0, suffix: '' };
    var numeric = parseFloat(match[1].replace(/,/g, ''));
    if (!isFinite(numeric)) numeric = 0;
    return { target: numeric, suffix: match[2] || '' };
  }

  // easeOutQuart per spec.
  function easeOutQuart(t) {
    var p = 1 - t;
    return 1 - p * p * p * p;
  }

  function runCountUp(el, parsed) {
    var target = parsed.target;
    var suffix = parsed.suffix;
    if (target === 0) {
      el.textContent = numberFmt.format(0) + suffix;
      return;
    }
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / COUNT_DURATION);
      var v = target * easeOutQuart(t);
      el.textContent = numberFmt.format(Math.round(v)) + suffix;
      if (t < 1) {
        window.requestAnimationFrame(frame);
      } else {
        el.textContent = numberFmt.format(target) + suffix;
      }
    }
    window.requestAnimationFrame(frame);
  }

  // ---------- observer ----------

  function ensureObserver() {
    if (observer) return observer;
    observer = new IntersectionObserver(function (entries, obs) {
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        if (!e.isIntersecting) continue;
        var el = e.target;
        obs.unobserve(el); // one-shot
        el.classList.add('is-in');
        if (getMode(el) === COUNT_MODE) {
          runCountUp(el, parseCountTarget(el));
        }
      }
    }, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });
    return observer;
  }

  function prepare(el) {
    if (!el || prepared.has(el)) return;
    prepared.add(el);

    var mode = getMode(el);
    applyTiming(el);
    if (mode === WORD_MODE) splitWords(el);

    if (reduced) {
      // Snap to final: add class, finish count-up at target.
      el.classList.add('is-in');
      if (mode === COUNT_MODE) {
        var p = parseCountTarget(el);
        el.textContent = numberFmt.format(p.target) + p.suffix;
      }
      return;
    }

    ensureObserver().observe(el);
  }

  function scan() {
    var nodes = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < nodes.length; i++) prepare(nodes[i]);
  }

  // ---------- public API ----------

  window.ZenithAnim = {
    refresh: function () { scan(); }
  };

  // ---------- bootstrap ----------

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }
})();
