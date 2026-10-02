/* -------------------------------------------------------------------- tour
 * The first-visit tour. Every page walks a new reader through itself the
 * first time it opens, and keeps a Tour button so the walk can be repeated.
 *
 * One engine, three sets of steps (hub, guide, diagram), no dependencies:
 * it only needs the page it is loaded on. The tour owns the keyboard while
 * it runs (capture phase, so the kit and the diagram's own stage stay quiet)
 * and remembers, per page, that the walk has already been taken.
 * Set window.SB_TOUR_OFF = true before this file loads to opt out.
 */
(function () {
  'use strict';

  var STORE = 'sbk.v1.tour';

  var st = { on: false, i: 0, steps: [], key: '', target: null };
  var root, hole, card, ui = {}, dots = [], lastFocus = null;

  /* ------------------------------------------------------------- helpers */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function narrow() { return window.innerWidth < 560; }
  function typing(e) {
    var t = e.target;
    return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable));
  }
  function barButton(label) {
    var list = document.querySelectorAll('#sbkit .sb-bar button');
    for (var i = 0; i < list.length; i++) {
      var s = list[i].querySelector('span');
      if (s && s.textContent.trim() === label) return list[i];
    }
    return null;
  }
  function firstNode() {
    return document.querySelector('.diagram-container svg [data-node-id]') ||
      document.querySelector('[data-node-id]') || null;
  }

  /* ------------------------------------------------------------- storage */
  function read() {
    try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { return {}; }
  }
  function write(o) { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) { } }
  function seen(k) { return !!read()[k]; }
  function markSeen(k) { var s = read(); s[k] = 1; write(s); }

  /* ---------------------------------------------------------- the walks */
  function hubSteps() {
    return [
      {
        title: 'Welcome to the Spring Boot Atlas',
        body: 'Twenty-one diagrams, one folder, no server. This tour takes less than a minute and points at everything the site can do. It stays available from the Tour button whenever you want it back.',
        cta: 'Start'
      },
      {
        sel: '#nav', place: 'bottom', title: 'Six tabs hold the whole site',
        body: 'Home is where you start. Tracks is the reading order. Library lists all 21 diagrams, Practice carries the quizzes and the debugging table, Concepts links the ideas that repeat, and Progress is what you have covered.'
      },
      {
        sel: '#stats', place: 'bottom', title: 'Everything, counted',
        body: 'The whole resource in one row: diagrams, nodes, relationships, guided views, shared concepts, quiz items, debugging entries, interview questions and glossary terms.'
      },
      {
        sel: '#home-cards', place: 'top', title: 'Start with one of these',
        body: 'Each card opens a single diagram with a job to do - the roadmap, the request path, the proxy trap, the N+1 case, the Book Store project. Below them, "How to use it" explains every feature in one line each.'
      },
      {
        sel: '#howto', place: 'top', title: 'How to use it',
        body: 'Five cards, one per feature: the passport, concept chips, present mode, quizzes and the debug table. Read them once and the rest of the site is obvious.'
      },
      {
        sel: '#theme', place: 'bottom', title: 'Theme and print',
        body: 'Flip between dark and light, or print the page to a PDF. Quiz scores and progress live in this browser only - nothing is uploaded anywhere.'
      },
      {
        title: 'Search beats browsing',
        body: 'Press Ctrl + K on any page to search diagrams, nodes, concepts, glossary terms and troubleshooting at once. Press U to bring this tour back, and ? for the full shortcut list.',
        keys: [['Ctrl', 'K'], ['U'], ['?']],
        cta: 'Finish'
      }
    ];
  }

  function diagramSteps() {
    return [
      {
        title: 'One diagram, one idea',
        body: 'Every page here explains a single part of Spring Boot - the request path, the proxy, the transaction boundary, the readiness probe. This tour takes a minute and shows you where everything lives.',
        cta: 'Start'
      },
      {
        sel: '.diagram-container', place: 'bottom', title: 'The diagram itself',
        body: 'Drag to pan, scroll to zoom, press 0 to reset the view. Every shape is live: hover it - or reach it with Tab - and its semantic passport opens beside it.',
        keys: [['0']]
      },
      {
        get: firstNode, place: 'right', title: 'The semantic passport',
        body: 'The passport says what the node is, what it does and three specific facts about it. Chips inside the card jump to the same concept in another diagram, or straight to the source file that implements it.'
      },
      {
        sel: '#sbkit .sb-bar', place: 'bottom', title: 'The toolbar',
        body: 'Everything else lives up here: search, the code lab with the mirrored source, the quiz for this diagram, the review queue, Present mode, the glossary, debugging by symptom, the interview bank, the tour and the hub.'
      },
      {
        get: function () { return barButton('Present'); }, place: 'bottom', title: 'Present mode',
        body: 'Press P and the diagram takes the whole screen: a light stays on the current step while a rail on the right carries the narration. This is the mode for walking a group through the diagram.',
        keys: [['P']]
      },
      {
        get: function () { return barButton('Hub'); }, place: 'bottom', title: 'Back to the hub',
        body: 'The hub holds all 21 diagrams, six learning tracks, your progress and the practice tools. Press Ctrl + K anywhere - hub or diagram - to search everything at once.',
        keys: [['Ctrl', 'K']]
      },
      {
        title: 'That is the tour',
        body: 'Press U at any time to run it again on this page, and ? for the full shortcut list.',
        keys: [['U'], ['?']],
        cta: 'Finish'
      }
    ];
  }

  function guideSteps() {
    return [
      {
        title: 'Welcome to the guide',
        body: 'Everything about using this site: where to start, what every button does, every shortcut, and a 30-day plan for working through it. Six short stops.',
        cta: 'Start'
      },
      {
        sel: '.hero .cta', place: 'bottom', title: 'Three ways in',
        body: '"Start here" jumps to the first step, the cheat sheet lists every shortcut, and the 30-day plan tells you what to read on which day.'
      },
      {
        sel: '#pillnav', place: 'bottom', title: 'The section nav',
        body: 'Fourteen numbered sections that stay pinned under the header while you read. Click one to jump; the thin bar at the very top of the window shows how far down the page you are.'
      },
      {
        sel: '#s04', place: 'bottom', title: 'Anatomy of a diagram page',
        body: 'Learn the layout once - the passport, the concept and code chips, guided views, Present mode - and it works the same way on all 21 diagrams.'
      },
      {
        sel: '#s09', place: 'bottom', title: 'The shortcut cheat sheet',
        body: 'Every keyboard shortcut in one table, with what it does and where it works. Worth one pass, then keep it open in a tab.'
      },
      {
        title: 'That is the guide',
        body: 'Open the hub from the header whenever you are ready to start reading diagrams, and press U to run this tour again.',
        keys: [['U']],
        cta: 'Finish'
      }
    ];
  }

  function stepsFor(key) {
    if (key === 'hub') return hubSteps();
    if (key === 'guide') return guideSteps();
    return diagramSteps();
  }

  /* ------------------------------------------------------------ the DOM */
  function build() {
    if (root) return;
    root = el('div');
    root.id = 'sbtour';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Site tour');

    hole = el('div', 'sbtour-hole');

    card = el('div', 'sbtour-card');
    card.tabIndex = -1;

    var top = el('div', 'sbtour-top');
    ui.eye = el('span', 'sbtour-eye');
    ui.dots = el('span', 'sbtour-dots');
    top.appendChild(ui.eye);
    top.appendChild(ui.dots);

    var main = el('div', 'sbtour-main');
    main.setAttribute('aria-live', 'polite');
    ui.title = el('h3', 'sbtour-title');
    ui.text = el('p', 'sbtour-text');
    ui.keys = el('div', 'sbtour-keys');
    main.appendChild(ui.title);
    main.appendChild(ui.text);
    main.appendChild(ui.keys);

    var foot = el('div', 'sbtour-foot');
    ui.skip = el('button', 'sbtour-skip', 'Skip tour');
    ui.skip.type = 'button';
    var spacer = el('span', 'sbtour-spacer');
    ui.back = el('button', 'sb-btn sbtour-back', 'Back');
    ui.back.type = 'button';
    ui.next = el('button', 'sb-btn is-primary sbtour-next', 'Start');
    ui.next.type = 'button';
    foot.appendChild(ui.skip);
    foot.appendChild(spacer);
    foot.appendChild(ui.back);
    foot.appendChild(ui.next);

    card.appendChild(top);
    card.appendChild(main);
    card.appendChild(foot);
    root.appendChild(hole);
    root.appendChild(card);
    document.body.appendChild(root);

    ui.skip.addEventListener('click', function () { finish(true); });
    ui.back.addEventListener('click', function () { go(st.i - 1); });
    ui.next.addEventListener('click', function () { go(st.i + 1); });
  }

  /* ----------------------------------------------------------- placement */
  function clampPos(p, cw, ch, vw, vh, m) {
    return {
      left: Math.round(Math.min(Math.max(p.left, m), Math.max(vw - cw - m, m))),
      top: Math.round(Math.min(Math.max(p.top, m), Math.max(vh - ch - m, m)))
    };
  }

  function place(r, cw, ch, vw, vh, pref) {
    var m = 16, gap = 18;
    var sides = {
      bottom: { left: r.left + r.width / 2 - cw / 2, top: r.bottom + gap },
      top: { left: r.left + r.width / 2 - cw / 2, top: r.top - gap - ch },
      right: { left: r.right + gap, top: r.top + r.height / 2 - ch / 2 },
      left: { left: r.left - gap - cw, top: r.top + r.height / 2 - ch / 2 }
    };
    var order = [];
    if (pref && sides[pref]) order.push(pref);
    ['bottom', 'right', 'top', 'left'].forEach(function (k) {
      if (order.indexOf(k) < 0) order.push(k);
    });
    var fits = function (k) {
      var p = sides[k];
      return p.left >= m && p.left + cw <= vw - m && p.top >= m && p.top + ch <= vh - m;
    };
    for (var i = 0; i < order.length; i++) {
      if (fits(order[i])) return clampPos(sides[order[i]], cw, ch, vw, vh, m);
    }
    var p = sides.bottom;
    if (r.bottom + gap + ch > vh - m && r.top - gap - ch >= m) p = sides.top;
    return clampPos(p, cw, ch, vw, vh, m);
  }

  function position() {
    if (!st.on || !root || root.hidden) return;
    var vw = window.innerWidth, vh = window.innerHeight, m = 14;
    var isNarrow = narrow();
    var r = st.target ? st.target.getBoundingClientRect() : null;
    if (r && !r.width && !r.height) r = null;

    if (isNarrow) card.style.width = (vw - 20) + 'px';
    else card.style.width = '';
    var cw = card.offsetWidth, ch = card.offsetHeight;

    var pos;
    if (r) {
      pos = isNarrow
        ? { left: 10, top: Math.max(m, vh - ch - 10) }
        : place(r, cw, ch, vw, vh, st.steps[st.i].place);
      hole.style.opacity = '1';
      hole.style.left = Math.round(r.left - 8) + 'px';
      hole.style.top = Math.round(r.top - 8) + 'px';
      hole.style.width = Math.round(r.width + 16) + 'px';
      hole.style.height = Math.round(r.height + 16) + 'px';
    } else {
      pos = { left: (vw - cw) / 2, top: (vh - ch) / 2 };
      hole.style.opacity = '1';
      hole.style.left = Math.round(pos.left - 14) + 'px';
      hole.style.top = Math.round(pos.top - 14) + 'px';
      hole.style.width = Math.round(cw + 28) + 'px';
      hole.style.height = Math.round(ch + 28) + 'px';
    }
    card.style.left = clampPos(pos, cw, ch, vw, vh, m).left + 'px';
    card.style.top = clampPos(pos, cw, ch, vw, vh, m).top + 'px';
  }

  /* ---------------------------------------------------------- the steps */
  function inView(e) {
    var r = e.getBoundingClientRect();
    if (!r.width && !r.height) return false;
    return r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth;
  }

  function show(n) {
    if (!st.steps.length) return;
    st.i = Math.max(0, Math.min(n, st.steps.length - 1));
    var s = st.steps[st.i];
    var last = st.i === st.steps.length - 1;

    st.target = s.get ? s.get() : (s.sel ? document.querySelector(s.sel) : null);
    if (st.target && !inView(st.target)) {
      try {
        st.target.scrollIntoView({ block: narrow() ? 'center' : 'nearest', behavior: 'smooth' });
      } catch (e) { /* older engines jump instead */ }
    }

    if (dots.length !== st.steps.length) {
      clear(ui.dots);
      dots = [];
      for (var d = 0; d < st.steps.length; d++) {
        var dot = el('i');
        ui.dots.appendChild(dot);
        dots.push(dot);
      }
    }
    dots.forEach(function (d, i) {
      if (i === st.i) d.setAttribute('data-on', '');
      else d.removeAttribute('data-on');
    });

    ui.eye.textContent = 'Step ' + pad(st.i + 1) + ' / ' + pad(st.steps.length);
    ui.title.textContent = s.title;
    ui.text.textContent = s.body || '';
    clear(ui.keys);
    (s.keys || []).forEach(function (grp, gi) {
      if (gi) ui.keys.appendChild(el('span', 'sbtour-sep', '\u00b7'));
      grp.forEach(function (k, ki) {
        if (ki) ui.keys.appendChild(el('span', 'sbtour-sep', '+'));
        ui.keys.appendChild(el('kbd', null, k));
      });
    });
    ui.keys.style.display = ui.keys.childNodes.length ? '' : 'none';

    ui.next.textContent = last ? (s.cta || 'Finish') : (st.i === 0 ? (s.cta || 'Start') : 'Next');
    ui.back.hidden = st.i === 0;
    position();
  }

  function go(n) {
    if (!st.on) return;
    if (n >= st.steps.length) { finish(true); return; }
    if (n < 0) return;
    show(n);
  }

  /* ------------------------------------------------------- start / finish */
  function start(key) {
    if (window.SB_TOUR_OFF) return;
    build();
    var wanted = key || st.key;
    st.steps = stepsFor(wanted);
    st.key = wanted;
    if (!st.steps.length) return;
    if (st.on) return;
    st.on = true;
    lastFocus = document.activeElement;
    root.hidden = false;
    document.body.classList.add('sbtour-on');
    show(0);
    requestAnimationFrame(function () {
      if (!st.on) return;
      root.classList.add('is-on');
      position();
    });
  }

  function finish(remember) {
    if (!st.on) return;
    st.on = false;
    if (remember) markSeen(st.key);
    root.classList.remove('is-on');
    document.body.classList.remove('sbtour-on');
    setTimeout(function () { if (!st.on && root) root.hidden = true; }, 260);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { } }
    lastFocus = null;
    st.target = null;
  }

  function toggle() { if (st.on) finish(true); else start(); }

  /* ---------------------------------------------------------- the input */
  function trapFocus(e) {
    var f = card.querySelectorAll('button:not([hidden]), [tabindex="-1"]');
    var list = [];
    for (var i = 0; i < f.length; i++) if (f[i].offsetParent !== null) list.push(f[i]);
    if (!list.length) { card.focus(); return; }
    var at = list.indexOf(document.activeElement);
    var next = e.shiftKey
      ? (at <= 0 ? list.length - 1 : at - 1)
      : (at < 0 || at >= list.length - 1 ? 0 : at + 1);
    list[next].focus();
  }

  function onKey(e) {
    if (!st.on) {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.key || '').toLowerCase() !== 'u') return;
      var kit = document.getElementById('sbkit');
      if (kit && kit.getAttribute('data-sb-view')) return;
      if (document.documentElement.getAttribute('data-present') === 'true') return;
      e.preventDefault();
      start();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    var k = (e.key || '').toLowerCase();
    if (k === 'tab') { trapFocus(e); return; }
    if (k === 'escape') finish(true);
    else if (k === 'arrowright' || k === 'enter' || k === ' ') go(st.i + 1);
    else if (k === 'arrowleft' || k === 'backspace') go(st.i - 1);
    else if (k === 'home') go(0);
    else if (k === 'end') go(st.steps.length - 1);
  }

  function onFocusIn(e) {
    if (st.on && root && !root.contains(e.target)) card.focus();
  }

  function noScroll(e) { if (st.on) e.preventDefault(); }

  /* ---------------------------------------------------------- the button */
  function ensureButton() {
    if (document.getElementById('sbtour-btn')) return true;
    var bar = document.querySelector('#sbkit .sb-bar');
    if (bar && !(document.body && document.body.classList.contains('sb-hub'))) {
      var b = el('button');
      b.type = 'button';
      b.id = 'sbtour-btn';
      b.title = 'Tour  (U)';
      b.appendChild(el('span', null, 'Tour'));
      b.appendChild(el('span', 'sb-kbd', 'U'));
      b.addEventListener('click', toggle);
      var hub = barButton('Hub');
      if (hub) bar.insertBefore(b, hub); else bar.appendChild(b);
      return true;
    }
    var head = document.querySelector('header.top .top-in');
    if (head) {
      var h = el('button', 'sb-btn', 'Tour');
      h.type = 'button';
      h.id = 'sbtour-btn';
      h.title = 'Take the tour (U)';
      h.addEventListener('click', toggle);
      head.insertBefore(h, head.querySelector('#theme'));
      return true;
    }
    return false;
  }

  /* ------------------------------------------------------------- the run */
  function auto() {
    if (window.SB_TOUR_OFF) return;
    var q = location.search || '';
    if (/[?&]tour=0/.test(q)) return;
    if (/[?&]tour=1/.test(q)) { setTimeout(function () { start(); }, 700); return; }
    if (location.hash) return;
    if (seen(st.key)) return;
    if (document.documentElement.getAttribute('data-present') === 'true') return;
    setTimeout(function () {
      if (st.on || seen(st.key) || location.hash || window.SB_TOUR_OFF) return;
      var kit = document.getElementById('sbkit');
      if (kit && kit.getAttribute('data-sb-view')) return;
      if (document.documentElement.getAttribute('data-present') === 'true') return;
      start();
    }, 1100);
  }

  function boot() {
    var name = location.pathname.split('/').pop() || '';
    if (document.body && document.body.classList.contains('sb-hub')) st.key = 'hub';
    else if (/^guide\.html$/i.test(name)) st.key = 'guide';
    else st.key = 'diagram:' + name.replace(/\.html$/i, '');

    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocusIn, true);
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
    window.addEventListener('wheel', noScroll, { passive: false });
    window.addEventListener('touchmove', noScroll, { passive: false });

    var tries = 0;
    (function button() {
      if (ensureButton()) return;
      if (tries++ < 12) setTimeout(button, 250);
    })();

    auto();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.SBTour = {
    start: start,
    skip: function () { finish(true); },
    toggle: toggle,
    seen: seen,
    markSeen: markSeen,
    forget: function () { write({}); },
    key: function () { return st.key; },
    active: function () { return st.on; },
    steps: function () { return st.steps; }
  };
})();
