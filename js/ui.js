/* ui.js - vanilla UI interactions for Verdant
 * Marquee tickers, sticky nav, mobile nav, accordion, smooth scroll, button touch state.
 * No frameworks, no external libs. Wrapped in IIFE, inits on DOMContentLoaded.
 */
(function () {
  'use strict';

  // ---------- helpers ----------
  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function debounce(fn, wait) {
    let t = null;
    return function () {
      const args = arguments;
      const ctx = this;
      if (t) clearTimeout(t);
      t = setTimeout(() => { t = null; fn.apply(ctx, args); }, wait);
    };
  }

  // Default ticker speed: 60 px/s desktop, 40 px/s on viewports <= 809px.
  function defaultTickerSpeed() {
    return window.innerWidth <= 809 ? 40 : 60;
  }

  // ---------- 1. Marquee tickers ----------
  function initTickers() {
    const tickers = document.querySelectorAll('.ticker');
    if (!tickers.length) return;

    const instances = [];
    let tabHidden = document.hidden === true;

    tickers.forEach((ticker) => {
      const track = ticker.querySelector('.ticker-track');
      if (!track) return;

      // Read overrides from data attributes.
      const speedAttr = parseFloat(ticker.getAttribute('data-speed'));
      const direction = ticker.getAttribute('data-direction') === 'right' ? 1 : -1;

      const inst = {
        ticker,
        track,
        baseHTML: track.innerHTML,
        offset: 0,
        hovered: false,
        lastTs: 0,
        contentWidth: 0,
        speedOverride: isFinite(speedAttr) && speedAttr > 0 ? speedAttr : null,
        direction, // -1 = left (default), 1 = right
        rafId: 0,
      };

      // Pause when hovered (mouseenter/mouseleave per spec).
      ticker.addEventListener('mouseenter', () => { inst.hovered = true; });
      ticker.addEventListener('mouseleave', () => { inst.hovered = false; });

      measureAndFill(inst);
      startTicker(inst);
      instances.push(inst);
    });

    // Measure the track. While track width < container width * 2, clone
    // the original children and append until covered. After filling, the
    // effective loop length is half of total track width (because we hold
    // at least two copies of the original sequence).
    function measureAndFill(inst) {
      inst.track.innerHTML = inst.baseHTML;
      inst.track.style.willChange = 'transform';

      const containerWidth = inst.ticker.clientWidth || inst.ticker.offsetWidth || 0;
      let trackWidth = inst.track.scrollWidth;
      if (trackWidth <= 0) trackWidth = containerWidth || 1;

      // Append clones of the original children until track >= 2x container.
      let safety = 0;
      while (inst.track.scrollWidth < containerWidth * 2 && safety < 20) {
        inst.track.insertAdjacentHTML('beforeend', inst.baseHTML);
        safety += 1;
      }

      // Half of total track width = one full original sequence,
      // which is the seamless wrap point.
      inst.contentWidth = inst.track.scrollWidth / 2;
      if (inst.contentWidth > 0) {
        inst.offset = ((inst.offset % inst.contentWidth) + inst.contentWidth) % inst.contentWidth;
      } else {
        inst.offset = 0;
      }
      applyTransform(inst);
    }

    function applyTransform(inst) {
      // direction -1 (left) gives translateX(-offset); direction 1 (right)
      // gives translateX(offset - contentWidth) so it slides rightward
      // while still wrapping cleanly at the same content boundary.
      const x = inst.direction === 1
        ? (inst.offset - inst.contentWidth)
        : -inst.offset;
      inst.track.style.transform = `translateX(${x}px)`;
    }

    function startTicker(inst) {
      if (prefersReducedMotion()) {
        inst.track.style.transform = 'translateX(0)';
        return;
      }
      const step = (ts) => {
        if (!inst.lastTs) inst.lastTs = ts;
        const dt = (ts - inst.lastTs) / 1000;
        inst.lastTs = ts;
        if (!inst.hovered && !tabHidden && inst.contentWidth > 0) {
          const speed = inst.speedOverride != null ? inst.speedOverride : defaultTickerSpeed();
          inst.offset += speed * dt;
          if (inst.offset >= inst.contentWidth) inst.offset -= inst.contentWidth;
          applyTransform(inst);
        }
        inst.rafId = requestAnimationFrame(step);
      };
      inst.rafId = requestAnimationFrame(step);
    }

    // Pause when tab is not visible; resume cleanly without a time jump.
    document.addEventListener('visibilitychange', () => {
      tabHidden = document.hidden === true;
      // Drop the last timestamp so the next frame doesn't apply a huge dt.
      instances.forEach((inst) => { inst.lastTs = 0; });
    });

    const onResize = debounce(() => {
      instances.forEach((inst) => { inst.lastTs = 0; measureAndFill(inst); });
    }, 200);
    window.addEventListener('resize', onResize);
  }

  // ---------- 2. Sticky nav ----------
  function initStickyNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;

    let lastScrollY = window.scrollY || window.pageYOffset || 0;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY || window.pageYOffset || 0;

      if (y <= 0) {
        nav.classList.remove('nav--scrolled');
        nav.classList.remove('nav--hidden');
      } else {
        if (y > 60) nav.classList.add('nav--scrolled');
        else nav.classList.remove('nav--scrolled');

        if (y > 200) {
          if (y > lastScrollY) nav.classList.add('nav--hidden');
          else nav.classList.remove('nav--hidden');
        } else {
          nav.classList.remove('nav--hidden');
        }
      }

      lastScrollY = y;
    };

    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }

  // ---------- 3. Mobile nav toggle ----------
  function initMobileNav() {
    const nav = document.getElementById('nav');
    const toggle = document.getElementById('navToggle');
    if (!nav || !toggle) return;

    const closeMenu = () => {
      if (!nav.classList.contains('open')) return;
      nav.classList.remove('open');
      document.body.style.overflow = '';
      toggle.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
      if (nav.classList.contains('open')) return;
      nav.classList.add('open');
      document.body.style.overflow = 'hidden';
      toggle.setAttribute('aria-expanded', 'true');
    };

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      if (nav.classList.contains('open')) closeMenu(); else openMenu();
    });

    // Close when clicking a nav link.
    const linksContainer = nav.querySelector('.nav-links');
    if (linksContainer) {
      linksContainer.addEventListener('click', (e) => {
        if (e.target.closest('a')) closeMenu();
      });
    }

    // ESC closes the menu.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') closeMenu();
    });
  }

  // ---------- 4. Accordion ----------
  function initAccordion() {
    const groups = document.querySelectorAll('.accordion');

    // Open the first item in each accordion group by default.
    groups.forEach((group) => {
      const firstItem = group.querySelector('.accordion-item');
      if (firstItem && !firstItem.classList.contains('is-open')) {
        firstItem.classList.add('is-open');
      }
    });

    const triggers = document.querySelectorAll('.accordion-trigger');
    triggers.forEach((trigger) => {
      const item = trigger.closest('.accordion-item');
      if (!item) return;

      const initiallyOpen = item.classList.contains('is-open');
      trigger.setAttribute('aria-expanded', initiallyOpen ? 'true' : 'false');

      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const willOpen = !item.classList.contains('is-open');
        item.classList.toggle('is-open', willOpen);
        trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    });
  }

  // ---------- 5. Smooth anchor scroll ----------
  function initSmoothScroll() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.length <= 1) return;

      let target;
      try { target = document.querySelector(href); }
      catch (err) { return; }
      if (!target) return;

      e.preventDefault();

      // Account for the sticky nav's actual computed height.
      const nav = document.querySelector('.nav');
      const navHeight = nav ? nav.getBoundingClientRect().height : 0;

      const rect = target.getBoundingClientRect();
      const currentY = window.scrollY || window.pageYOffset || 0;
      const top = rect.top + currentY - navHeight - 12;

      const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
      window.scrollTo({ top: Math.max(0, top), behavior });
    });
  }

  // ---------- 6. Button touch press state ----------
  // CSS handles the arrow-circle hover; JS only flips .is-pressed on touch.
  function initButtonTouch() {
    const buttons = document.querySelectorAll('.btn');
    if (!buttons.length) return;
    buttons.forEach((btn) => {
      btn.addEventListener('touchstart', () => { btn.classList.add('is-pressed'); }, { passive: true });
      const clear = () => { btn.classList.remove('is-pressed'); };
      btn.addEventListener('touchend', clear);
      btn.addEventListener('touchcancel', clear);
    });
  }

  // ---------- boot ----------
  function init() {
    if (window.__verdantUIInit) return;
    window.__verdantUIInit = true;
    initTickers();
    initStickyNav();
    initMobileNav();
    initAccordion();
    initSmoothScroll();
    initButtonTouch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
