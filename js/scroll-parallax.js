/* ============================================================
   Scroll Parallax & Divider Reveal
   - Hero title/sub parallax translate on scroll
   - Section divider fills on enter
   - Brands grid wave entrance with stagger
   ============================================================ */
(function () {
  'use strict';

  if (window.__zenithScrollFxInit) return;
  window.__zenithScrollFxInit = true;

  function init() {
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    initHeroParallax();
    initDividerReveal();
    initBrandsWave();
  }

  /* -------- Hero parallax -------- */
  function initHeroParallax() {
    var title = document.querySelector('.about-hero-title');
    var sub = document.querySelector('.about-hero-sub');
    if (!title && !sub) return;

    var hero = (title && title.closest('section')) || (sub && sub.closest('section'));
    var mobile = window.innerWidth <= 809;
    if (mobile) return;

    var ticking = false;
    var lastY = window.pageYOffset || 0;

    function update() {
      ticking = false;
      var y = lastY;
      var vh = window.innerHeight || 1;

      // Only apply when hero is in/near viewport
      var nearViewport = true;
      if (hero) {
        var rect = hero.getBoundingClientRect();
        nearViewport = rect.bottom > -vh * 0.25 && rect.top < vh;
      }
      if (!nearViewport) return;

      if (title) {
        title.style.transform = 'translateY(' + (y * -0.25) + 'px)';
      }
      if (sub) {
        var fade = 1 - Math.min(Math.max(y / vh, 0), 1) * 0.7; // 1 -> 0.3
        sub.style.transform = 'translateY(' + (y * -0.15) + 'px)';
        sub.style.opacity = String(fade);
      }
    }

    function onScroll() {
      lastY = window.pageYOffset || 0;
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }

    function onResize() {
      if (window.innerWidth <= 809) {
        if (title) { title.style.transform = ''; }
        if (sub) { sub.style.transform = ''; sub.style.opacity = ''; }
        window.removeEventListener('scroll', onScroll);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    update();
  }

  /* -------- Section divider reveal -------- */
  function initDividerReveal() {
    var headers = document.querySelectorAll('.section-header');
    if (!headers.length || !('IntersectionObserver' in window)) {
      headers.forEach(function (h) {
        var d = h.querySelector('.divider');
        if (d) d.classList.add('in-view');
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var divider = entry.target.querySelector('.divider');
        if (divider) divider.classList.add('in-view');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.3 });

    headers.forEach(function (h) {
      if (h.querySelector('.divider')) io.observe(h);
    });
  }

  /* -------- Brand grid wave entrance -------- */
  function initBrandsWave() {
    var grid = document.querySelector('.brands-grid');
    if (!grid) return;

    var cells = grid.querySelectorAll('.brand-cell');
    cells.forEach(function (cell, i) {
      cell.style.transitionDelay = (i * 80) + 'ms';
    });

    if (!('IntersectionObserver' in window)) {
      grid.classList.add('is-in');
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        grid.classList.add('is-in');
        io.unobserve(grid);
      });
    }, { threshold: 0.15 });

    io.observe(grid);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
