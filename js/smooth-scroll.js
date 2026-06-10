/* smooth-scroll.js - tiny Lenis-style wheel/touch smooth scroll for Zenith
 * Intercepts wheel deltas, lerps a target into window.scrollTo on rAF.
 * Native touch / keyboard / scrollbar resync currentY to actual scrollY.
 * No frameworks, no external libs. Wrapped in IIFE, inits on DOMContentLoaded.
 */
(function () {
  'use strict';

  if (window.__zenithSmoothInit) return;
  window.__zenithSmoothInit = true;

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Feature-detect passive listener support so we can pass { passive: false }.
  let passiveSupported = false;
  try {
    const opts = Object.defineProperty({}, 'passive', {
      get: function () { passiveSupported = true; return false; }
    });
    window.addEventListener('__vds_probe', null, opts);
    window.removeEventListener('__vds_probe', null, opts);
  } catch (e) { passiveSupported = false; }
  const wheelOpts = passiveSupported ? { passive: false } : false;

  const LERP = 0.10;
  const EPSILON = 0.5;

  let enabled = true;
  let running = false;
  let rafId = 0;
  let currentY = window.scrollY || window.pageYOffset || 0;
  let targetY = currentY;
  let programmaticScroll = false; // true while our rAF-driven scrollTo is firing

  function maxScroll() {
    const el = document.scrollingElement || document.documentElement;
    return Math.max(0, (el.scrollHeight || 0) - window.innerHeight);
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function isExempt(target) {
    if (!target || target.nodeType !== 1) return false;
    if (target.closest('[data-no-smooth]')) return true;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return true;
    return false;
  }

  function snap() {
    currentY = targetY = window.scrollY || window.pageYOffset || 0;
  }

  function tick() {
    if (!enabled) { running = false; return; }
    const diff = targetY - currentY;
    if (Math.abs(diff) < EPSILON) {
      currentY = targetY;
      programmaticScroll = true;
      window.scrollTo(0, currentY);
      programmaticScroll = false;
      running = false;
      return;
    }
    currentY += diff * LERP;
    programmaticScroll = true;
    window.scrollTo(0, currentY);
    programmaticScroll = false;
    rafId = requestAnimationFrame(tick);
  }

  function ensureLoop() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(tick);
  }

  function onWheel(e) {
    if (!enabled) return;
    if (e.ctrlKey) return;          // pinch-zoom gesture
    if (e.defaultPrevented) return;
    if (isExempt(e.target)) return;

    const max = maxScroll();
    if (max <= 0) return;

    // Accept the gesture: prevent native scroll and accumulate into targetY.
    e.preventDefault();
    targetY = clamp(targetY + e.deltaY * 1.0, 0, max);
    ensureLoop();
  }

  function onScroll() {
    // Any scroll event NOT produced by our rAF (keyboard, arrows, spacebar,
    // scrollbar drag, anchor jump) means we should resync to reality.
    if (programmaticScroll) return;
    snap();
  }

  function onTouchEnd() { snap(); }
  function onResize() {
    targetY = clamp(targetY, 0, maxScroll());
  }

  function attach() {
    window.addEventListener('wheel', onWheel, wheelOpts);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('resize', onResize);
  }

  function detach() {
    window.removeEventListener('wheel', onWheel, wheelOpts);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('touchcancel', onTouchEnd);
    window.removeEventListener('resize', onResize);
  }

  function enable() {
    if (enabled) return;
    enabled = true;
    snap();
    attach();
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    if (rafId) cancelAnimationFrame(rafId);
    running = false;
    detach();
    snap();
  }

  function init() {
    if (prefersReducedMotion()) { enabled = false; return; }
    snap();
    attach();
  }

  window.ZenithSmooth = { enable: enable, disable: disable };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
