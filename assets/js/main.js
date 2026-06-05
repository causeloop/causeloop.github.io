/* =================================================================
   Causeloop — interactions
   Theme toggle · scroll reveal · count-up · mobile nav · demo form
   ================================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme: persist + respect system preference ---------- */
  var toggle = document.getElementById('themeToggle');
  var stored = null;
  try { stored = localStorage.getItem('cl-theme'); } catch (e) {}
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var initial = stored || (prefersDark ? 'dark' : 'light');
  applyTheme(initial);

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (toggle) toggle.setAttribute('aria-pressed', String(theme === 'dark'));
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0C1124' : '#1E2A5A');
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('cl-theme', next); } catch (e) {}
    });
  }

  /* ---------- Sticky nav border on scroll ---------- */
  var topbar = document.querySelector('.topbar');
  function onScroll() {
    if (topbar) topbar.classList.toggle('scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  var burger = document.getElementById('navBurger');
  var links = document.getElementById('navLinks');
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Count-up numbers ---------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduceMotion) { el.textContent = format(target); return; }
    var start = performance.now();
    var dur = 1400;
    function tick(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function format(n) { return n >= 1000 ? n.toLocaleString('en-US') : String(n); }

  /* ---------- Reveal on scroll + trigger counters ---------- */
  var reveals = document.querySelectorAll('.reveal');
  var counters = document.querySelectorAll('[data-count]');

  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });

    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { countUp(entry.target); co.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
    counters.forEach(function (el) { el.textContent = format(parseInt(el.getAttribute('data-count'), 10) || 0); });
  }

  /* ---------- Demo form (front-end stub) ---------- */
  var form = document.getElementById('ctaForm');
  var note = document.getElementById('ctaNote');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('email');
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      if (!ok) {
        input.focus();
        if (note) note.textContent = 'PLEASE ENTER A VALID WORK EMAIL';
        return;
      }
      form.innerHTML = '<p style="color:#fff;font-family:var(--f-display);font-weight:600;font-size:1.1rem">Thanks — we’ll be in touch within one business day.</p>';
    });
  }

  /* ---------- Footer year ---------- */
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
})();

/* =================================================================
   Hero interactive end-to-end flow: Connect → Detect → Predict → Prove
   Auto-advances in sync with the progress bar; click a step to jump;
   hover pauses; respects prefers-reduced-motion.
   ================================================================= */
(function () {
  'use strict';
  var deck = document.getElementById('flowdeck');
  if (!deck) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pill = document.getElementById('flowPill');
  var numA = document.getElementById('flowNumA'), labA = document.getElementById('flowLabA');
  var numB = document.getElementById('flowNumB'), labB = document.getElementById('flowLabB');
  var chip = document.getElementById('flowChip');
  var gGraph = document.getElementById('stageGraph');
  var gDash = document.getElementById('stageDash');
  var gProof = document.getElementById('stageProof');
  var steps = [].slice.call(deck.querySelectorAll('.fstep'));
  var barWrap = deck.querySelector('.flow-progress');
  var bar = barWrap ? barWrap.querySelector('i') : null;

  var CFG = [
    { stage: 'graph', converged: false, pill: 'Connecting sources',           a: ['1,284', 'issues'],   b: ['5', 'sources'],     chip: 'Ingesting every source' },
    { stage: 'graph', converged: true,  pill: 'Root cause found',             a: ['1,284', 'issues'],   b: ['7', 'themes'],      chip: '1,284 → 7 patterns' },
    { stage: 'dash',                    pill: 'Predicted recurrence · 92%', a: ['14', 'at-risk'],     b: ['92%', 'recurrence'],chip: 'Emerging in Operations' },
    { stage: 'proof',                   pill: 'Sustainability proven',        a: ['38', 'prevented'],   b: ['0', 'reopened'],    chip: 'Attestation ready' }
  ];
  var idx = 0, hovered = false;

  function render(n) {
    idx = n;
    var c = CFG[n];
    steps.forEach(function (b) {
      var on = (+b.getAttribute('data-step')) === n;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (pill) pill.textContent = c.pill;
    if (numA) numA.textContent = c.a[0];
    if (labA) labA.textContent = c.a[1];
    if (numB) numB.textContent = c.b[0];
    if (labB) labB.textContent = c.b[1];
    if (chip) chip.textContent = c.chip;
    gGraph.classList.toggle('is-active', c.stage === 'graph');
    gDash.classList.toggle('is-active', c.stage === 'dash');
    gProof.classList.toggle('is-active', c.stage === 'proof');
    gGraph.classList.toggle('converged', !!c.converged);
  }

  function restart() {
    if (reduce || !bar) return;
    deck.classList.remove('run');
    void bar.offsetWidth; // reflow to restart the CSS animation
    deck.classList.add('run');
  }

  function go(n) { render(n); restart(); }

  if (bar) {
    bar.addEventListener('animationend', function () {
      if (!hovered) go((idx + 1) % CFG.length);
    });
  }
  steps.forEach(function (b) {
    b.addEventListener('click', function () { go(+b.getAttribute('data-step')); });
  });
  deck.addEventListener('mouseenter', function () { hovered = true; deck.classList.add('paused'); });
  deck.addEventListener('mouseleave', function () { hovered = false; deck.classList.remove('paused'); });

  if (reduce) { render(1); } // static, meaningful "patterns found" view
  else { go(0); }
})();
