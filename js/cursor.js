/* cursor.js - custom cursor + magnetic hover for Verdant
 * Dot follows pointer; ring lerps; magnetic pull on .btn and .video-play-btn.
 * No frameworks, no external libs. Wrapped in IIFE, inits on DOMContentLoaded.
 */
(function () {
  'use strict';

  if (window.__verdantCursorInit) return;
  window.__verdantCursorInit = true;

  const HOVER_SELECTOR = '.btn, .nav-links a, .accordion-trigger, .social-link, .footer-col a, .brand-cell, .award-row, .see-map, .video-play-btn';
  const MAGNETIC_SELECTOR = '.btn, .video-play-btn';
  const MAGNETIC_BUFFER = 80;
  const MAGNETIC_STRENGTH = 0.25;
  const RING_LERP = 0.18;
  const RELEASE_DURATION = 400;

  function isDesktopFinePointer() {
    if (!window.matchMedia) return false;
    return window.matchMedia('(pointer: fine)').matches && window.innerWidth >= 1200;
  }

  function init() {
    if (!isDesktopFinePointer()) return;

    const dot = document.createElement('div');
    dot.className = 'v-cursor';
    const ring = document.createElement('div');
    ring.className = 'v-cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.classList.add('has-v-cursor');

    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let ringX = pointerX;
    let ringY = pointerY;
    let rafId = null;
    let visible = false;

    function tick() {
      ringX += (pointerX - ringX) * RING_LERP;
      ringY += (pointerY - ringY) * RING_LERP;
      const scale = ring.classList.contains('is-hover') ? 1.6 : 1;
      ring.style.transform = 'translate3d(' + (ringX - 18) + 'px, ' + (ringY - 18) + 'px, 0) scale(' + scale + ')';
      dot.style.transform = 'translate3d(' + (pointerX - 4) + 'px, ' + (pointerY - 4) + 'px, 0)';
      rafId = requestAnimationFrame(tick);
    }

    document.addEventListener('pointermove', function (e) {
      pointerX = e.clientX;
      pointerY = e.clientY;
      if (!visible) {
        visible = true;
        dot.style.opacity = '1';
        ring.style.opacity = '1';
      }
    }, { passive: true });

    document.addEventListener('pointerleave', function () {
      visible = false;
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    });

    document.addEventListener('pointerover', function (e) {
      const target = e.target.closest ? e.target.closest(HOVER_SELECTOR) : null;
      if (target) {
        ring.classList.add('is-hover');
        dot.classList.add('is-hover');
      }
    });

    document.addEventListener('pointerout', function (e) {
      const target = e.target.closest ? e.target.closest(HOVER_SELECTOR) : null;
      if (target) {
        const related = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest(HOVER_SELECTOR) : null;
        if (related !== target) {
          ring.classList.remove('is-hover');
          dot.classList.remove('is-hover');
        }
      }
    });

    // Magnetic pull
    const magneticEls = document.querySelectorAll(MAGNETIC_SELECTOR);
    magneticEls.forEach(function (el) {
      let releaseRaf = null;
      let releaseStart = 0;
      let releaseFromX = 0;
      let releaseFromY = 0;

      function applyTransform(x, y) {
        el.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
      }

      function getCurrentTranslate() {
        const t = el.style.transform;
        const m = t && t.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/);
        return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
      }

      function onMove(e) {
        if (releaseRaf) { cancelAnimationFrame(releaseRaf); releaseRaf = null; }
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const within = e.clientX >= rect.left - MAGNETIC_BUFFER &&
                       e.clientX <= rect.right + MAGNETIC_BUFFER &&
                       e.clientY >= rect.top - MAGNETIC_BUFFER &&
                       e.clientY <= rect.bottom + MAGNETIC_BUFFER;
        if (within) {
          applyTransform((e.clientX - cx) * MAGNETIC_STRENGTH, (e.clientY - cy) * MAGNETIC_STRENGTH);
        }
      }

      function releaseTick(ts) {
        if (!releaseStart) releaseStart = ts;
        const p = Math.min(1, (ts - releaseStart) / RELEASE_DURATION);
        const eased = 1 - Math.pow(1 - p, 3);
        const nx = releaseFromX * (1 - eased);
        const ny = releaseFromY * (1 - eased);
        if (p >= 1) {
          el.style.transform = '';
          releaseRaf = null;
        } else {
          applyTransform(nx, ny);
          releaseRaf = requestAnimationFrame(releaseTick);
        }
      }

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', function () {
        const cur = getCurrentTranslate();
        releaseFromX = cur.x;
        releaseFromY = cur.y;
        releaseStart = 0;
        if (releaseRaf) cancelAnimationFrame(releaseRaf);
        releaseRaf = requestAnimationFrame(releaseTick);
      });
    });

    rafId = requestAnimationFrame(tick);

    window.addEventListener('blur', function () {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
