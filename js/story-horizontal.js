/* =========================================================
   Story Horizontal Pinned Scroll
   - Sticky pin + translateX based on scroll progress.
   - Disabled on small viewports and prefers-reduced-motion.
   ========================================================= */
(function () {
  'use strict';

  if (window.__zenithStoryInit) return;
  window.__zenithStoryInit = true;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function init() {
    var section = document.querySelector('#story.story-pinned');
    if (!section) return;

    var outer = section.querySelector('.story-pin-outer');
    var inner = section.querySelector('.story-pin-inner');
    var content = section.querySelector('.story-pin-content');
    var header = section.querySelector('.story-header');
    var track = document.getElementById('storyTrack');
    var progressEl = document.getElementById('storyProgress');

    if (!outer || !inner || !track) return;

    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var inView = false;
    var ticking = false;
    var lastProgress = -1;

    function isSmallViewport() {
      return window.innerWidth <= 809;
    }

    function shouldDisable() {
      return prefersReduced || isSmallViewport();
    }

    function getMaxTranslate() {
      // Padding on the right side so the last card isn't flush to the viewport edge.
      var styles = window.getComputedStyle(content);
      var padRight = parseFloat(styles.paddingRight) || 0;
      var trackWidth = track.scrollWidth;
      var viewportWidth = window.innerWidth;
      var max = trackWidth - viewportWidth + padRight;
      return Math.max(0, max);
    }

    function update() {
      ticking = false;
      if (shouldDisable()) {
        track.style.transform = '';
        if (progressEl) progressEl.style.width = '0%';
        return;
      }
      if (!inView) return;

      var rect = outer.getBoundingClientRect();
      var viewportHeight = window.innerHeight;
      var distance = rect.height - viewportHeight;
      if (distance <= 0) return;

      var progress = clamp((-rect.top) / distance, 0, 1);
      if (progress === lastProgress) return;
      lastProgress = progress;

      var maxTranslate = getMaxTranslate();
      var x = -maxTranslate * progress;
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px, 0, 0)';

      if (progressEl) {
        progressEl.style.width = (progress * 100).toFixed(2) + '%';
      }
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    function onResize() {
      // Force recompute on next frame.
      lastProgress = -1;
      if (shouldDisable()) {
        track.style.transform = '';
        if (progressEl) progressEl.style.width = '0%';
        return;
      }
      requestUpdate();
    }

    // Observe to only run when section is near the viewport.
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          inView = entry.isIntersecting;
          if (inView) requestUpdate();
        });
      }, { rootMargin: '0px', threshold: 0 });
      io.observe(outer);
    } else {
      inView = true;
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });

    // Initial paint.
    requestUpdate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
