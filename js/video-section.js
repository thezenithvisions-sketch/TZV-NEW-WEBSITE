/* =========================================================
   Zenith — About page video showreel controller
   - Click play/pause toggle on the dedicated button
   - Click on the video itself pauses playback
   - IntersectionObserver pauses when offscreen to save power
   ========================================================= */
(function () {
  'use strict';

  if (window.__zenithVideoInit) return;
  window.__zenithVideoInit = true;

  function boot() {
    var video = document.getElementById('aboutShowreel');
    var btn = document.getElementById('aboutShowreelBtn');
    if (!video || !btn) return;

    var wrap = video.closest('.video-wrap');

    function markPlaying() {
      btn.classList.add('is-playing');
      btn.setAttribute('aria-pressed', 'true');
      btn.setAttribute('aria-label', 'Pause video');
      if (wrap) wrap.classList.add('is-playing');
    }

    function markPaused() {
      btn.classList.remove('is-playing');
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', 'Play video');
      if (wrap) wrap.classList.remove('is-playing');
    }

    function playVideo() {
      try { video.muted = false; } catch (e) {}
      var p = video.play();
      if (p && typeof p.then === 'function') {
        p.then(markPlaying).catch(function () {
          // Autoplay/unmute blocked — fall back to muted playback
          video.muted = true;
          video.play().then(markPlaying).catch(markPaused);
        });
      } else {
        markPlaying();
      }
    }

    function pauseVideo() {
      video.pause();
      markPaused();
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (video.paused) playVideo(); else pauseVideo();
    });

    video.addEventListener('click', function () {
      if (!video.paused) pauseVideo();
    });

    video.addEventListener('pause', markPaused);
    video.addEventListener('ended', markPaused);
    video.addEventListener('play', markPlaying);

    // Pause when scrolled out of view
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting && !video.paused) pauseVideo();
        });
      }, { threshold: 0.25 });
      io.observe(video);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
