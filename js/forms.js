/* forms.js — site-wide enquiry and newsletter forms
 *  - footer "Get a free quote" form (Home, Services, Projects, About)
 *  - footer newsletter sign-up (every page)
 *  - Blogs page newsletter sign-up
 * These used to have placeholder handlers that only showed an alert (or,
 * for the quote form, failed to run and reloaded the page with the
 * visitor's details in the URL) and sent nothing. They now go to the same
 * inbox as the other enquiry forms, via FormSubmit's AJAX endpoint, with
 * the result shown inline. Without JavaScript the forms still POST to
 * FormSubmit through their action attribute.
 * Loaded on every page (after main.js; About loads it on its own).
 */
(function () {
  'use strict';

  if (window.__zenithFormsInit) return;
  window.__zenithFormsInit = true;

  var INBOX = 'hello@thezenithvisions.com';
  var ENDPOINT = 'https://formsubmit.co/ajax/' + INBOX;

  function send(form) {
    var payload = {};
    new FormData(form).forEach(function (v, k) {
      if (typeof v === 'string' && v.trim() !== '') payload[k] = v.trim();
    });
    payload._captcha = 'false';
    payload.page = location.pathname.replace(/^\//, '') || 'index.html';
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        return r.ok && (d.success === true || d.success === 'true');
      });
    });
  }

  // One live-region message per form, reused for success and errors.
  function showStatus(form, kind, text) {
    var el = form.querySelector('.form-status');
    if (!el) {
      el = document.createElement('p');
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      form.appendChild(el);
    }
    el.className = 'form-status is-' + kind;
    el.textContent = text;
    return el;
  }

  function wire(form, onSent) {
    // Drop the old placeholder handler (inline onsubmit attribute).
    form.onsubmit = null;
    form.removeAttribute('onsubmit');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.checkValidity && !form.checkValidity()) {
        if (form.reportValidity) form.reportValidity();
        return;
      }
      var btn = form.querySelector('[type="submit"]');
      var label = btn ? (btn.querySelector('.btn-label') || btn) : null;
      var original = label ? label.textContent : '';
      if (btn) btn.disabled = true;
      if (label) label.textContent = 'Sending…';
      var old = form.querySelector('.form-status');
      if (old) old.remove();

      send(form)
        .then(function (ok) {
          if (!ok) throw new Error('not sent');
          onSent(form);
        })
        .catch(function () {
          showStatus(form, 'error', 'Sorry, we couldn’t send that right now. Please email us at ' + INBOX + '.');
          if (btn) btn.disabled = false;
          if (label) label.textContent = original;
        });
    });
  }

  function init() {
    // Footer quote form: swap the fields for a confirmation.
    document.querySelectorAll('form.contact-form').forEach(function (form) {
      wire(form, function (f) {
        Array.prototype.forEach.call(f.children, function (c) { c.hidden = true; });
        var msg = showStatus(f, 'success', 'Thank you, your request has been sent. We’ll reply within one business day.');
        msg.hidden = false;
        var r = msg.getBoundingClientRect();
        if (r.top < 80 || r.bottom > window.innerHeight) msg.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    });

    // Footer newsletter (every page).
    document.querySelectorAll('.footer-newsletter form').forEach(function (form) {
      wire(form, function (f) {
        f.reset();
        Array.prototype.forEach.call(f.querySelectorAll('input, button'), function (c) { c.hidden = true; });
        showStatus(f, 'success', 'Thanks, you’re subscribed.');
      });
    });

    // Blogs page newsletter: it has its own success line.
    document.querySelectorAll('.blogs-newsletter-form').forEach(function (form) {
      wire(form, function (f) {
        f.reset();
        var row = f.querySelector('.input-row');
        if (row) row.hidden = true;
        var ok = f.querySelector('.success');
        if (ok) ok.hidden = false;
        else showStatus(f, 'success', 'Thanks, you’re on the list.');
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
