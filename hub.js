(function () {
  'use strict';

  var IDX = window.SB_INDEX;
  var CON = window.SB_CONCEPTS || {};
  var STUDY = window.SB_STUDY || { quiz: [], troubleshooting: [], interview: [], glossary: [] };
  if (!IDX || !IDX.diagrams) return;

  var LS = 'sbk.v1.';
  var D = IDX.diagrams;
  var keys = Object.keys(D);

  function read(k, dflt) { try { var v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : dflt; } catch (e) { return dflt; } }
  function write(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function btn(label, cls, fn) { var b = el('button', cls || 'sb-btn', label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function openD(d, n) { location.href = d + '.html' + (n ? '#node=' + encodeURIComponent(n) : ''); }

  function typeLabel(t) {
    return { workflow: 'workflow', sequence: 'sequence', architecture: 'architecture', lifecycle: 'lifecycle', dataflow: 'data flow' }[t] || t;
  }

  function quizFor(d) { return (STUDY.quiz || []).filter(function (q) { return q.d === d; }).length; }

  function card(title, desc, meta, onClick, badge) {
    var c = el('button', 'card');
    c.type = 'button';
    c.appendChild(el('h3', null, title));
    c.appendChild(el('p', null, desc));
    var m = el('div', 'm');
    if (badge) m.appendChild(el('i', null, badge));
    (meta || []).forEach(function (x) { m.appendChild(el('span', null, x)); });
    c.appendChild(m);
    if (onClick) c.addEventListener('click', onClick);
    return c;
  }

  function renderStats() {
    var host = document.getElementById('stats');
    clear(host);
    var rows = [
      [IDX.stats.diagrams, 'diagrams'],
      [IDX.stats.tracks, 'tracks'],
      [IDX.stats.nodes, 'nodes'],
      [IDX.stats.edges, 'relationships'],
      [IDX.stats.views, 'guided views'],
      [Object.keys(CON).length, 'concepts'],
      [(STUDY.quiz || []).length, 'quiz items'],
      [(STUDY.troubleshooting || []).length, 'debug entries'],
      [(STUDY.interview || []).length, 'interview Qs'],
      [(STUDY.glossary || []).length, 'glossary terms'],
    ];
    rows.forEach(function (r) {
      var s = el('div', 'stat');
      s.appendChild(el('b', null, String(r[0])));
      s.appendChild(el('span', null, r[1]));
      host.appendChild(s);
    });
  }

  /* Status strip above the home pane: how far the reader has got, one-click
   * resume into the most recently opened diagram, and the keys that are easy
   * to forget. Progress values are Date.now() stamps written by sbkit.js. */
  function renderRail() {
    var host = document.getElementById('rail');
    if (!host) return;
    clear(host);

    var progress = read('progress', {});
    var quiz = read('quiz', {});

    var opened = keys.filter(function (k) { return progress[k]; });
    var last = null, lastT = -1;
    keys.forEach(function (k) {
      var t = progress[k];
      if (typeof t !== 'number' || t <= lastT) return;
      lastT = t;
      last = k;
    });

    var qDone = 0, qRight = 0;
    keys.forEach(function (k) { var r = quiz[k]; if (r) { qDone += r.done; qRight += r.score; } });

    host.appendChild(el('span', 'rail-k', 'Status'));

    var meter = el('div', 'meter');
    var fill = el('i');
    fill.style.width = Math.round((opened.length / keys.length) * 100) + '%';
    meter.appendChild(fill);
    host.appendChild(meter);

    host.appendChild(el('span', 'rail-v', opened.length + '/' + keys.length + ' diagrams opened'));
    host.appendChild(el('span', 'rail-k', qRight + '/' + qDone + ' quiz right'));

    if (last) {
      host.appendChild(el('span', 'rail-sep'));
      host.appendChild(btn('Resume \u2192 ' + D[last].title, 'sb-btn is-primary', function () { openD(last); }));
    }

    host.appendChild(el('span', 'rail-sep'));
    var box = el('div', 'rail-keys');
    box.appendChild(el('span', 'rail-k', 'Keys'));
    [
      ['1-6', 'switch tabs', function () { tab('tracks'); }],
      ['Ctrl K', 'search everything', function () { if (window.SBKit) window.SBKit.open('search'); }],
      ['?', 'shortcut list', function () { if (window.SBKit) window.SBKit.open('help'); }]
    ].forEach(function (r) {
      var b = el('button', 'keychip');
      b.type = 'button';
      b.title = r[1];
      b.appendChild(el('kbd', null, r[0]));
      b.appendChild(el('span', null, r[1]));
      b.addEventListener('click', r[2]);
      box.appendChild(b);
    });
    host.appendChild(box);
  }

  function renderHome() {
    var host = document.getElementById('home-cards');
    clear(host);
    host.appendChild(card('First time here? Start with this', 'Every feature, every shortcut, best practices and a 30-day plan - all in plain English. Start here to get the most out of the platform.', ['start here', 'guide.html'], function () { location.href = 'guide.html'; }, 'guide'));
    host.appendChild(card('Start here: the roadmap', 'Six parts, twenty-one diagrams, in the order that actually builds the mental model.', ['1 diagram', '6 sections'], function () { openD('Spring_Boot_Roadmap'); }, 'begin here'));
    host.appendChild(card('Trace a request end to end', 'Browser, filter chain, dispatcher, controller, service, transaction, repository, SQL.', ['7 nodes', '12 relationships'], function () { openD('Spring_Boot_Request_Path'); }));
    host.appendChild(card('See the proxy trap', 'Why @Transactional, @Cacheable and @Async quietly stop working on self-invocation.', ['AOP + anti-patterns'], function () { openD('Spring_Boot_AOP_Proxy'); }));
    host.appendChild(card('Fix the query that ruins production', 'One query becomes a hundred. Hibernate fetch plans, join fetch, and the entity graph answer.', ['N+1 path'], function () { openD('Spring_Boot_Nplus1'); }));
    host.appendChild(card('Ship it and watch it', 'Actuator, health groups, metrics, traces, and what readiness should actually check.', ['observability'], function () { openD('Spring_Boot_Observability'); }));
    host.appendChild(card('Run the code', 'A small Book Store API with the same entities, the same N+1, the same transaction boundary.', ['runnable project'], function () { location.href = 'bookstore/'; }, 'code'));

    var how = document.getElementById('howto');
    clear(how);
    [
      ['Hover anything', 'Every node and relationship carries a summary and three specific points. Keyboard users can Tab to a shape and get the same card.'],
      ['Follow a concept sideways', 'When a card shows concept chips, that idea appears in other diagrams. Click one to see the same trap from a different angle.'],
      ['Present a view', 'Press P. Each guided view dims everything except the nodes that matter, with the narration note underneath.'],
      ['Test yourself', 'Press Q for a quiz scoped to the diagram you are on. Wrong answers explain themselves, and your score is kept.'],
      ['Debug by symptom', 'Press T. 47 entries keyed by the exception, the status code, or the log line you are actually staring at.'],
    ].forEach(function (r) {
      var c = el('div', 'card');
      c.style.cursor = 'default';
      c.appendChild(el('h3', null, r[0]));
      c.appendChild(el('p', null, r[1]));
      how.appendChild(c);
    });
  }

  function renderTracks() {
    var host = document.getElementById('tracks');
    clear(host);
    var progress = read('progress', {});
    var quiz = read('quiz', {});
    IDX.tracks.forEach(function (t) {
      var sec = el('div', 'track');
      var head = el('header');
      head.appendChild(el('h3', null, t.name));
      head.appendChild(el('em', null, t.blurb));
      var seen = t.diagrams.filter(function (k) { return progress[k]; }).length;
      var bar = el('div', 'bar');
      var fill = el('i');
      fill.style.width = Math.round((seen / t.diagrams.length) * 100) + '%';
      bar.appendChild(fill);
      head.appendChild(bar);
      head.appendChild(el('code', null, seen + '/' + t.diagrams.length + ' opened'));
      sec.appendChild(head);
      var grid = el('div', 'grid');
      t.diagrams.forEach(function (k) {
        var d = D[k];
        var rec = quiz[k] || { score: 0, done: 0 };
        grid.appendChild(card(d.title, quizFor(k) + ' quiz items · ' + d.views.length + ' guided views',
          [d.nodes.length + ' nodes', d.edges.length + ' rels', typeLabel(d.type)],
          function () { openD(k); },
          rec.done ? Math.round((rec.score / rec.done) * 100) + '% quiz' : null));
      });
      sec.appendChild(grid);
      host.appendChild(sec);
    });
  }

  function renderLibrary() {
    var host = document.getElementById('library');
    clear(host);
    keys.forEach(function (k) {
      var d = D[k];
      host.appendChild(card(d.title, d.track + ' · ' + d.views.map(function (v) { return v.label; }).join(' / '),
        [d.nodes.length + ' nodes', d.edges.length + ' rels', (d.code || []).length + ' code links'], function () { openD(k); }, typeLabel(d.type)));
    });
  }

  function renderPractice() {
    var host = document.getElementById('practice');
    clear(host);
    var qhost = document.getElementById('practice-quiz');
    clear(qhost);

    host.appendChild(card('Quiz', (STUDY.quiz || []).length + ' questions across all 21 diagrams, each tied to a specific node.', ['pick a diagram below'], function () { pickQuiz(); }, 'interactive'));
    host.appendChild(card('Debugging table', (STUDY.troubleshooting || []).length + ' entries: symptom, likely cause, concrete fix.', ['symptom first'], function () { window.SBKit.open('trouble'); }, 'lookup'));
    host.appendChild(card('Interview bank', (STUDY.interview || []).length + ' questions across junior, mid and senior.', ['model answers'], function () { window.SBKit.open('interview'); }, 'practice'));
    host.appendChild(card('Glossary', (STUDY.glossary || []).length + ' terms, each linked back to the diagrams that use it.', ['searchable'], function () { window.SBKit.open('glossary'); }, 'reference'));

    function pickQuiz() {
      clear(qhost);
      var head = el('div', 'row');
      head.appendChild(el('h3', null, 'Choose a diagram to be quizzed on'));
      qhost.appendChild(head);
      var grid = el('div', 'grid');
      keys.forEach(function (k) {
        var n = quizFor(k);
        grid.appendChild(card(D[k].title, n + ' questions on this diagram', ['quiz'], function () {
          location.href = k + '.html' + '#view=quiz';
        }, n ? n + ' q' : 'none'));
      });
      qhost.appendChild(grid);
      var note = el('div', 'note');
      note.style.marginTop = '12px';
      note.textContent = 'A diagram without its own questions still falls back to the full bank when you press Q on it.';
      qhost.appendChild(note);
    }
    pickQuiz();
  }

  function renderConcepts() {
    var host = document.getElementById('conceptlist');
    clear(host);
    var slugs = Object.keys(CON).sort(function (a, b) {
      return CON[b].refs.length - CON[a].refs.length;
    });
    slugs.forEach(function (s) {
      var c = CON[s];
      var ds = {};
      c.refs.forEach(function (r) { ds[r[0]] = 1; });
      host.appendChild(card(c.t, c.s, [Object.keys(ds).length + ' diagrams', c.refs.length + ' links'],
        function () { window.SBKit.open('concept', s); }, s));
    });
  }

  function renderProgress() {
    var host = document.getElementById('progress');
    clear(host);
    var progress = read('progress', {});
    var quiz = read('quiz', {});

    var total = keys.length;
    var opened = keys.filter(function (k) { return progress[k]; }).length;
    var qDone = 0, qRight = 0;
    keys.forEach(function (k) { var r = quiz[k]; if (r) { qDone += r.done; qRight += r.score; } });

    var stats = el('div', 'stats');
    [[opened + '/' + total, 'diagrams opened'], [qRight + '/' + qDone, 'quiz answers right'], [String(Object.keys(CON).length), 'concepts available']]
      .forEach(function (r) {
        var s = el('div', 'stat');
        s.appendChild(el('b', null, r[0]));
        s.appendChild(el('span', null, r[1]));
        stats.appendChild(s);
      });
    host.appendChild(stats);

    var head = el('div', 'prow');
    head.style.background = 'none';
    head.style.border = '0';
    head.style.padding = '0 11px';
    head.style.color = 'var(--text-dim)';
    head.style.fontSize = '11px';
    head.style.textTransform = 'uppercase';
    head.style.letterSpacing = '.08em';
    head.style.fontWeight = '700';
    ['Diagram', 'Opened', 'Quiz', 'Progress'].forEach(function (t) { head.appendChild(el('b', null, t)); });
    host.appendChild(head);

    keys.forEach(function (k) {
      var d = D[k];
      var r = el('div', 'prow');
      var a = el('b', null, d.title);
      a.style.cursor = 'pointer';
      a.addEventListener('click', function () { openD(k); });
      r.appendChild(a);
      r.appendChild(el('span', 'n', progress[k] ? 'yes' : 'not yet'));
      var rec = quiz[k] || { score: 0, done: 0 };
      r.appendChild(el('span', 'n', rec.done ? rec.score + '/' + rec.done : '—'));
      var bar = el('div', 'bar');
      var fill = el('i');
      var pct = 0;
      if (progress[k]) pct += 50;
      if (rec.done) pct += 50;
      fill.style.width = pct + '%';
      bar.appendChild(fill);
      r.appendChild(bar);
      host.appendChild(r);
    });
  }

  function tab(name) {
    Array.prototype.forEach.call(document.querySelectorAll('#nav button'), function (b) {
      if (b.getAttribute('data-tab') === name) b.setAttribute('data-on', '');
      else b.removeAttribute('data-on');
    });
    Array.prototype.forEach.call(document.querySelectorAll('section.pane'), function (p) {
      if (p.getAttribute('data-pane') === name) p.setAttribute('data-on', '');
      else p.removeAttribute('data-on');
    });
    if (name === 'progress') renderProgress();
    if (name === 'tracks') renderTracks();
    try { history.replaceState(null, '', '#' + name); } catch (e) { /* ignore */ }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function initTheme() {
    var t = localStorage.getItem('sbk.theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    var b = document.getElementById('theme');
    b.textContent = t === 'dark' ? 'Light' : 'Dark';
    b.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('sbk.theme', next);
      b.textContent = next === 'dark' ? 'Light' : 'Dark';
    });
  }

  function init() {
    if (!document.body.classList.contains('sb-hub')) return;
    initTheme();
    renderStats();
    renderRail();
    renderHome();
    renderLibrary();
    renderPractice();
    renderConcepts();

    document.getElementById('nav').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-tab]');
      if (b) tab(b.getAttribute('data-tab'));
    });
    document.getElementById('print').addEventListener('click', function () { window.print(); });
    document.getElementById('print2').addEventListener('click', function () { window.print(); });
    document.getElementById('reset').addEventListener('click', function () {
      ['progress', 'quiz'].forEach(function (k) { localStorage.removeItem(LS + k); });
      renderProgress();
      renderRail();
      if (window.SBKit) window.SBKit.close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === 'Escape') { if (!window.SBKit || !window.SBKit.index()) return; }
      if (e.altKey) return;
      var map = { 1: 'home', 2: 'tracks', 3: 'library', 4: 'practice', 5: 'concepts', 6: 'progress' };
      if (map[e.key]) { e.preventDefault(); tab(map[e.key]); }
    });
    var h = (location.hash || '').replace('#', '');
    if (h && document.querySelector('section.pane[data-pane="' + h + '"]')) tab(h);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.SBHub = { tab: tab, refresh: function () { renderProgress(); renderTracks(); renderRail(); } };
})();
