/* team-carousel.js — About page team-card enhancements
 * Contract (see _ABOUT_SPEC.md):
 *  1. Touch-friendly .is-hover class on .team-card (pointerenter/touchstart -> add;
 *     pointerleave/scroll -> remove).
 *  2. Stagger .social-icon entrance: set inline --i:N on each icon when its
 *     parent card enters viewport (CSS handles transition-delay).
 *  3. Subtle rotateY tilt (max 4deg) on team-card image, desktop pointer:fine
 *     only, disabled below 1200px viewport width.
 * Vanilla ES2020. No deps. Idempotent.
 */
(function () {
  'use strict';

  if (window.__verdantTeamInit) return;
  window.__verdantTeamInit = true;

  var MAX_TILT_DEG = 4;
  var DESKTOP_MIN = 1200;

  function isFinePointer() {
    try {
      return window.matchMedia('(pointer: fine)').matches;
    } catch (e) {
      return false;
    }
  }

  function isDesktopWidth() {
    return (window.innerWidth || document.documentElement.clientWidth || 0) >= DESKTOP_MIN;
  }

  // 1. Hover-class management ------------------------------------------------
  function initHoverClass(cards) {
    cards.forEach(function (card) {
      function on() { card.classList.add('is-hover'); }
      function off() { card.classList.remove('is-hover'); }

      card.addEventListener('pointerenter', on);
      card.addEventListener('pointerleave', off);
      card.addEventListener('touchstart', on, { passive: true });
      card.addEventListener('touchend', off, { passive: true });
      card.addEventListener('touchcancel', off, { passive: true });
    });

    // Remove hover state on scroll so taps do not stick on touch devices
    var scrollTimer = 0;
    window.addEventListener('scroll', function () {
      if (scrollTimer) return;
      scrollTimer = window.setTimeout(function () {
        scrollTimer = 0;
        for (var i = 0; i < cards.length; i++) {
          cards[i].classList.remove('is-hover');
        }
      }, 60);
    }, { passive: true });
  }

  // 2. Social-icon stagger on viewport enter --------------------------------
  function initSocialStagger(cards) {
    // Pre-assign --i so transition-delay is correct before observer fires
    cards.forEach(function (card) {
      var icons = card.querySelectorAll('.socials .social-icon');
      for (var i = 0; i < icons.length; i++) {
        icons[i].style.setProperty('--i', i);
      }
    });

    if (!('IntersectionObserver' in window)) {
      cards.forEach(function (c) { c.classList.add('socials-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('socials-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.2 });

    cards.forEach(function (card) { io.observe(card); });
  }

  // 3. Tilt-on-mousemove (desktop, pointer:fine only) -----------------------
  function initTilt(cards) {
    if (!isFinePointer() || !isDesktopWidth()) return;

    cards.forEach(function (card) {
      var img = card.querySelector('img') || card.querySelector('.team-card-image');
      if (!img) return;

      var rafId = 0;
      var pending = 0;

      function apply() {
        rafId = 0;
        img.style.transform = 'rotateY(' + pending.toFixed(2) + 'deg)';
      }

      card.addEventListener('pointermove', function (ev) {
        if (ev.pointerType !== 'mouse') return;
        var rect = card.getBoundingClientRect();
        if (!rect.width) return;
        var nx = (ev.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        if (nx < -1) nx = -1; else if (nx > 1) nx = 1;
        pending = nx * MAX_TILT_DEG;
        if (!rafId) rafId = window.requestAnimationFrame(apply);
      });

      card.addEventListener('pointerleave', function () {
        if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
        img.style.transform = '';
      });
    });
  }

  function boot() {
    var cards = document.querySelectorAll('.team-card');
    if (!cards.length) return;
    try { initHoverClass(cards); } catch (e) { /* noop */ }
    try { initSocialStagger(cards); } catch (e) { /* noop */ }
    try { initTilt(cards); } catch (e) { /* noop */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
