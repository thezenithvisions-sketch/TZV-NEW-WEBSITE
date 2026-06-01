/* Verdant — cinematic image mask reveal + subtle parallax
 *
 * Two effects:
 *   1. Mask reveal — on viewport intersect, parent wrapper sweeps open via
 *      clip-path inset(0 100% 100% 0) -> inset(0 0 0 0) over 1.2s while the
 *      inner img/video subtly scales 1.08 -> 1.0. Images feel "swept open"
 *      rather than fading in.
 *   2. Parallax — selected wrappers translateY a few pixels in opposition to
 *      scroll position once revealed, creating depth.
 *
 * Coordination: the inner img/video uses a CSS transition for the scale
 * portion of reveal. Once revealed, this script takes ownership of the
 * inline transform on those elements so it can layer translateY for
 * parallax without fighting the original transition.
 */
(function () {
  'use strict';

  if (window.__verdantImageRevealInit) return;
  window.__verdantImageRevealInit = true;

  // Selectors scoped per spec; team cards are intentionally excluded
  // (they have their own grayscale-driven entrance).
  var REVEAL_SEL = [
    '.about-company-image',
    '.video-wrap',
    '.process-step-image',
    '.principle-panel-image',
    '.story-card-image',
    '.mv-card-bg'
  ].join(',');

  // Inner moving element to parallax (the image/video itself).
  var PARALLAX_INNER = {
    '.about-company-image': 'img',
    '.video-wrap': '.showreel-video',
    '.process-step-image': 'img',
    '.principle-panel-image': 'img'
  };

  var PARALLAX_RANGE = 30; // max px of translateY at viewport edges
  var MIN_VIEWPORT = 810;  // skip parallax at 809px or smaller

  var reduced = (function () {
    try {
      return window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  })();

  // Tracks inner elements to parallax once their wrapper is revealed.
  var parallaxItems = [];
  var rafPending = false;

  // ---------- reveal ----------

  function prepareReveal() {
    var wrappers = document.querySelectorAll(REVEAL_SEL);
    if (!wrappers.length) return;

    for (var i = 0; i < wrappers.length; i++) {
      var w = wrappers[i];
      w.classList.add('img-reveal');

      if (reduced) {
        w.classList.add('is-revealed');
        registerParallax(w); // no-op when reduced/viewport too small
      }
    }

    if (reduced) return;

    var io = new IntersectionObserver(function (entries, obs) {
      for (var j = 0; j < entries.length; j++) {
        var e = entries[j];
        if (!e.isIntersecting) continue;
        var el = e.target;
        obs.unobserve(el);
        el.classList.add('is-revealed');
        registerParallax(el);
      }
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

    for (var k = 0; k < wrappers.length; k++) io.observe(wrappers[k]);
  }

  // ---------- parallax ----------

  function findInnerSelector(wrapper) {
    for (var sel in PARALLAX_INNER) {
      if (wrapper.matches(sel)) return PARALLAX_INNER[sel];
    }
    return null;
  }

  function registerParallax(wrapper) {
    if (reduced) return;
    if (window.innerWidth <= MIN_VIEWPORT - 1) return;

    var innerSel = findInnerSelector(wrapper);
    if (!innerSel) return;

    var inner = wrapper.querySelector(innerSel);
    if (!inner) return;

    inner.setAttribute('data-parallax', '');
    // Seed inline transform so JS owns it (overriding the CSS scale(1.08)
    // -> scale(1) transition which is now complete).
    inner.style.transform = 'translate3d(0, 0px, 0) scale(1)';
    inner.style.willChange = 'transform';

    parallaxItems.push({ wrapper: wrapper, inner: inner });
    requestUpdate();
  }

  function updateParallax() {
    rafPending = false;
    if (!parallaxItems.length) return;

    var vh = window.innerHeight;
    var center = vh / 2;

    for (var i = 0; i < parallaxItems.length; i++) {
      var item = parallaxItems[i];
      var rect = item.wrapper.getBoundingClientRect();

      // Element fully off-screen — skip to save work.
      if (rect.bottom < -100 || rect.top > vh + 100) continue;

      var elementCenter = rect.top + rect.height / 2;
      // Distance from viewport center, normalized to -1..1 over half-viewport.
      var norm = (elementCenter - center) / (vh / 2 + rect.height / 2);
      if (norm > 1) norm = 1;
      if (norm < -1) norm = -1;

      // Negative sign -> wrapper moves opposite scroll (classic parallax feel).
      var y = -norm * PARALLAX_RANGE;
      item.inner.style.transform =
        'translate3d(0, ' + y.toFixed(2) + 'px, 0) scale(1)';
    }
  }

  function requestUpdate() {
    if (rafPending) return;
    rafPending = true;
    window.requestAnimationFrame(updateParallax);
  }

  function onScroll() { requestUpdate(); }
  function onResize() {
    // Below the threshold: stop parallax and reset transforms.
    if (window.innerWidth <= MIN_VIEWPORT - 1) {
      for (var i = 0; i < parallaxItems.length; i++) {
        parallaxItems[i].inner.style.transform =
          'translate3d(0, 0px, 0) scale(1)';
      }
      return;
    }
    requestUpdate();
  }

  // ---------- bootstrap ----------

  function init() {
    prepareReveal();
    if (reduced) return;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
