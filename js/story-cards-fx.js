/* Zenith — Story horizontal per-card entrance/exit FX
 *
 * As each .story-card crosses the visible horizontal viewport (driven by
 * the pinned vertical-to-horizontal scroll in story-horizontal.js), this
 * module scales / fades / blurs each card based on its centre's distance
 * from the viewport centre. The card at centre = full size, 1.0 opacity,
 * 0 blur. Cards toward edges shrink, fade, and blur.
 *
 * Coordinates with story-horizontal.js via independent scroll listener;
 * both passive. Disabled on small viewport and prefers-reduced-motion.
 */
(function () {
  'use strict';

  if (window.__zenithStoryCardsInit) return;
  window.__zenithStoryCardsInit = true;

  function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

  function init() {
    var section = document.querySelector('#story.story-pinned');
    if (!section) return;
    var cards = section.querySelectorAll('.story-card');
    if (!cards.length) return;

    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ticking = false;

    function isSmall() { return window.innerWidth <= 809; }

    function disabled() { return prefersReduced || isSmall(); }

    function update() {
      ticking = false;
      if (disabled()) {
        for (var i = 0; i < cards.length; i++) {
          var c = cards[i];
          c.style.transform = '';
          c.style.opacity = '';
          c.style.filter = '';
        }
        return;
      }
      var vw = window.innerWidth;
      var vpCenter = vw / 2;
      for (var j = 0; j < cards.length; j++) {
        var card = cards[j];
        var r = card.getBoundingClientRect();
        // Cards far outside viewport: skip work but keep state at edges
        if (r.right < -vw || r.left > vw * 2) {
          card.style.transform = 'scale(0.85)';
          card.style.opacity = '0.4';
          card.style.filter = 'blur(4px)';
          continue;
        }
        var centerX = r.left + r.width / 2;
        var d = (centerX - vpCenter) / vw; // -1..1 typical
        var absd = Math.abs(d);

        // scale: center 1.0, edges 0.892
        var scale = 1 - clamp(absd, 0, 0.6) * 0.18;
        // opacity: center 1.0, far 0.45
        var opacity = 1 - clamp(absd, 0, 0.8) * 0.55;
        // blur: center 0, far 4px
        var blur = clamp(absd, 0, 0.8) * 5;

        card.style.transform = 'scale(' + scale.toFixed(3) + ')';
        card.style.opacity = opacity.toFixed(3);
        card.style.filter = 'blur(' + blur.toFixed(2) + 'px)';
      }
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    function onResize() {
      // Re-evaluate disabled state and reapply
      requestUpdate();
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });

    // Initial paint
    requestUpdate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
