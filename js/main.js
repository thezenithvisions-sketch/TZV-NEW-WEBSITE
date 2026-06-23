/* ============================================================
   Zenith — interactive behaviors
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const ready = (fn) =>
    document.readyState !== 'loading'
      ? fn()
      : document.addEventListener('DOMContentLoaded', fn);

  ready(() => {

    /* ----------------------------------------------------------
       Mobile nav toggle
       ---------------------------------------------------------- */
    const nav = $('#nav');
    const navToggle = $('#navToggle');
    if (nav && navToggle) {
      navToggle.addEventListener('click', () => nav.classList.toggle('open'));
      $$('.nav-links a').forEach((a) =>
        a.addEventListener('click', () => nav.classList.remove('open'))
      );
    }

    /* ----------------------------------------------------------
       Split text into per-word <span class="word"> for blur-in
       (used by .value-quote and .reveal-words — hero h1 etc.)
       ---------------------------------------------------------- */
    const splitWords = (el, perWordDelayMs) => {
      // Walk through text nodes so inline elements (br/span) survive
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (!text) return;
      el.textContent = '';
      const words = text.split(' ');
      words.forEach((w, i) => {
        if (i > 0) el.appendChild(document.createTextNode(' '));
        const span = document.createElement('span');
        span.className = 'word';
        span.style.transitionDelay = i * perWordDelayMs + 'ms';
        span.textContent = w;
        el.appendChild(span);
      });
    };
    $$('.value-quote').forEach((el) => splitWords(el, 40));
    $$('.reveal-words').forEach((el) => splitWords(el, 55));

    /* ----------------------------------------------------------
       IntersectionObserver — add .in-view to animated elements
       Covers: divider, footer-divider, value-quote, gallery-item,
       reveal, reveal-stagger, reveal-words, reveal-image
       ---------------------------------------------------------- */
    const revealSelector = [
      '.divider',
      '.footer-divider',
      '.value-quote',
      '.gallery-item',
      '.gallery-page-item',
      '.reveal',
      '.reveal-stagger',
      '.reveal-words',
      '.reveal-image'
    ].join(', ');

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in-view');
              io.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
      );
      const observed = $$(revealSelector);
      observed.forEach((el) => io.observe(el));
      // Safety net: if any tracked element is in the viewport after a
      // short delay but still missing .in-view (e.g. IO callbacks haven't
      // fired in a buggy embed/preview), force-trigger by viewport check.
      setTimeout(() => {
        const vh = window.innerHeight;
        observed.forEach((el) => {
          if (el.classList.contains('in-view')) return;
          const r = el.getBoundingClientRect();
          if (r.bottom > 0 && r.top < vh) {
            el.classList.add('in-view');
            io.unobserve(el);
          }
        });
      }, 600);
    } else {
      $$(revealSelector).forEach((el) => el.classList.add('in-view'));
    }

    /* ----------------------------------------------------------
       Hero wordmark — continuous auto-marquee.
       CSS animates `.wordmark-track` from translateX 0 → -50%.
       For that to loop seamlessly the track must contain TWO
       identical halves, so we duplicate its inner content once.
       ---------------------------------------------------------- */
    const heroWordmark = $('#heroWordmark');
    if (heroWordmark) {
      const track = heroWordmark.querySelector('.wordmark-track');
      if (track) {
        track.innerHTML += track.innerHTML;
      }
    }

    /* ----------------------------------------------------------
       Showreel lightbox
       ---------------------------------------------------------- */
    const showreel = $('#showreel');
    const lightbox = $('#lightbox');
    const lightboxVideo = $('#lightboxVideo');
    const lightboxClose = $('#lightboxClose');

    if (showreel && lightbox && lightboxVideo) {
      const open = (e) => {
        e.preventDefault();
        const source = showreel.querySelector('video source');
        if (source && source.src && lightboxVideo.src !== source.src) {
          lightboxVideo.src = source.src;
        }
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
        lightboxVideo.currentTime = 0;
        const playPromise = lightboxVideo.play();
        if (playPromise && playPromise.catch) playPromise.catch(() => {});
      };
      const close = () => {
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
        lightboxVideo.pause();
      };
      showreel.addEventListener('click', open);
      if (lightboxClose) lightboxClose.addEventListener('click', close);
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('open')) close();
      });
    }

    /* ----------------------------------------------------------
       Brand testimonial vertical scroll — duplicate for seamless loop
       (CSS already animates translateY 0 → -50%)
       ---------------------------------------------------------- */
    const brandList = $('#brandTestimonialList');
    if (brandList) {
      brandList.innerHTML += brandList.innerHTML;
    }

    /* ----------------------------------------------------------
       Testimonial carousel — buttons + drag/swipe
       ---------------------------------------------------------- */
    const track = $('#testimonialTrack');
    const prevBtn = $('#prevTestimonial');
    const nextBtn = $('#nextTestimonial');

    if (track) {
      let currentX = 0;
      let dragStartX = 0;
      let dragStartCurrentX = 0;
      let isDragging = false;
      let didDrag = false;

      const cardStep = () => {
        const cards = track.querySelectorAll('.testimonial-card');
        if (cards.length < 2) return cards[0] ? cards[0].offsetWidth + 10 : 365;
        return cards[1].offsetLeft - cards[0].offsetLeft;
      };

      const minX = () => {
        const wrap = track.parentElement;
        if (!wrap) return 0;
        return Math.min(0, wrap.offsetWidth - track.scrollWidth);
      };

      const apply = (x) => {
        currentX = Math.max(minX(), Math.min(0, x));
        track.style.transform = `translate3d(${currentX}px, 0, 0)`;
      };

      const next = () => apply(currentX - cardStep());
      const prev = () => apply(currentX + cardStep());

      if (nextBtn) nextBtn.addEventListener('click', next);
      if (prevBtn) prevBtn.addEventListener('click', prev);

      const onStart = (clientX) => {
        isDragging = true;
        didDrag = false;
        dragStartX = clientX;
        dragStartCurrentX = currentX;
        track.classList.add('dragging');
      };
      const onMove = (clientX) => {
        if (!isDragging) return;
        const dx = clientX - dragStartX;
        if (Math.abs(dx) > 3) didDrag = true;
        apply(dragStartCurrentX + dx);
      };
      const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        track.classList.remove('dragging');
      };

      track.addEventListener('mousedown', (e) => {
        onStart(e.clientX);
        e.preventDefault();
      });
      window.addEventListener('mousemove', (e) => onMove(e.clientX));
      window.addEventListener('mouseup', onEnd);

      track.addEventListener(
        'touchstart',
        (e) => onStart(e.touches[0].clientX),
        { passive: true }
      );
      window.addEventListener(
        'touchmove',
        (e) => {
          if (isDragging) onMove(e.touches[0].clientX);
        },
        { passive: true }
      );
      window.addEventListener('touchend', onEnd);

      // Suppress link clicks immediately after a drag
      track.addEventListener(
        'click',
        (e) => {
          if (didDrag) {
            e.preventDefault();
            e.stopPropagation();
            didDrag = false;
          }
        },
        true
      );

      window.addEventListener('resize', () => apply(currentX));
    }

    /* ----------------------------------------------------------
       FAQ accordion (exclusive)
       ---------------------------------------------------------- */
    $$('.faq-item').forEach((item) => {
      const row = item.querySelector('.faq-row');
      if (!row) return;
      row.addEventListener('click', () => {
        const wasOpen = item.classList.contains('open');
        $$('.faq-item').forEach((i) => i.classList.remove('open'));
        if (!wasOpen) item.classList.add('open');
      });
    });

    /* ----------------------------------------------------------
       Benefits dropdowns (independent toggle — each opens/closes
       on its own, multiple can be open at once).
       ---------------------------------------------------------- */
    $$('.benefit').forEach((item) => {
      const row = item.querySelector('.benefit-row');
      if (!row) return;
      row.addEventListener('click', () => {
        item.classList.toggle('open');
      });
    });

    /* ----------------------------------------------------------
       Service cards — "VIEW SERVICE" badge tracks the cursor
       (acts as a custom cursor while hovering a card)
       ---------------------------------------------------------- */
    $$('.service-card-tile').forEach((card) => {
      const badge = card.querySelector('.service-tile-view-btn');
      if (!badge) return;
      let rect = null;
      let rafId = null;
      let lastX = 0;
      let lastY = 0;

      const updateBadge = () => {
        rafId = null;
        if (!rect) return;
        const x = lastX - rect.left;
        const y = lastY - rect.top;
        badge.style.left = x + 'px';
        badge.style.top = y + 'px';
      };

      card.addEventListener('mouseenter', () => {
        rect = card.getBoundingClientRect();
      });
      card.addEventListener('mousemove', (e) => {
        lastX = e.clientX;
        lastY = e.clientY;
        if (rafId) return;
        rafId = requestAnimationFrame(updateBadge);
      });
      card.addEventListener('mouseleave', () => {
        rect = null;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        // Reset to CSS default (center) for next entrance
        badge.style.left = '';
        badge.style.top = '';
      });
      // Re-cache rect on scroll if we're still hovered (rect.top changes)
      window.addEventListener(
        'scroll',
        () => {
          if (rect) rect = card.getBoundingClientRect();
        },
        { passive: true }
      );
    });

    /* ----------------------------------------------------------
       Services accordion (services.html — 10 numbered rows)
       Click .service-item-row toggles .open on parent.
       Independent toggle — multiple can be open at once.
       Updates aria-expanded on the button.
       ---------------------------------------------------------- */
    $$('.service-item').forEach((item) => {
      const row = item.querySelector('.service-item-row');
      if (!row) return;
      row.addEventListener('click', () => {
        const willOpen = !item.classList.contains('open');
        item.classList.toggle('open', willOpen);
        row.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    });

    /* ----------------------------------------------------------
       Nav shadow on scroll
       ---------------------------------------------------------- */
    const updateNav = () => {
      if (!nav) return;
      if (window.scrollY > 30) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();

    /* ----------------------------------------------------------
       Contact page form: validation + success state
       Only runs if the form exists (no-op on other pages).
       ---------------------------------------------------------- */
    const contactForm = $('#contactPageForm');
    const contactSuccess = $('#contactSuccess');
    const contactReset = $('#contactReset');

    if (contactForm) {
      const setError = (label, message) => {
        if (!label) return;
        label.classList.add('has-error');
        const slot = label.querySelector('[data-error]');
        if (slot) slot.textContent = message;
      };
      const clearError = (label) => {
        if (!label) return;
        label.classList.remove('has-error');
        const slot = label.querySelector('[data-error]');
        if (slot) slot.textContent = '';
      };
      // Live error clearing
      contactForm
        .querySelectorAll('input, select, textarea')
        .forEach((field) => {
          field.addEventListener('input', () => {
            const label = field.closest('label, .form-consent');
            clearError(label);
          });
          field.addEventListener('change', () => {
            const label = field.closest('label, .form-consent');
            clearError(label);
          });
        });

      const validate = () => {
        let firstInvalid = null;
        contactForm
          .querySelectorAll('label, .form-consent')
          .forEach((label) => clearError(label));

        const fields = contactForm.querySelectorAll(
          'input[required], select[required], textarea[required]'
        );
        fields.forEach((field) => {
          const label = field.closest('label, .form-consent');
          let message = '';
          if (field.type === 'checkbox') {
            if (!field.checked) message = 'Please agree to continue.';
          } else if (!field.value.trim()) {
            message = 'This field is required.';
          } else if (field.type === 'email') {
            const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
            if (!ok) message = 'Please enter a valid email address.';
          }
          if (message) {
            setError(label, message);
            if (!firstInvalid) firstInvalid = field;
          }
        });
        return firstInvalid;
      };

      const showSuccess = () => {
        if (!contactSuccess) return;
        contactForm.classList.add('is-hidden');
        contactSuccess.hidden = false;
        // Smooth-scroll to success card (account for nav)
        const navHeight = nav ? nav.offsetHeight : 0;
        const top =
          contactSuccess.getBoundingClientRect().top + window.scrollY - navHeight - 20;
        window.scrollTo({ top, behavior: 'smooth' });
      };

      const resetForm = () => {
        contactForm.reset();
        contactForm
          .querySelectorAll('label, .form-consent')
          .forEach((label) => clearError(label));
        contactForm.classList.remove('is-hidden');
        if (contactSuccess) contactSuccess.hidden = true;
        const navHeight = nav ? nav.offsetHeight : 0;
        const target = document.getElementById('contactForm') || contactForm;
        const top =
          target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
        window.scrollTo({ top, behavior: 'smooth' });
      };

      contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const firstInvalid = validate();
        if (firstInvalid) {
          firstInvalid.focus();
          return;
        }
        // Send to the form's email endpoint; only show success on a real send.
        const endpoint = contactForm.getAttribute('data-form-endpoint');
        if (!endpoint) { showSuccess(); return; }
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        const fallbackEmail = endpoint.split('/').pop();
        const failed = function () {
          window.alert('Sorry, we could not send your message right now. Please email us directly at ' + fallbackEmail + '.');
        };
        fetch(endpoint, {
          method: 'POST',
          body: new FormData(contactForm),
          headers: { Accept: 'application/json' },
        })
          .then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (d) {
              return r.ok && (d.success === true || d.success === 'true' || d.ok === true);
            });
          })
          .then(function (sent) { if (sent) { showSuccess(); } else { failed(); } })
          .catch(failed)
          .finally(function () { if (submitBtn) submitBtn.disabled = false; });
      });

      if (contactReset) contactReset.addEventListener('click', resetForm);
    }

    /* ----------------------------------------------------------
       Category filter (shared by Blogs + Projects pages)
       Click a filter button → show/hide grid items by data-category.
       No-op on pages without the matching IDs.
       ---------------------------------------------------------- */
    const initFilter = (filtersId, gridId, emptyId, itemSelector, btnSelector) => {
      const filters = document.getElementById(filtersId);
      const grid = document.getElementById(gridId);
      if (!filters || !grid) return;
      const empty = emptyId ? document.getElementById(emptyId) : null;
      const filterBtns = $$(btnSelector || '.filter-btn', filters);
      const items = $$(itemSelector, grid);

      const applyFilter = (filter) => {
        let visible = 0;
        items.forEach((item) => {
          const matches =
            filter === 'all' || item.dataset.category === filter;
          item.classList.toggle('is-hidden', !matches);
          if (matches) visible++;
        });
        if (empty) empty.hidden = visible > 0;
        // Notify zoom updater that layout may have changed
        if (window.__updateProjectZoom) window.__updateProjectZoom();
      };

      filterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          filterBtns.forEach((b) => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
          });
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
          applyFilter(btn.dataset.filter || 'all');
        });
      });
    };

    initFilter('blogFilters', 'blogsGrid', 'blogEmpty', '.blog-card');
    initFilter('projectFilters', 'projectsGrid', 'projectsEmpty', '.project-row', '.filter-link');

    /* ----------------------------------------------------------
       Project image zoom-out on scroll
       Each .project-row-image img scales from 1.15 (entering from
       below the viewport) to 0.92 (exiting at the top). rAF-throttled.
       ---------------------------------------------------------- */
    const projectImages = $$('.project-row-image img');
    if (projectImages.length) {
      const reducedMotion =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!reducedMotion) {
        // Keep ZOOM_OUT >= 1.0 so the image always fully covers its
        // wrapper — otherwise the dark wrapper bg shows around a shrunk image.
        const ZOOM_IN = 1.2;
        const ZOOM_OUT = 1.0;
        const RANGE = ZOOM_IN - ZOOM_OUT;
        let ticking = false;

        const update = () => {
          const vh = window.innerHeight;
          projectImages.forEach((img) => {
            const wrap = img.parentElement;
            if (!wrap || wrap.offsetParent === null) return; // hidden by filter
            const rect = wrap.getBoundingClientRect();
            if (rect.bottom < -200 || rect.top > vh + 200) return;
            const center = rect.top + rect.height / 2;
            // progress: 0 when center is at the bottom of viewport,
            //          1 when center is at the top of viewport
            let progress = 1 - center / vh;
            if (progress < 0) progress = 0;
            if (progress > 1) progress = 1;
            const scale = ZOOM_IN - progress * RANGE;
            img.style.transform = `scale(${scale.toFixed(4)})`;
          });
          ticking = false;
        };

        const onScroll = () => {
          if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
          }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        window.__updateProjectZoom = onScroll;
        update();
      }
    }

    /* ----------------------------------------------------------
       Gallery image parallax — each item's image shifts subtly on
       scroll for a premium, layered feel. JS updates the `--py`
       CSS variable; CSS composes it with scale on the image.
       ---------------------------------------------------------- */
    const galleryParallaxItems = $$('.gallery-page-item');
    if (galleryParallaxItems.length) {
      const reducedMotion =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!reducedMotion) {
        const RANGE = 40; // total parallax travel in px (-20 to +20)
        let ticking = false;

        const update = () => {
          ticking = false;
          const vh = window.innerHeight;
          galleryParallaxItems.forEach((item) => {
            if (item.classList.contains('is-hidden')) return;
            const rect = item.getBoundingClientRect();
            if (rect.bottom < -100 || rect.top > vh + 100) return;
            const center = rect.top + rect.height / 2;
            // progress: 0 when center at viewport bottom, 1 when at top
            let progress = 1 - center / vh;
            if (progress < -0.5) progress = -0.5;
            if (progress > 1.5) progress = 1.5;
            const py = (progress - 0.5) * -RANGE; // -20px at bottom → +20px at top
            item.style.setProperty('--py', py.toFixed(2) + 'px');
          });
        };

        const onScroll = () => {
          if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
          }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        update();
      }
    }

    /* ----------------------------------------------------------
       Story (about page) — horizontal scroll: drag/swipe + progress bar.
       Native scrolling stays as the fallback; this adds mouse-drag,
       inertia-feel touch swipe, and a live scroll-progress indicator.
       ---------------------------------------------------------- */
    const storyScroller = $('#storyScroller');
    const storyProgress = $('#storyProgress');
    if (storyScroller) {
      let isDragging = false;
      let startX = 0;
      let startScroll = 0;

      const updateProgress = () => {
        if (!storyProgress) return;
        const max = storyScroller.scrollWidth - storyScroller.clientWidth;
        const pct = max > 0 ? (storyScroller.scrollLeft / max) * 100 : 0;
        storyProgress.style.width = pct + '%';
      };

      storyScroller.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX - storyScroller.offsetLeft;
        startScroll = storyScroller.scrollLeft;
        storyScroller.classList.add('dragging');
      });
      window.addEventListener('mouseup', () => {
        isDragging = false;
        storyScroller.classList.remove('dragging');
      });
      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - storyScroller.offsetLeft;
        storyScroller.scrollLeft = startScroll - (x - startX);
      });
      storyScroller.addEventListener('scroll', updateProgress, { passive: true });
      window.addEventListener('resize', updateProgress);
      updateProgress();
    }

    /* ----------------------------------------------------------
       Count-up animation for stat numbers (hero stats, project stats).
       When a number element scrolls into view, animate from 0 → target
       over ~1.4s with ease-out cubic. Preserves prefix/suffix like "+"
       and zero-padding like "09".
       ---------------------------------------------------------- */
    const numberEls = $$('.stat-card .num, .stat-num');
    if (numberEls.length && 'IntersectionObserver' in window) {
      const reducedMotion =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!reducedMotion) {
        const parse = (text) => {
          // Capture leading non-digits, the digits, then trailing non-digits.
          const m = text.match(/^(\D*)(\d+)(.*)$/);
          if (!m) return null;
          return {
            prefix: m[1],
            target: parseInt(m[2], 10),
            suffix: m[3],
            pad: m[2].length, // for "09" → pad to width 2
          };
        };

        const format = (info, val) => {
          let s = String(val);
          if (info.pad > 1) s = s.padStart(info.pad, '0');
          return info.prefix + s + info.suffix;
        };

        const animate = (el, info, duration) => {
          const start = performance.now();
          const tick = (now) => {
            const t = Math.min((now - start) / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = format(info, Math.round(info.target * eased));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        };

        const counterIO = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              const el = entry.target;
              const info = parse(el.textContent.trim());
              if (info) {
                el.textContent = format(info, 0); // start at 0 visually
                animate(el, info, 1400);
              }
              counterIO.unobserve(el);
            });
          },
          { threshold: 0.5 }
        );
        numberEls.forEach((el) => counterIO.observe(el));
      }
    }

    /* ----------------------------------------------------------
       Gallery page — filter + lightbox
       No-op on pages without the matching IDs.
       ---------------------------------------------------------- */
    initFilter('galleryFilters', 'galleryGrid', null, '.gallery-page-item', '.filter-link');

    const galleryItems = $$('#galleryGrid .gallery-page-item');
    const galleryLightbox = $('#galleryLightbox');
    const lbImg = $('#galleryLightboxImage');
    const lbCaption = $('#galleryLightboxCaption');
    const lbCounter = $('#galleryLightboxCounter');
    const lbClose = $('#galleryLightboxClose');
    const lbPrev = $('#galleryLightboxPrev');
    const lbNext = $('#galleryLightboxNext');

    if (galleryItems.length && galleryLightbox && lbImg) {
      let currentIndex = -1;

      // Only navigate through VISIBLE items (respecting filter)
      const visibleItems = () => galleryItems.filter((i) => !i.classList.contains('is-hidden'));

      const openAt = (idx) => {
        const list = visibleItems();
        if (!list.length) return;
        if (idx < 0) idx = list.length - 1;
        if (idx >= list.length) idx = 0;
        currentIndex = idx;
        const item = list[idx];
        const innerImg = item.querySelector('img');
        const innerCap = item.querySelector('.caption');
        const full = item.dataset.full || (innerImg && innerImg.src);
        const caption = item.dataset.caption || (innerCap && innerCap.textContent) || '';
        lbImg.src = full;
        lbImg.alt = caption;
        if (lbCaption) lbCaption.textContent = caption;
        if (lbCounter) lbCounter.textContent = (idx + 1) + ' / ' + list.length;
        galleryLightbox.classList.add('is-open');
        galleryLightbox.setAttribute('aria-hidden', 'false');
        document.body.classList.add('lightbox-open');
      };

      const closeLb = () => {
        galleryLightbox.classList.remove('is-open');
        galleryLightbox.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('lightbox-open');
        currentIndex = -1;
      };

      const nextLb = () => openAt(currentIndex + 1);
      const prevLb = () => openAt(currentIndex - 1);

      // Gallery images link directly to their project page (no lightbox).

      if (lbClose) lbClose.addEventListener('click', closeLb);
      if (lbNext) lbNext.addEventListener('click', nextLb);
      if (lbPrev) lbPrev.addEventListener('click', prevLb);

      // Click on the backdrop (not on the figure or controls) closes
      galleryLightbox.addEventListener('click', (e) => {
        if (e.target === galleryLightbox) closeLb();
      });

      // Keyboard: ESC closes, arrows navigate
      document.addEventListener('keydown', (e) => {
        if (!galleryLightbox.classList.contains('is-open')) return;
        if (e.key === 'Escape') closeLb();
        else if (e.key === 'ArrowRight') nextLb();
        else if (e.key === 'ArrowLeft') prevLb();
      });

      // Touch swipe: simple horizontal swipe support
      let touchStartX = null;
      galleryLightbox.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) touchStartX = e.touches[0].clientX;
      }, { passive: true });
      galleryLightbox.addEventListener('touchend', (e) => {
        if (touchStartX === null) return;
        const endX = (e.changedTouches[0] && e.changedTouches[0].clientX) || touchStartX;
        const dx = endX - touchStartX;
        if (Math.abs(dx) > 50) {
          if (dx < 0) nextLb(); else prevLb();
        }
        touchStartX = null;
      });
    }

    /* ----------------------------------------------------------
       Smooth-scroll for in-page anchor links
       (CSS already sets scroll-behavior: smooth, but we add a small
       offset for the sticky nav.)
       ---------------------------------------------------------- */
    $$('a[href^="#"]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      a.addEventListener('click', (e) => {
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        const navHeight = nav ? nav.offsetHeight : 0;
        const top =
          target.getBoundingClientRect().top + window.scrollY - navHeight + 1;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });

    /* ----------------------------------------------------------
       Sticky Quote Button
       ---------------------------------------------------------- */
    (function() {
      var btn = document.createElement('a');
      btn.href = 'request-a-quote.html';
      btn.className = 'sticky-quote-btn';
      btn.setAttribute('aria-label', 'Get a free quote');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Get a Free Quote</span>';
      document.body.appendChild(btn);
      window.addEventListener('scroll', function() {
        btn.classList.toggle('visible', window.scrollY > 300);
      }, { passive: true });
    })();

    /* ----------------------------------------------------------
       Brochure Popup — reappears every 2 minutes
       ---------------------------------------------------------- */
    (function() {
      if (window.location.pathname.indexOf('request-a-quote') > -1) return;
      if (window.location.pathname.indexOf('capability-brochure') > -1) return;

      var overlay = document.createElement('div');
      overlay.className = 'exit-popup-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML =
        '<div class="exit-popup">' +
          '<button class="exit-popup-close" aria-label="Close">&times;</button>' +
          '<div class="exit-popup-eyebrow">Free Download</div>' +
          '<h3 class="exit-popup-title">Get our BIM Capability Brochure</h3>' +
          '<p class="exit-popup-text">Download our free overview of services, project examples and how we work with AEC teams worldwide.</p>' +
          '<form class="exit-popup-form" id="exitPopupForm">' +
            '<input type="email" name="email" placeholder="Your work email" required>' +
            '<button type="submit" class="btn"><span class="btn-label">Send me the brochure</span></button>' +
          '</form>' +
          '<p class="exit-popup-note">No spam. Unsubscribe any time.</p>' +
        '</div>';
      document.body.appendChild(overlay);

      var converted = false;
      var timer = null;
      var closePopup = function() { overlay.classList.remove('active'); };
      var showPopup = function() {
        if (converted) return;
        if (overlay.classList.contains('active')) return;
        if (document.hidden) return; // don't pop while tab is in background
        overlay.classList.add('active');
      };

      overlay.querySelector('.exit-popup-close').addEventListener('click', closePopup);
      overlay.addEventListener('click', function(e) { if (e.target === overlay) closePopup(); });
      document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closePopup(); });

      var popupForm = overlay.querySelector('#exitPopupForm');
      popupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var emailVal = popupForm.querySelector('input[type="email"]').value;
        var submitBtn = popupForm.querySelector('button');
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-label').textContent = 'Sending…';
        fetch('https://formsubmit.co/ajax/info@thezenithvisions.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ email: emailVal, _subject: 'Brochure Request (Popup)', _captcha: 'false' })
        }).then(function(r) { return r.json(); }).then(function(data) {
          if (data.success === 'true' || data.success === true) {
            converted = true;
            if (timer) clearInterval(timer); // stop nagging after they convert
            popupForm.innerHTML = '<p style="color:#22c55e;font-weight:600;margin:0;font-size:16px;">&#10003; Sent! We will be in touch within 24 hours.</p>';
          } else { submitBtn.disabled = false; submitBtn.querySelector('.btn-label').textContent = 'Try again'; }
          setTimeout(closePopup, 4000);
        }).catch(function() { submitBtn.disabled = false; submitBtn.querySelector('.btn-label').textContent = 'Try again'; });
      });

      // Show the popup every 2 minutes (first appearance after 2 minutes).
      timer = setInterval(showPopup, 120000);
    })();

    /* ----------------------------------------------------------
       Quote / Brochure form AJAX submit
       ---------------------------------------------------------- */
    ['quoteForm', 'brochureForm'].forEach(function(id) {
      var form = document.getElementById(id);
      if (!form) return;
      var successId = id === 'quoteForm' ? 'quoteSuccess' : 'brochureSuccess';
      var successEl = document.getElementById(successId);
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var submitBtn = form.querySelector('button[type="submit"]');
        var label = submitBtn.querySelector('.btn-label');
        submitBtn.disabled = true;
        label.textContent = 'Sending…';
        var payload = {};
        new FormData(form).forEach(function(v, k) { if (!k.startsWith('_')) payload[k] = v; });
        var subjectEl = form.querySelector('[name="_subject"]');
        payload._subject = subjectEl ? subjectEl.value : 'Form Submission';
        payload._captcha = 'false';
        var endpoint = form.dataset.formEndpoint || 'https://formsubmit.co/ajax/info@thezenithvisions.com';
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function(r) { return r.json(); }).then(function(data) {
          if (data.success === 'true' || data.success === true) {
            form.querySelectorAll('.form-group, .form-row--2, .form-submit-btn, .form-note').forEach(function(el) { el.style.display = 'none'; });
            if (successEl) { successEl.hidden = false; }
          } else { submitBtn.disabled = false; label.textContent = 'Try again'; }
        }).catch(function() { submitBtn.disabled = false; label.textContent = 'Try again'; });
      });
    });

  });
})();
