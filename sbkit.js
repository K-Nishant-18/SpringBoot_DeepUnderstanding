(function () {
  'use strict';

  var IDX = window.SB_INDEX || null;
  var CON = window.SB_CONCEPTS || {};
  var STUDY = window.SB_STUDY || { quiz: [], troubleshooting: [], interview: [], glossary: [] };
  var SRC = window.SB_SOURCE || null;
  var EV = window.SB_EVIDENCE || null;
  var TRACES = window.SB_TRACES || {};
  var FILES = (SRC && SRC.files) || {};
  var ANCHORS = (SRC && SRC.anchors) || [];
  STUDY.quiz = STUDY.quiz || [];
  STUDY.troubleshooting = STUDY.troubleshooting || [];
  STUDY.interview = STUDY.interview || [];
  STUDY.glossary = STUDY.glossary || [];

  if (!IDX || !IDX.diagrams) return;

  var SELF = (location.pathname.split(/[\\/]/).pop() || '').replace(/\.html$/i, '');
  var DIA = IDX.diagrams[SELF] || null;
  var LS = 'sbk.v1.';
  var root, overlay, panel, headEl, bodyEl, footEl, toastEl, view = null, state = {};

  function read(k, dflt) {
    try { var v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : dflt; }
    catch (e) { return dflt; }
  }
  function write(k, v) {
    try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) { /* private mode */ }
  }

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function btn(label, cls, onClick) {
    var b = el('button', cls, label);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  }); }
  function hl(text, q) {
    var s = esc(text);
    if (!q) return s;
    var toks = q.split(/\s+/).filter(function (t) { return t.length > 1; });
    toks.forEach(function (t) {
      var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      s = s.replace(re, '<mark>$1</mark>');
    });
    return s;
  }
  var ltrs = 'ABCDEFGH';

  function toast(msg) {
    toastEl.textContent = msg;
    root.setAttribute('data-sb-toast', '');
    clearTimeout(state.toastT);
    state.toastT = setTimeout(function () { root.removeAttribute('data-sb-toast'); }, 1700);
  }

  function nodeTitle(d, n) {
    var dia = IDX.diagrams[d];
    if (!dia) return n;
    var hit = dia.nodes.filter(function (x) { return x.id === n; })[0];
    return hit ? hit.label : n;
  }

  function linkTo(d, n, text) {
    var a = el('button', 'sb-link');
    a.type = 'button';
    a.appendChild(el('span', null, text || nodeTitle(d, n)));
    a.appendChild(el('span', 'sb-lk', d.replace('Spring_Boot_', '').slice(0, 16)));
    a.addEventListener('click', function () { go(d, n); });
    return a;
  }

  function go(d, n) {
    var target = IDX.diagrams[d] ? d + '.html' : null;
    if (!target) { toast('Unknown diagram'); return; }
    location.href = target + (n ? '#node=' + encodeURIComponent(n) : '');
  }

  function meta(kind, d, n) {
    var b = el('span', 'sb-h-m', kind + (d ? ' / ' + d.replace('Spring_Boot_', '') : '') + (n ? ' / ' + n : ''));
    return b;
  }

  function open(v, arg) {
    if (view === 'present' && v !== 'present') stopPresent();
    view = v;
    state.arg = arg;
    root.setAttribute('data-sb-open', '');
    root.setAttribute('data-sb-view', v);
    render();
  }
  function close() {
    view = null;
    state.arg = null;
    root.removeAttribute('data-sb-open');
    root.removeAttribute('data-sb-view');
    stopPresent();
    if (panel) panel.focus();
  }

  function setPanel(title, sub, wide, slim, withFoot) {
    Array.prototype.forEach.call(panel.children, function (c) {
      if (c.classList.contains('sb-searchwrap') || c.classList.contains('sb-tabs')) panel.removeChild(c);
    });
    clear(headEl); clear(bodyEl);
    if (footEl.parentNode) footEl.parentNode.removeChild(footEl);
    if (withFoot) headEl.parentNode.appendChild(footEl);
    panel.className = 'sb-panel' + (wide ? ' is-wide' : '') + (slim ? ' is-slim' : '');
    headEl.appendChild(el('h2', null, title));
    if (sub) headEl.appendChild(el('span', 'sb-sub', sub));
    headEl.appendChild(el('span', 'sb-spacer'));
    headEl.appendChild(btn('×', 'sb-x', close));
  }

  function mkRow(cls) { var d = el('div', cls); return d; }

  function section(title) {
    var s = el('div', 'sb-sect');
    if (title) s.appendChild(el('h3', null, title));
    return s;
  }

  function tagList(list) {
    var d = el('div', 'sb-chips');
    list.forEach(function (k) {
      var c = el('button', 'sb-chip');
      c.type = 'button';
      c.appendChild(el('span', 'sb-dot'));
      c.appendChild(el('span', null, (IDX.diagrams[k] ? IDX.diagrams[k].title : k).replace('Spring Boot ', '')));
      c.addEventListener('click', function () { go(k); });
      d.appendChild(c);
    });
    return d;
  }

  function conceptsFor(d, n) {
    return Object.keys(CON).filter(function (slug) {
      return CON[slug].refs.some(function (r) { return r[0] === d && r[1] === n; });
    });
  }

  function findNode(keyArg) {
    var q = (keyArg || '').replace(/^node=/, '').replace(/^sb=/, '');
    if (!q) return null;
    try { q = decodeURIComponent(q); } catch (e) { /* raw */ }
    return q;
  }

  function focusNode(n) {
    var t = document.querySelector('[data-node-id="' + (window.CSS && CSS.escape ? CSS.escape(n) : n) + '"]');
    if (!t) return false;
    try { t.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' }); } catch (e) { t.scrollIntoView(); }
    setTimeout(function () { if (t.focus) t.focus(); }, 120);
    return true;
  }

  var searchCorpus = null;
  function buildCorpus() {
    if (searchCorpus) return searchCorpus;
    var c = [];
    Object.keys(IDX.diagrams).forEach(function (d) {
      var dia = IDX.diagrams[d];
      c.push({ g: 'Diagrams', t: dia.title, s: dia.track + ' / ' + dia.type, x: dia.title + ' ' + d, act: function () { go(d); } });
      dia.nodes.forEach(function (n) {
        c.push({ g: 'Nodes', t: n.label, s: d.replace('Spring_Boot_', '') + (n.sublabel ? ' / ' + n.sublabel : ''), x: n.label + ' ' + (n.sublabel || '') + ' ' + n.s + ' ' + (n.b || []).join(' '), act: function () { go(d, n.id); } });
      });
      dia.edges.forEach(function (e) {
        var lbl = e.label || (e.from + ' -> ' + e.to);
        c.push({ g: 'Relationships', t: lbl, s: d.replace('Spring_Boot_', ''), x: lbl + ' ' + e.s, act: function () { go(d); } });
      });
      dia.views.forEach(function (v) {
        c.push({ g: 'Views', t: v.label, s: d.replace('Spring_Boot_', '') + ' / guided view', x: v.label + ' ' + v.note, act: function () { go(d); } });
      });
    });
    Object.keys(CON).forEach(function (slug) {
      c.push({ g: 'Concepts', t: CON[slug].t, s: slug, x: CON[slug].t + ' ' + CON[slug].s, act: function () { open('concept', slug); } });
    });
    STUDY.glossary.forEach(function (g) {
      c.push({ g: 'Glossary', t: g.term, s: 'term', x: g.term + ' ' + g.def, act: function () { open('glossary', g.term); } });
    });
    STUDY.troubleshooting.forEach(function (t) {
      c.push({ g: 'Troubleshooting', t: t.s, s: (t.tags || []).join(', '), x: t.s + ' ' + t.cause + ' ' + t.fix, act: function () { open('trouble', t.s); } });
    });
    STUDY.interview.forEach(function (q) {
      c.push({ g: 'Interview', t: q.q, s: q.level, x: q.q + ' ' + q.a, act: function () { open('interview', q.q); } });
    });
    searchCorpus = c;
    return c;
  }

  function doSearch(q) {
    var corpus = buildCorpus();
    var toks = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!toks.length) return { groups: [], total: 0 };
    var hits = [];
    corpus.forEach(function (it) {
      var xl = it.x.toLowerCase(), tl = it.t.toLowerCase();
      var ok = true, sc = 0;
      for (var i = 0; i < toks.length; i++) {
        var ti = xl.indexOf(toks[i]);
        if (ti < 0) { ok = false; break; }
        sc += ti < tl.length ? 10 : 2;
        if (tl.indexOf(toks[i]) === 0) sc += 6;
      }
      if (ok) hits.push({ it: it, sc: sc });
    });
    hits.sort(function (a, b) { return b.sc - a.sc; });
    var groups = [], byG = {};
    hits.forEach(function (h) {
      if (!byG[h.it.g]) { byG[h.it.g] = { g: h.it.g, items: [] }; groups.push(byG[h.it.g]); }
      if (byG[h.it.g].items.length < 8) byG[h.it.g].items.push(h.it);
    });
    return { groups: groups, total: hits.length };
  }

  function renderSearch(q) {
    setPanel('Search', IDX.stats.diagrams + ' diagrams / ' + IDX.stats.nodes + ' nodes / ' + IDX.stats.edges + ' edges / ' + IDX.stats.views + ' views', true);
    var wrap = el('div', 'sb-searchwrap');
    var input = el('input', 'sb-field');
    input.type = 'text';
    input.placeholder = 'Search nodes, relationships, concepts, terms, symptoms, questions...';
    input.value = q || '';
    input.addEventListener('input', function () { paint(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); var f = bodyEl.querySelector('.sb-hit'); if (f) f.focus(); }
    });
    wrap.appendChild(input);
    panel.insertBefore(wrap, bodyEl);

    function paint(val) {
      clear(bodyEl);
      if (!String(val || '').trim()) {
        var hint = section('Jump to');
        var r = el('div', 'sb-chips');
        ['Foundations', 'How it works', 'Data and persistence', 'Security', 'Running it', 'Hardening'].forEach(function (t) {
          var b = btn(t, 'sb-chip', function () { open('tracks'); });
          r.appendChild(b);
        });
        hint.appendChild(r);
        bodyEl.appendChild(hint);
        var qs = section('Suggested concepts');
        var qc = el('div', 'sb-chips');
        Object.keys(CON).slice(0, 14).forEach(function (slug) {
          var b = btn(CON[slug].t, 'sb-chip', function () { open('concept', slug); });
          qc.appendChild(b);
        });
        qs.appendChild(qc);
        bodyEl.appendChild(qs);
        return;
      }
      var res = doSearch(val);
      if (!res.total) { bodyEl.appendChild(el('div', 'sb-empty', 'No matches for "' + val + '".')); return; }
      var count = el('div', 'sb-count', res.total + ' match' + (res.total === 1 ? '' : 'es'));
      bodyEl.appendChild(count);
      res.groups.forEach(function (grp) {
        var s = section(grp.g);
        grp.items.forEach(function (it) {
          var b = el('button', 'sb-hit');
          b.type = 'button';
          b.appendChild(el('span', 'sb-h-t', '')).innerHTML = hl(it.t, val);
          if (it.s) { var sp = el('span', 'sb-h-s'); sp.innerHTML = hl(it.s, val); b.appendChild(sp); }
          b.appendChild(meta(it.g, (it.s || '').split(' / ')[0]));
          b.addEventListener('click', function () { it.act(); });
          s.appendChild(b);
        });
        bodyEl.appendChild(s);
      });
    }
    paint(q);
    setTimeout(function () { input.focus(); input.select(); }, 10);
  }

  function quizPool() {
    var all = STUDY.quiz;
    var mine = all.filter(function (q) { return q.d === SELF; });
    if (DIA) return mine.length ? mine : all;
    return all;
  }

  function quizStore() {
    var all = read('quiz', {});
    return all;
  }

  function renderQuiz() {
    var pool = quizPool();
    if (!pool.length) { setPanel('Quiz', '', true); bodyEl.appendChild(el('div', 'sb-empty', 'No quiz items for this diagram.')); return; }
    var all = quizStore();
    var rec = all[SELF] || { i: 0, score: 0, done: 0, missed: [] };
    if (rec.i >= pool.length) { rec.i = 0; }

    function commit() { all[SELF] = rec; write('quiz', all); }

    setPanel('Quiz', pool.length + ' items on this diagram', true, false, true);
    var meter = el('div', 'sb-meter');
    var fill = el('div', 'sb-fill');
    var lab = el('b');
    meter.appendChild(el('span', null, 'Score'));
    meter.appendChild(lab);
    meter.appendChild(el('span', 'sb-track'));
    meter.appendChild(fill);
    bodyEl.appendChild(meter);
    var prog = section('');
    bodyEl.appendChild(prog);

    function paint() {
      var pct = pool.length ? Math.round((rec.done / pool.length) * 100) : 0;
      fill.style.width = pct + '%';
      lab.textContent = rec.score + ' / ' + rec.done + ' (' + pct + '%)';
      clear(prog);
      var q = pool[rec.i];
      if (!q) return;
      var qh = el('p', 'sb-q');
      qh.textContent = (rec.i + 1) + '. ' + q.q;
      prog.appendChild(qh);
      var where = el('div', 'sb-count', 'from ' + q.d.replace('Spring_Boot_', '') + (q.n ? ' / ' + q.n : ''));
      prog.appendChild(where);
      var opts = el('div', 'sb-opts');
      var answered = false;
      q.opts.forEach(function (o, i) {
        var b = el('button', 'sb-opt');
        b.type = 'button';
        b.appendChild(el('span', 'sb-ltr', ltrs[i]));
        b.appendChild(el('span', null, o));
        b.addEventListener('click', function () {
          if (answered) return;
          answered = true;
          var ok = i === q.a;
          opts.querySelectorAll('.sb-opt').forEach(function (node, j) {
            if (j === q.a) node.setAttribute('data-ok', '');
            else if (j === i) node.setAttribute('data-bad', '');
          });
          if (ok) rec.score++;
          else if (rec.missed.indexOf(q.q) < 0) rec.missed.push(q.q);
          rec.done++;
          commit();
          var pct = pool.length ? Math.round((rec.done / pool.length) * 100) : 0;
          fill.style.width = pct + '%';
          lab.textContent = rec.score + ' / ' + rec.done + ' (' + pct + '%)';
          var why = el('div', 'sb-why');
          why.innerHTML = '<b>' + (ok ? 'Correct.' : 'Not quite.') + '</b> ' + esc(q.e);
          prog.appendChild(why);
          var jump = el('div', 'sb-row');
          jump.style.marginTop = '10px';
          jump.appendChild(btn('Open ' + q.d.replace('Spring_Boot_', '') + (q.n ? ' / ' + q.n : ''), 'sb-btn', function () { go(q.d, q.n); }));
          /* Cite the walkthrough or the source, so a wrong answer is a route
             into the evidence rather than a dead end. */
          if (q.t && TRACES[q.t.slug]) {
            jump.appendChild(btn('Walk through: ' + TRACES[q.t.slug].steps[q.t.step].title, 'sb-btn', function () {
              open('trace', { slug: q.t.slug, i: q.t.step });
            }));
          }
          if (q.ev && EV) {
            jump.appendChild(btn('See the captured response', 'sb-btn', function () {
              open('evidence', { group: q.ev, key: q.evk || null });
            }));
          }
          if (q.p && FILES[q.p.file]) {
            jump.appendChild(btn('See ' + q.p.file.split('/').pop() + ' lines ' + q.p.from + '-' + q.p.to, 'sb-btn', function () {
              open('source', { path: q.p.file, from: q.p.from, to: q.p.to, note: q.p.note });
            }));
          }
          prog.appendChild(jump);
          paintFoot();
        });
        opts.appendChild(b);
      });
      prog.appendChild(opts);
      paintFoot();
    }

    function paintFoot() {
      clear(footEl);
      footEl.appendChild(btn('Prev', 'sb-btn', function () { rec.i = (rec.i - 1 + pool.length) % pool.length; commit(); paint(); }));
      footEl.appendChild(btn('Next', 'sb-btn is-primary', function () { rec.i = (rec.i + 1) % pool.length; commit(); paint(); }));
      footEl.appendChild(el('span', 'sb-spacer'));
      footEl.appendChild(btn('Reset', 'sb-btn', function () { all[SELF] = { i: 0, score: 0, done: 0, missed: [] }; write('quiz', all); rec = all[SELF]; toast('Quiz reset'); paint(); }));
    }
    paint();
  }

  function renderConcept(slug) {
    var c = CON[slug];
    if (!c) { setPanel('Concept', '', true); bodyEl.appendChild(el('div', 'sb-empty', 'Unknown concept.')); return; }
    setPanel('Concept', slug, true);
    var s = section(c.t);
    var p = el('div', 'sb-why');
    p.style.borderLeftColor = 'var(--sb-accent)';
    p.textContent = c.s;
    s.appendChild(p);
    bodyEl.appendChild(s);

    var byD = section('Where it appears (' + c.refs.length + ' links across ' + new Set(c.refs.map(function (r) { return r[0]; })).size + ' diagrams)');
    var cur = null;
    c.refs.forEach(function (r) {
      if (r[0] !== cur) {
        cur = r[0];
        var dia = IDX.diagrams[r[0]];
        var h = el('h3', null, dia ? dia.title : r[0]);
        h.style.marginTop = '12px';
        byD.appendChild(h);
      }
      var row = el('div', 'sb-hit');
      var t = el('div', 'sb-row');
      t.appendChild(linkTo(r[0], r[1], nodeTitle(r[0], r[1])));
      t.appendChild(el('span', 'sb-spacer'));
      if (r[0] === SELF) { var here = el('span', 'sb-lk', 'you are here'); t.appendChild(here); }
      row.appendChild(t);
      row.appendChild(el('div', 'sb-h-s', r[2]));
      byD.appendChild(row);
    });
    bodyEl.appendChild(byD);

    var rel = section('Related concepts');
    var slugs = Object.keys(CON);
    var mine = new Set(c.refs.map(function (r) { return r[0] + '::' + r[1]; }));
    var near = slugs.filter(function (o) {
      if (o === slug) return false;
      return CON[o].refs.some(function (r) { return mine.has(r[0] + '::' + r[1]); });
    }).slice(0, 10);
    var chips = el('div', 'sb-chips');
    near.forEach(function (o) { chips.appendChild(btn(CON[o].t, 'sb-chip', function () { renderConcept(o); })); });
    if (!near.length) chips.appendChild(el('span', 'sb-count', 'No direct overlap.'));
    rel.appendChild(chips);
    bodyEl.appendChild(rel);
  }

  function filterBox(placeholder, onInput) {
    var w = el('div', 'sb-searchwrap');
    var i = el('input', 'sb-field');
    i.type = 'text';
    i.placeholder = placeholder;
    i.addEventListener('input', function () { onInput(i.value); });
    w.appendChild(i);
    panel.insertBefore(w, bodyEl);
    return i;
  }

  function renderGlossary(arg) {
    setPanel('Glossary', STUDY.glossary.length + ' terms', true);
    var list = section('');
    bodyEl.appendChild(list);
    function paint(q) {
      clear(list);
      var ql = String(q || '').toLowerCase();
      var items = STUDY.glossary.filter(function (g) {
        return !ql || g.term.toLowerCase().indexOf(ql) >= 0 || g.def.toLowerCase().indexOf(ql) >= 0;
      });
      if (!items.length) { list.appendChild(el('div', 'sb-empty', 'No terms match.')); return; }
      var dl = el('div', 'sb-dict');
      items.forEach(function (g) {
        var dt = el('dt');
        dt.innerHTML = hl(g.term, q);
        var dd = el('dd');
        dd.innerHTML = hl(g.def, q);
        if (g.d && g.d.length) {
          var c = el('div', 'sb-chips');
          c.style.marginTop = '5px';
          g.d.forEach(function (k) {
            var b = btn((IDX.diagrams[k] ? IDX.diagrams[k].title : k).replace('Spring Boot ', ''), 'sb-chip', function () { go(k); });
            c.appendChild(b);
          });
          dd.appendChild(c);
        }
        dt.addEventListener('click', function () { if (g.d && g.d.length) go(g.d[0]); });
        dt.style.cursor = 'pointer';
        dl.appendChild(dt); dl.appendChild(dd);
      });
      list.appendChild(dl);
    }
    paint(arg || '');
    var i = filterBox('Filter terms...', paint);
    if (arg) { i.value = arg; }
    setTimeout(function () { i.focus(); }, 10);
  }

  function renderTrouble(arg) {
    setPanel('Troubleshooting', STUDY.troubleshooting.length + ' symptoms', true);
    var list = section('');
    bodyEl.appendChild(list);
    function paint(q) {
      clear(list);
      var ql = String(q || '').toLowerCase();
      var items = STUDY.troubleshooting.filter(function (t) {
        return !ql || t.s.toLowerCase().indexOf(ql) >= 0 || t.cause.toLowerCase().indexOf(ql) >= 0 || t.fix.toLowerCase().indexOf(ql) >= 0;
      });
      if (!items.length) { list.appendChild(el('div', 'sb-empty', 'No symptoms match.')); return; }
      var tb = el('table', 'sb-table');
      tb.innerHTML = '<thead><tr><th>Symptom</th><th>Likely cause</th><th>Fix</th><th>Diagrams</th></tr></thead>';
      var tbody = el('tbody');
      items.forEach(function (t) {
        var tr = el('tr');
        var td1 = el('td'); td1.innerHTML = hl(t.s, q);
        var td2 = el('td'); td2.innerHTML = hl(t.cause, q);
        var td3 = el('td'); td3.innerHTML = hl(t.fix, q);
        var td4 = el('td');
        var dl = el('div', 'sb-dl');
        (t.d || []).forEach(function (k) { dl.appendChild(btn((IDX.diagrams[k] ? IDX.diagrams[k].title : k).replace('Spring Boot ', ''), 'sb-chip', function () { go(k); })); });
        td4.appendChild(dl);
        tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4);
        tbody.appendChild(tr);
      });
      tb.appendChild(tbody);
      list.appendChild(tb);
    }
    paint(arg || '');
    var i = filterBox('Filter by symptom, cause or fix...', paint);
    if (arg) i.value = arg;
    setTimeout(function () { i.focus(); }, 10);
  }

  function renderInterview(arg) {
    var levels = ['all', 'junior', 'mid', 'senior'];
    var lvl = 'all';
    setPanel('Interview bank', STUDY.interview.length + ' questions', true);
    var tabs = el('div', 'sb-tabs');
    panel.insertBefore(tabs, bodyEl);
    var list = section('');
    bodyEl.appendChild(list);
    function paint(q) {
      clear(tabs);
      levels.forEach(function (L) {
        var b = btn(L === 'all' ? 'All levels' : L, 'sb-tab' + (L === lvl ? '' : ''), function () { lvl = L; paint(q); });
        if (L === lvl) b.setAttribute('data-sb-on', '');
        tabs.appendChild(b);
      });
      clear(list);
      var ql = String(q || '').toLowerCase();
      var items = STUDY.interview.filter(function (it) {
        return (lvl === 'all' || it.level === lvl) && (!ql || it.q.toLowerCase().indexOf(ql) >= 0 || it.a.toLowerCase().indexOf(ql) >= 0);
      });
      list.appendChild(el('div', 'sb-count', items.length + ' questions'));
      if (!items.length) { list.appendChild(el('div', 'sb-empty', 'No questions match.')); return; }
      items.forEach(function (it) {
        var w = el('div', 'sb-note-item');
        var h = el('div', 'sb-row');
        h.appendChild(el('span', 'sb-nt', it.q));
        h.appendChild(el('span', 'sb-spacer'));
        h.appendChild(el('span', 'sb-lk', it.level));
        w.appendChild(h);
        var a = el('div', 'sb-nb', it.a);
        a.style.display = 'none';
        w.appendChild(a);
        var r = el('div', 'sb-row');
        r.style.marginTop = '6px';
        var tg = btn('Show answer', 'sb-btn', function () {
          var on = a.style.display === 'none';
          a.style.display = on ? 'block' : 'none';
          tg.textContent = on ? 'Hide answer' : 'Show answer';
        });
        r.appendChild(tg);
        (it.d || []).forEach(function (k) { r.appendChild(btn((IDX.diagrams[k] ? IDX.diagrams[k].title : k).replace('Spring Boot ', ''), 'sb-chip', function () { go(k); })); });
        w.appendChild(r);
        list.appendChild(w);
      });
    }
    paint(arg || '');
    var i = filterBox('Filter questions...', paint);
    if (arg) i.value = arg;
    setTimeout(function () { i.focus(); }, 10);
  }

  function renderTracks() {
    setPanel('Learning tracks', IDX.stats.tracks + ' tracks / ' + IDX.stats.diagrams + ' diagrams', true);
    var prog = read('progress', {});
    IDX.tracks.forEach(function (t) {
      var s = section(t.name);
      s.appendChild(el('div', 'sb-h-s', t.blurb));
      var list = el('div');
      list.style.marginTop = '8px';
      t.diagrams.forEach(function (k) {
        var d = IDX.diagrams[k];
        var b = el('button', 'sb-hit');
        b.type = 'button';
        b.appendChild(el('span', 'sb-h-t', d.title));
        b.appendChild(el('div', 'sb-h-m', d.nodes.length + ' nodes / ' + d.edges.length + ' edges / ' + d.views.length + ' views' + (prog[k] ? ' / visited' : '')));
        b.addEventListener('click', function () { go(k); });
        list.appendChild(b);
      });
      s.appendChild(list);
      bodyEl.appendChild(s);
    });
  }

  function renderHubInfo() {
    setPanel('This diagram', DIA ? DIA.title : SELF, true);
    if (!DIA) { bodyEl.appendChild(el('div', 'sb-empty', 'This page is not a known diagram.')); return; }
    var s = section('Overview');
    s.appendChild(el('div', 'sb-h-s', DIA.track + ' / ' + DIA.type + ' / ' + DIA.nodes.length + ' nodes / ' + DIA.edges.length + ' edges / ' + DIA.views.length + ' guided views'));
    bodyEl.appendChild(s);
    var ns = section('Concepts in this diagram');
    var allSlugs = Object.keys(CON).filter(function (sl) { return CON[sl].refs.some(function (r) { return r[0] === SELF; }); });
    ns.appendChild(el('div', 'sb-h-s', allSlugs.length + ' shared concepts link this diagram to the others.'));
    var chips = el('div', 'sb-chips');
    allSlugs.forEach(function (sl) { chips.appendChild(btn(CON[sl].t, 'sb-chip', function () { renderConcept(sl); })); });
    ns.appendChild(chips);
    bodyEl.appendChild(ns);
    var vs = section('Guided views');
    DIA.views.forEach(function (v) {
      var b = el('button', 'sb-hit');
      b.type = 'button';
      b.appendChild(el('span', 'sb-h-t', v.label));
      b.appendChild(el('div', 'sb-h-s', v.note));
      b.appendChild(meta('focus', v.focus.join(', ')));
      b.addEventListener('click', function () { close(); presentGo(v.id); });
      vs.appendChild(b);
    });
    bodyEl.appendChild(vs);

    var code = DIA.code || [];
    var cs = section('Runnable code in the Book Store project (' + code.length + ' links)');
    if (!code.length) cs.appendChild(el('div', 'sb-h-s', 'This diagram has no project counterpart.'));
    var seen = {};
    code.forEach(function (c) {
      if (seen[c.path]) return;
      seen[c.path] = 1;
      var key = c.path.replace(/^bookstore\//, '');
      var mirrored = !!FILES[key];
      var row = el('div', 'sb-hit');
      row.style.cursor = 'default';
      var a = el('button', 'sb-link');
      a.type = 'button';
      a.appendChild(el('span', null, key));
      if (mirrored) a.appendChild(el('span', 'sb-lk', 'in page'));
      a.addEventListener('click', function () {
        open('source', { path: key, raw: c.path });
      });
      row.appendChild(a);
      var hosts = code.filter(function (x) { return x.path === c.path; })
        .map(function (x) { return nodeTitle(SELF, x.node); });
      var marks = anchorsIn(key);
      var m = el('div', 'sb-h-m', 'shows ' + hosts.join(', '));
      if (mirrored && marks.length) {
        m.textContent += ' · ' + marks.length + ' marked region' + (marks.length === 1 ? '' : 's');
      }
      row.appendChild(m);
      cs.appendChild(row);
    });
    var slug = traceForDia(SELF);
    if (slug) {
      var tw = el('div', 'sb-row');
      tw.style.marginTop = '8px';
      tw.appendChild(btn('Walk through ' + TRACES[slug].title, 'sb-btn is-primary', function () {
        open('trace', { slug: slug, i: 0 });
      }));
      tw.appendChild(btn('See the captured responses', 'sb-btn', function () {
        open('evidence', { group: slug === 'nplus1' ? 'nplus1' : 'transactions' });
      }));
      cs.appendChild(tw);
    }
    if (code.length) {
      var all = el('div', 'sb-row');
      all.style.marginTop = '8px';
      all.appendChild(btn('Open the Book Store project', 'sb-btn', function () { open('source', { path: 'README.md' }); }));
      cs.appendChild(all);
    }
    bodyEl.appendChild(cs);
  }

  var presentState = { on: false, i: 0, auto: null, ob: null };

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function presentSteps() {
    if (!DIA) return [];
    var steps = [{ id: 'overview', label: 'Overview', note: 'The whole diagram, nothing dimmed. Hover any node for its full passport, or step through the guided views below.', focus: null }];
    DIA.views.forEach(function (v) { steps.push({ id: v.id, label: v.label, note: v.note, focus: v.focus }); });
    return steps;
  }

  function nodeEl(id) {
    var q = window.CSS && CSS.escape ? CSS.escape(id) : id;
    return document.querySelector('svg [data-node-id="' + q + '"]');
  }

  /* The diagrams ship their own Presentation Stage: a viewport-filling layout
   * that gives the SVG the whole screen. Present mode borrows it and only
   * reserves the right edge for its rail, so the artwork is never
   * re-implemented here. Guarded, because not every page has it. */
  function stage(on) {
    try {
      if (window.Archify && Archify.presentation) {
        if (on) Archify.presentation.enter(); else Archify.presentation.exit();
      }
    } catch (e) { /* the stage is a bonus, never a requirement */ }
  }

  /* A soft light follows the step instead of a flat dim over everything: the
   * focus group stays bright and the rest of the diagram falls away. */
  function paintSpot(focus) {
    if (!overlay) return;
    var box = null;
    (focus || []).forEach(function (id) {
      var n = nodeEl(id);
      if (!n) return;
      var b = n.getBoundingClientRect();
      if (!b.width && !b.height) return;
      box = box ? {
        l: Math.min(box.l, b.left), t: Math.min(box.t, b.top),
        r: Math.max(box.r, b.right), b: Math.max(box.b, b.bottom)
      } : { l: b.left, t: b.top, r: b.right, b: b.bottom };
    });
    if (!box) {
      var host = document.querySelector('.diagram-container');
      var hb = host ? host.getBoundingClientRect() : null;
      if (hb && hb.width && hb.height) box = { l: hb.left, t: hb.top, r: hb.right, b: hb.bottom };
      else box = { l: 0, t: 0, r: window.innerWidth, b: window.innerHeight };
    }
    var cx = (box.l + box.r) / 2, cy = (box.t + box.b) / 2;
    var corner = Math.max(
      Math.hypot(cx, cy), Math.hypot(window.innerWidth - cx, cy),
      Math.hypot(cx, window.innerHeight - cy),
      Math.hypot(window.innerWidth - cx, window.innerHeight - cy)
    );
    var w = box.r - box.l, h = box.b - box.t;
    /* a step gets a tight light around its nodes; the overview gets a light
     * wide enough to reach the corners, so the edges of the artwork fall away */
    var r = focus && focus.length
      ? Math.min(Math.max(Math.hypot(w, h) / 2 * 1.9 + 70, 340), corner)
      : corner;
    overlay.style.setProperty('--sb-spot-x', Math.round(cx) + 'px');
    overlay.style.setProperty('--sb-spot-y', Math.round(cy) + 'px');
    overlay.style.setProperty('--sb-spot-r', Math.round(r) + 'px');
  }

  function applyDim(focus) {
    var svg = document.querySelector('svg');
    if (!svg) { paintSpot(focus); return; }
    var nodes = svg.querySelectorAll('[data-node-id]');
    var keep = {};
    (focus || []).forEach(function (f) { keep[f] = 1; });
    Array.prototype.forEach.call(nodes, function (n) {
      var id = n.getAttribute('data-node-id');
      var lit = !focus || keep[id];
      if (lit) { n.style.removeProperty('opacity'); n.style.removeProperty('filter'); }
      else { n.style.opacity = '0.16'; n.style.filter = 'saturate(0.2)'; }
      if (focus && keep[id]) n.setAttribute('data-sb-focus', '');
      else n.removeAttribute('data-sb-focus');
    });
    var edges = svg.querySelectorAll('[data-edge-from][data-edge-to]');
    Array.prototype.forEach.call(edges, function (e) {
      var f = e.getAttribute('data-edge-from'), t = e.getAttribute('data-edge-to');
      if (!focus) { e.style.removeProperty('opacity'); return; }
      if (keep[f] || keep[t]) e.style.removeProperty('opacity');
      else e.style.opacity = '0.08';
    });
    paintSpot(focus);
  }

  function autoStop() {
    if (presentState.auto) { clearInterval(presentState.auto); presentState.auto = null; }
  }

  function autoStart() {
    autoStop();
    presentState.auto = setInterval(function () {
      if (!presentState.on || view !== 'present') { autoStop(); return; }
      var n = presentSteps().length;
      if (n) stepTo(presentState.i + 1, false);
    }, 9000);
  }

  function autoToggle() {
    if (presentState.auto) autoStop(); else autoStart();
    render();
  }

  function stepTo(i, manual) {
    var steps = presentSteps();
    if (!steps.length) return;
    if (manual) autoStop();
    var n = steps.length;
    presentState.i = ((i % n) + n) % n;
    render();
  }

  function startPresent(i) {
    var steps = presentSteps();
    if (!steps.length) { toast('No guided views on this page'); return; }
    presentState.on = true;
    presentState.i = i || 0;
    document.body.classList.add('sb-present');
    stage(true);
    /* The diagram's own stage can be left with F while this panel is open.
     * Following it keeps the reserved space and the panel in step. */
    if (window.MutationObserver && !presentState.ob) {
      presentState.ob = new MutationObserver(function () {
        if (!presentState.on) return;
        if (document.documentElement.getAttribute('data-present') !== 'true') close();
      });
      presentState.ob.observe(document.documentElement, { attributes: true, attributeFilter: ['data-present'] });
    }
    open('present');
  }

  function stopPresent() {
    if (!presentState.on) return;
    presentState.on = false;
    autoStop();
    if (presentState.ob) { presentState.ob.disconnect(); presentState.ob = null; }
    document.body.classList.remove('sb-present');
    applyDim(null);
    stage(false);
  }

  function presentGo(id) {
    var steps = presentSteps();
    var i = steps.map(function (s) { return s.id; }).indexOf(id);
    startPresent(i < 0 ? 0 : i);
  }

  /* One card per node in the step: the passport, the bullets, the concepts it
   * belongs to and the source that implements it. Hovering the card lights the
   * node on the diagram. */
  function passportCard(id) {
    var node = null, nodes = (DIA && DIA.nodes) || [];
    for (var i = 0; i < nodes.length; i++) if (nodes[i].id === id) { node = nodes[i]; break; }
    if (!node) return null;
    var c = el('div', 'sb-pass');
    c.setAttribute('data-sb-node', id);
    if (node.kind) c.setAttribute('data-kind', node.kind);
    var top = el('div', 'sb-pass-top');
    top.appendChild(el('span', 'sb-kind', node.t || node.kind || 'node'));
    top.appendChild(el('b', null, node.label));
    if (node.tag) top.appendChild(el('span', 'sb-tag', node.tag));
    c.appendChild(top);
    if (node.sublabel) c.appendChild(el('div', 'sb-mono', node.sublabel));
    if (node.s) c.appendChild(el('p', 'sb-sum', node.s));
    if (node.b && node.b.length) {
      var ul = el('ul', 'sb-bul');
      node.b.forEach(function (t) { ul.appendChild(el('li', null, t)); });
      c.appendChild(ul);
    }
    var chips = el('div', 'sb-chips sb-pass-chips');
    conceptsFor(SELF, id).slice(0, 3).forEach(function (sl) {
      chips.appendChild(btn(CON[sl].t, 'sb-chip', function () { open('concept', sl); }));
    });
    ((DIA && DIA.code) || []).filter(function (x) { return x.node === id; }).slice(0, 2).forEach(function (cc) {
      var key = cc.path.replace(/^bookstore\//, '');
      chips.appendChild(btn(cc.path.split('/').pop(), 'sb-chip', function () {
        open('source', { path: key, raw: cc.path });
      }));
    });
    if (chips.childNodes.length) c.appendChild(chips);
    c.addEventListener('mouseenter', function () { var n = nodeEl(id); if (n) n.setAttribute('data-sb-hot', ''); });
    c.addEventListener('mouseleave', function () { var n = nodeEl(id); if (n) n.removeAttribute('data-sb-hot'); });
    return c;
  }

  function relationsIn(focus) {
    if (!DIA) return [];
    var keep = {};
    focus.forEach(function (k) { keep[k] = 1; });
    var edges = DIA.edges || [];
    var intra = edges.filter(function (e) { return keep[e.from] && keep[e.to]; });
    var list = intra.length ? intra : edges.filter(function (e) { return keep[e.from] || keep[e.to]; });
    return list.slice(0, 8);
  }

  function presentConcepts(focus) {
    var slugs = Object.keys(CON).filter(function (sl) {
      return CON[sl].refs.some(function (r) { return r[0] === SELF && (!focus || focus.indexOf(r[1]) >= 0); });
    });
    if (!slugs.length) return null;
    var s = section(focus ? 'Concepts in this step' : 'Concepts in this diagram');
    var chips = el('div', 'sb-chips');
    slugs.slice(0, 14).forEach(function (sl) {
      chips.appendChild(btn(CON[sl].t, 'sb-chip', function () { open('concept', sl); }));
    });
    if (slugs.length > 14) chips.appendChild(el('span', 'sb-chip', '+' + (slugs.length - 14) + ' more'));
    s.appendChild(chips);
    return s;
  }

  function renderPresent() {
    var steps = presentSteps();
    if (!steps.length) { setPanel('Present', '', true); bodyEl.appendChild(el('div', 'sb-empty', 'No guided views available.')); return; }
    if (presentState.i >= steps.length) presentState.i = 0;
    if (presentState.i < 0) presentState.i = steps.length - 1;
    var at = presentState.i + 1, total = steps.length;
    var st = steps[presentState.i];

    setPanel('Present', pad2(at) + ' / ' + pad2(total), true, false, true);

    /* the step rail lives in the header, so it stays put while the body scrolls */
    var rail = el('div', 'sb-chips sb-rail');
    steps.forEach(function (x, i) {
      var b = btn(pad2(i + 1) + ' ' + x.label, 'sb-chip', function () { stepTo(i, true); });
      if (i === presentState.i) b.setAttribute('data-sb-on', '');
      rail.appendChild(b);
    });
    headEl.appendChild(rail);
    var prog = el('div', 'sb-prog');
    var fill = el('i');
    fill.style.width = (at / total * 100) + '%';
    prog.appendChild(fill);
    headEl.appendChild(prog);

    /* 1. the step itself - always the first section of the body */
    var s = section(st.label);
    s.className = 'sb-sect sb-stage-head';
    s.setAttribute('data-step', pad2(at));
    s.appendChild(el('div', 'sb-lead', st.note || ''));
    if (st.focus && st.focus.length) {
      var m = el('div', 'sb-meta');
      m.appendChild(el('span', null, st.focus.length + ' of ' + ((DIA && DIA.nodes.length) || 0) + ' nodes in focus'));
      m.appendChild(el('span', null, 'hover a card to light its node'));
      s.appendChild(m);
    }
    bodyEl.appendChild(s);

    if (st.focus && st.focus.length) {
      var fs = section('In focus');
      var grid = el('div', 'sb-passports');
      st.focus.forEach(function (id) { var c = passportCard(id); if (c) grid.appendChild(c); });
      if (grid.childNodes.length) { fs.appendChild(grid); bodyEl.appendChild(fs); }

      var rel = relationsIn(st.focus);
      if (rel.length) {
        var rs = section('How they connect');
        var rl = el('div', 'sb-rels');
        rel.forEach(function (e) {
          var row = el('div', 'sb-rel');
          var line = el('div', 'sb-rel-line');
          line.appendChild(el('span', 'sb-rel-a', nodeTitle(SELF, e.from)));
          line.appendChild(el('span', 'sb-rel-e', e.label || 'relates'));
          line.appendChild(el('span', 'sb-rel-b', nodeTitle(SELF, e.to)));
          row.appendChild(line);
          if (e.s) row.appendChild(el('p', 'sb-rel-s', e.s));
          rl.appendChild(row);
        });
        rs.appendChild(rl);
        bodyEl.appendChild(rs);
      }
      var stepConcepts = presentConcepts(st.focus);
      if (stepConcepts) { bodyEl.appendChild(stepConcepts); }
    } else {
      /* overview: what this diagram is, then what is coming */
      var os = section('This diagram');
      var g = el('div', 'sb-ev-grid');
      g.appendChild(evCell('nodes', DIA.nodes.length));
      g.appendChild(evCell('relationships', DIA.edges.length));
      g.appendChild(evCell('guided views', Math.max(total - 1, 0)));
      g.appendChild(evCell('code links', (DIA.code || []).length));
      os.appendChild(g);
      os.appendChild(el('div', 'sb-h-s', DIA.title + ' / ' + DIA.track + ' / ' + DIA.type));
      bodyEl.appendChild(os);

      var as = section('What is ahead');
      var list = el('div');
      steps.forEach(function (x, i) {
        if (i === 0) return;
        var b = el('button', 'sb-hit');
        b.type = 'button';
        b.appendChild(el('span', 'sb-h-t', pad2(i + 1) + '  ' + x.label));
        b.appendChild(el('div', 'sb-h-s', x.note));
        b.appendChild(el('div', 'sb-h-m', x.focus.length + ' nodes in focus'));
        b.addEventListener('click', function () { stepTo(i, true); });
        list.appendChild(b);
      });
      as.appendChild(list);
      bodyEl.appendChild(as);

      var allConcepts = presentConcepts(null);
      if (allConcepts) { bodyEl.appendChild(allConcepts); }
    }

    applyDim(st.focus);
    if (window.requestAnimationFrame) {
      requestAnimationFrame(function () { if (presentState.on && view === 'present') paintSpot(st.focus); });
    }

    clear(footEl);
    footEl.appendChild(btn('Prev', 'sb-btn', function () { stepTo(presentState.i - 1, true); }));
    footEl.appendChild(btn('Next', 'sb-btn is-primary', function () { stepTo(presentState.i + 1, true); }));
    footEl.appendChild(btn(presentState.auto ? 'Pause' : 'Auto', 'sb-btn', autoToggle));
    footEl.appendChild(el('span', 'sb-spacer'));
    var hint = el('span', 'sb-hint');
    hint.appendChild(el('b', 'sb-kbd', '\u2190'));
    hint.appendChild(el('b', 'sb-kbd', '\u2192'));
    hint.appendChild(el('span', null, 'step'));
    footEl.appendChild(hint);
    footEl.appendChild(btn('Exit present', 'sb-btn', close));
  }

  function renderHelp() {
    setPanel('Keyboard & features', '', false, true, true);
    var s = section('Shortcuts');
    var tb = el('table', 'sb-table');
    tb.innerHTML = '<tbody>' +
      '<tr><td>Ctrl / Cmd + K</td><td>Search everything</td></tr>' +
      '<tr><td>q</td><td>Quiz on this diagram</td></tr>' +
      '<tr><td>p</td><td>Presentation stage: the guided view with narration and a card per node</td></tr>' +
      '<tr><td>g</td><td>Glossary</td></tr>' +
      '<tr><td>t</td><td>Troubleshooting</td></tr>' +
      '<tr><td>i</td><td>Interview bank</td></tr>' +
      '<tr><td>c</td><td>Code lab: concepts, mirrored source and walkthroughs</td></tr>' +
      '<tr><td>u</td><td>Take the tour: a one-minute walk through this page</td></tr>' +
      '<tr><td>&larr; &rarr; Space</td><td>Step back / forward through Present mode; Home and End jump to the ends</td></tr>' +
      '<tr><td>Esc</td><td>Close</td></tr>' +
      '</tbody>';
    s.appendChild(tb);
    bodyEl.appendChild(s);
    /* The reader who presses ? is asking how to use this. That is exactly who the
     * standalone guide is for, so it is offered here rather than only from
     * the hub. */
    var sg = section('New here?');
    sg.appendChild(el('div', 'sb-h-s', 'The full usage guide: where to start, how every feature works, best practices and a 30-day study plan.'));
    var sgr = el('div', 'sb-row');
    sgr.style.marginTop = '8px';
    sgr.appendChild(btn('Open the guide', 'sb-btn is-primary', function () { location.href = 'guide.html'; }));
    sgr.appendChild(btn('Hub', 'sb-btn', function () { location.href = 'index.html'; }));
    sg.appendChild(sgr);
    bodyEl.appendChild(sg);
    var sc = section('Code lab');
    sc.appendChild(el('div', 'sb-h-s', 'The Book Store project is mirrored into this page, so you can read real source without leaving the diagram. Every code reference - a chip in a node card, a row in the code lab, a walkthrough step, a quiz citation - opens the same in-page viewer: a header with the file\u2019s role and shape, a structure outline you can jump through, the whole file with syntax highlighting, and the lines that matter carrying their explanation beside them. Diagrams that have a walkthrough get a Walk through button in the toolbar: step through the source with the matching database query count or transaction report beside each step. If a generated asset is missing the viewer says which script to rebuild it, rather than sending you to a raw text dump.'));
    bodyEl.appendChild(sc);
    var s2 = section('In the diagram');
    s2.appendChild(el('div', 'sb-h-s', 'Hover or tab-focus any node or relationship for the semantic passport. Concept chips inside the card jump to the same idea in other diagrams. Press P for the presentation stage: the diagram takes the whole screen, the step you are on stays lit while the rest falls away, and the rail on the right carries the narration, a passport card for every node in the step, how those nodes connect and the concepts they belong to. The step rail in the panel header jumps anywhere, Auto plays the walk on its own, and the arrows or Space step forward.'));
    bodyEl.appendChild(s2);
    clear(footEl);
    footEl.appendChild(btn('Done', 'sb-btn is-primary', close));
  }

  /* ---------------------------------------------------------------- code lab
   * Mirrors real bookstore/ source and captured API responses so they can be
   * read on file://, where fetch and XHR are blocked. Every path that used to
   * hand the reader a raw text file now resolves into renderSource, including
   * the case where the mirror is missing: that reports which script to rebuild.
   */

  var JAVA_KW = /^(package|import|public|private|protected|class|interface|record|enum|final|abstract|static|void|new|return|if|else|for|while|try|catch|finally|throw|throws|this|super|extends|implements|instanceof|var|int|long|double|boolean|char|byte|short|float|true|false|null|switch|case|break|continue|default|synchronized|transient|volatile)$/;

  function javaLine(line) {
    var out = '';
    var rest = line;
    while (rest.length) {
      var m = rest.match(/^\/\/.*/) || rest.match(/^\/\*.*?\*\//);
      if (m) { out += '<i class="sb-cm">' + esc(m[0]) + '</i>'; rest = rest.slice(m[0].length); continue; }
      m = rest.match(/^("(?:[^"\\]|\\.)*")/);
      if (m) { out += '<i class="sb-st">' + esc(m[0]) + '</i>'; rest = rest.slice(m[0].length); continue; }
      m = rest.match(/^\/\*/);
      if (m) { out += '<i class="sb-cm">' + esc(rest) + '</i>'; rest = ''; continue; }
      m = rest.match(/^'[^']*'/) || rest.match(/^@[A-Za-z][\w.]*/) || rest.match(/^\d[\w.]*/) ||
          rest.match(/^[\u2190-\u21FF\u2192\u2014\u2026]*[A-Za-z_][\w]*/);
      if (m) {
        var w = m[0];
        var cls = /^'/.test(w) ? 'sb-st'
          : /^@/.test(w) ? 'sb-an'
          : /^\d/.test(w) ? 'sb-nu'
          : JAVA_KW.test(w) ? 'sb-kw'
          : /^[A-Z]/.test(w) ? 'sb-ty'
          : 'sb-id';
        out += '<i class="' + cls + '">' + esc(w) + '</i>';
        rest = rest.slice(w.length);
        continue;
      }
      out += esc(rest[0]);
      rest = rest.slice(1);
    }
    return out;
  }

  function anchorsIn(path) {
    return ANCHORS.filter(function (a) { return a.file === path; });
  }

  /* Lines to show: the requested span plus a little context, never the whole
   * file, so the panel stays readable. */
  function spanFor(path, from, to) {
    var f = FILES[path];
    if (!f) return null;
    if (!from) return { from: 1, to: Math.min(f.lines, 40) };
    var pad = Math.min(6, Math.floor((to - from + 1) / 2));
    var a = Math.max(1, from - pad);
    var b = Math.min(f.lines, to + pad);
    return { from: a, to: b };
  }

  function renderSnippet(path, from, to) {
    var f = FILES[path];
    var sp = spanFor(path, from, to);
    if (!f || !sp) return el('div', 'sb-h-s', 'source not mirrored');
    var rows = f.text.split(/\r?\n/);
    var marks = anchorsIn(path);
    var code = el('div', 'sb-code');
    code.innerHTML = rows.slice(sp.from - 1, sp.to).map(function (line, i) {
      var n = sp.from + i;
      var hit = marks.filter(function (a) { return n >= a.from && n <= a.to; });
      var cls = hit.length ? ' class="sb-cl sb-cl-marked"' : ' class="sb-cl"';
      return '<div' + cls + ' data-line="' + n + '"><span class="sb-cn">' + n +
        '</span><span class="sb-cd">' + (javaLine(line) || ' ') + '</span></div>';
    }).join('');
    return code;
  }

  /* Every diagram node whose code link points at this file, so the source can
   * point back at the ideas it implements. */
  function backLinksFor(path) {
    var out = [];
    Object.keys(IDX.diagrams).forEach(function (d) {
      var dia = IDX.diagrams[d];
      (dia.code || []).forEach(function (c) {
        if (c.path.replace(/^bookstore\//, '') !== path) return;
        var node = c.node;
        if (out.some(function (x) { return x.d === d && x.node === node; })) return;
        out.push({ d: d, node: node });
      });
    });
    return out;
  }

  function traceStepsFor(path) {
    var out = [];
    Object.keys(TRACES).forEach(function (slug) {
      TRACES[slug].steps.forEach(function (s, i) {
        if (s.file === path) out.push({ slug: slug, i: i, step: s });
      });
    });
    return out;
  }

  function showNote(target, note) {
    var n = el('div', 'sb-note');
    n.appendChild(el('span', 'sb-note-k', 'what to notice'));
    n.appendChild(el('span', null, note));
    target.appendChild(n);
  }

  /* -------------------------------------------------------------- code view */
  /* The reader must never be dumped into a browser's plain-text file view, so
   * every reference resolves here: header, structure, whole file, explanations. */

  var SQL_KW = /^(select|from|where|insert|into|values|create|table|if|not|exists|primary|key|foreign|references|unique|index|on|alter|add|column|drop|delete|update|set|and|or|null|default|constraint|cascade|integer|bigint|varchar|text|boolean|decimal|timestamp|serial|order|by|group|limit|offset|distinct|join|left|right|inner|as)$/i;

  function scalarHtml(s) {
    if (!s) return '';
    var lead = /^\s*/.exec(s)[0];
    var body = s.slice(lead.length).replace(/\s+$/, '');
    if (!body) return esc(s);
    var trail = s.slice(lead.length + body.length);
    var cls = /^-?\d+(\.\d+)?$/.test(body) ? 'sb-nu'
      : /^(true|false|null)$/.test(body) ? 'sb-kw'
      : /^['"].*['"]$/.test(body) ? 'sb-st'
      : 'sb-id';
    return esc(lead) + '<i class="' + cls + '">' + esc(body) + '</i>' + esc(trail);
  }

  function yamlLine(line) {
    if (/^\s*#/.test(line)) return '<i class="sb-cm">' + esc(line) + '</i>';
    var m = /^(\s*(?:-\s+)?)([A-Za-z0-9_.\-]+)(:)(.*)$/.exec(line);
    if (!m) return scalarHtml(line);
    var tail = m[4];
    var c = tail.indexOf(' #');
    var value = c >= 0 ? tail.slice(0, c) : tail;
    var comment = c >= 0 ? tail.slice(c) : '';
    return esc(m[1]) + '<i class="sb-ty">' + esc(m[2]) + '</i><i class="sb-id">' + esc(m[3]) + '</i>' +
      scalarHtml(value) + (comment ? '<i class="sb-cm">' + esc(comment) + '</i>' : '');
  }

  function sqlLine(line) {
    var out = '', rest = line;
    while (rest.length) {
      var m = rest.match(/^--.*/) || rest.match(/^\/\*.*?\*\//);
      if (m) { out += '<i class="sb-cm">' + esc(m[0]) + '</i>'; rest = rest.slice(m[0].length); continue; }
      m = rest.match(/^'[^']*'/);
      if (m) { out += '<i class="sb-st">' + esc(m[0]) + '</i>'; rest = rest.slice(m[0].length); continue; }
      m = rest.match(/^\d+/);
      if (m) { out += '<i class="sb-nu">' + esc(m[0]) + '</i>'; rest = rest.slice(m[0].length); continue; }
      m = rest.match(/^[A-Za-z_][\w$]*/);
      if (m) {
        var w = m[0];
        out += '<i class="' + (SQL_KW.test(w) ? 'sb-kw' : /^[A-Z]/.test(w) ? 'sb-ty' : 'sb-id') + '">' + esc(w) + '</i>';
        rest = rest.slice(w.length);
        continue;
      }
      out += esc(rest[0]);
      rest = rest.slice(1);
    }
    return out;
  }

  function mdLine(line) {
    var h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) return '<i class="sb-an">' + esc(h[1]) + '</i> <i class="sb-ty">' + esc(h[2]) + '</i>';
    if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) return '<i class="sb-cm">' + esc(line) + '</i>';
    var out = '', rest = line;
    while (rest.length) {
      var m = rest.match(/^`[^`]*`/);
      if (m) { out += '<i class="sb-st">' + esc(m[0]) + '</i>'; rest = rest.slice(m[0].length); continue; }
      m = rest.match(/^\*\*[^*]+\*\*/);
      if (m) { out += '<i class="sb-ty">' + esc(m[0]) + '</i>'; rest = rest.slice(m[0].length); continue; }
      out += esc(rest[0]);
      rest = rest.slice(1);
    }
    return out;
  }

  function codeLine(line, lang) {
    if (lang === 'yaml') return yamlLine(line);
    if (lang === 'sql') return sqlLine(line);
    if (lang === 'md') return mdLine(line);
    if (lang === 'java') return javaLine(line);
    return esc(line);
  }

  function noteHtml(a) {
    return '<div class="sb-cnote"><span class="sb-cnote-k">what to notice</span>' +
      '<span class="sb-cnote-b">' + esc(a.note) + '</span></div>';
  }

  function renderFileHeader(f, path) {
    var card = el('div', 'sb-fcard');
    var top = el('div', 'sb-fcard-top');
    var role = el('span', 'sb-role');
    role.textContent = f.role;
    role.className = 'sb-role sb-role-' + f.role.toLowerCase();
    top.appendChild(role);
    top.appendChild(el('span', 'sb-fname', path.split('/').pop()));
    top.appendChild(el('span', 'sb-spacer'));
    top.appendChild(el('span', 'sb-fmeta', f.lines + ' lines · ' +
      (f.lang === 'java' ? 'Java' : f.lang === 'yaml' ? 'YAML' : f.lang === 'sql' ? 'SQL' : f.lang === 'md' ? 'Markdown' : f.lang.toUpperCase())));
    card.appendChild(top);
    card.appendChild(el('div', 'sb-fpath', path));
    card.appendChild(el('div', 'sb-fsum', f.summary));
    var n = anchorsIn(path).length;
    if (n) card.appendChild(el('div', 'sb-fanchor', n + ' explained line' + (n === 1 ? '' : 's') + ' in this file'));
    return card;
  }

  /* The shape of the file before the code, so a reader can see what is here and
   * jump straight to it instead of scanning hundreds of lines. */
  function renderOutline(f) {
    if (!f.outline || !f.outline.length) return null;
    var wrap = el('div', 'sb-owrap');
    wrap.appendChild(el('div', 'sb-sect-t', 'Structure (' + f.outline.length + ')'));
    var row = el('div', 'sb-outline');
    f.outline.forEach(function (o) {
      var c = el('button', 'sb-ochip sb-ok-' + o.kind);
      c.type = 'button';
      c.title = 'jump to line ' + o.line;
      c.appendChild(el('span', 'sb-oln', String(o.line)));
      if (o.ann && o.ann.length) c.appendChild(el('span', 'sb-oan', o.ann.join(' ')));
      c.appendChild(el('span', 'sb-onm', o.name));
      c.addEventListener('click', function () { jumpLine(o.line); });
      row.appendChild(c);
    });
    wrap.appendChild(row);
    return wrap;
  }

  function jumpLine(n) {
    var row = document.getElementById('sb-l' + n);
    if (row) jumpToLine(row);
  }

  /* The whole file. Marked lines carry their explanation where they sit, so the
   * reason a line matters is read next to the line itself. */
  function renderFile(path, focusFrom, focusTo) {
    var f = FILES[path];
    if (!f) return el('div', 'sb-h-s', 'source not mirrored');
    var rows = f.text.split(/\r?\n/);
    var marks = anchorsIn(path);
    var html = '';
    rows.forEach(function (line, i) {
      var n = i + 1;
      var hit = marks.filter(function (a) { return n >= a.from && n <= a.to; });
      var focus = focusFrom && n >= focusFrom && n <= focusTo;
      var cls = 'sb-cl' + (hit.length ? ' sb-cl-marked' : '') + (focus ? ' sb-cl-focus' : '');
      html += '<div class="' + cls + '" data-line="' + n + '" id="sb-l' + n + '">' +
        '<span class="sb-cn">' + n + '</span>' +
        '<span class="sb-cd">' + (codeLine(line, f.lang) || '&nbsp;') + '</span>' +
        '</div>';
      marks.forEach(function (a) { if (n === a.to) html += noteHtml(a); });
    });
    var wrap = el('div', 'sb-code sb-file');
    wrap.innerHTML = html;
    return wrap;
  }

  /* Reveal the cited line by adjusting scrollTop against the container's own
   * bounding rect. row.offsetTop cannot be used: it is measured from the
   * offsetParent, which is not necessarily this container. */
  function jumpToLine(row) {
    var box = document.querySelector('#sbkit .sb-file');
    if (!box) return;
    var delta = row.getBoundingClientRect().top - box.getBoundingClientRect().top;
    box.scrollTop = Math.max(0, box.scrollTop + delta - box.clientHeight / 2 + 18);
    box.scrollLeft = 0;
    row.classList.remove('sb-cl-flash');
    void row.offsetWidth;
    row.classList.add('sb-cl-flash');
  }

  function renderSource(arg) {
    var path = arg.path;
    var f = FILES[path];
    setPanel(f ? path.split('/').pop() : 'Source', f ? f.role + ' · ' + f.lines + ' lines' : '', true, false, true);

    if (!f) {
      var miss = el('div', 'sb-h-s');
      miss.textContent = 'This file is not mirrored into code-source.js, so it cannot be shown here. Run node tools/build-code-viewer.mjs to mirror it.';
      bodyEl.appendChild(miss);
      if (arg.raw) bodyEl.appendChild(btn('Open the raw file', 'sb-btn', function () { location.href = arg.raw; }));
      clear(footEl);
      footEl.appendChild(el('span', 'sb-spacer'));
      footEl.appendChild(btn('Back', 'sb-btn is-primary', function () { back(); }));
      return;
    }

    bodyEl.appendChild(renderFileHeader(f, path));

    var oc = renderOutline(f);
    if (oc) bodyEl.appendChild(oc);

    if (arg.note) showNote(bodyEl, arg.note);

    bodyEl.appendChild(renderFile(path, arg.from || null, arg.to));

    var spots = anchorsIn(path);
    if (spots.length) {
      var s1 = section('Explained lines (' + spots.length + ')');
      spots.forEach(function (a) {
        var row = el('div', 'sb-hit');
        row.style.cursor = 'default';
        var b = el('button', 'sb-link');
        b.type = 'button';
        b.appendChild(el('span', null, 'lines ' + a.from + (a.to === a.from ? '' : '-' + a.to)));
        b.addEventListener('click', function () { jumpLine(a.from); });
        row.appendChild(b);
        row.appendChild(el('div', 'sb-h-m', a.note));
        s1.appendChild(row);
      });
      bodyEl.appendChild(s1);
    }

    var tl = traceStepsFor(path);
    if (tl.length) {
      var s2 = section('Walkthrough steps that stop here (' + tl.length + ')');
      tl.forEach(function (t) {
        var row = el('div', 'sb-hit');
        row.style.cursor = 'default';
        var b = el('button', 'sb-link');
        b.type = 'button';
        b.appendChild(el('span', null, 'step ' + (t.i + 1) + ' — ' + t.step.title));
        b.addEventListener('click', function () { open('trace', { slug: t.slug, i: t.i }); });
        row.appendChild(b);
        s2.appendChild(row);
      });
      bodyEl.appendChild(s2);
    }

    var bl = backLinksFor(path);
    if (bl.length) {
      var s3 = section('Implements (' + bl.length + ' diagram node' + (bl.length === 1 ? '' : 's') + ')');
      bl.slice(0, 24).forEach(function (x) {
        var row = el('div', 'sb-hit');
        row.style.cursor = 'default';
        var b = el('button', 'sb-link');
        b.type = 'button';
        b.appendChild(el('span', null, nodeTitle(x.d, x.node)));
        b.appendChild(el('span', 'sb-lk', x.d.replace('Spring_Boot_', '')));
        b.addEventListener('click', function () { go(x.d, x.node); });
        row.appendChild(b);
        s3.appendChild(row);
      });
      bodyEl.appendChild(s3);
    }

    clear(footEl);
    if (arg.raw) footEl.appendChild(btn('Open the raw file', 'sb-btn', function () { location.href = arg.raw; }));
    footEl.appendChild(el('span', 'sb-spacer'));
    footEl.appendChild(btn('Back', 'sb-btn is-primary', function () { back(); }));

    if (arg.from) {
      setTimeout(function () {
        var row = document.getElementById('sb-l' + arg.from);
        if (row) jumpToLine(row);
      }, 60);
    }
  }

  function back() {
    if (history.length > 1) history.back();
    else close();
  }

  /* --------------------------------------------------------------- evidence */

  function evPretty(v) {
    if (v === undefined) return '';
    return JSON.stringify(v, null, 2);
  }

  var CURL = {
    naive: 'curl -s http://localhost:8080/api/catalog/books/naive',
    joinFetch: 'curl -s http://localhost:8080/api/catalog/books/join-fetch',
    required: 'curl -s -X POST "http://localhost:8080/api/orders?mode=required" -H "Content-Type: application/json" -d \'{"userId":1,"lines":[{"bookItemId":2,"quantity":1}],"paymentReference":"demo"}\'',
    'requires-new': 'curl -s -X POST "http://localhost:8080/api/orders?mode=requires-new" -H "Content-Type: application/json" -d \'{"userId":1,"lines":[{"bookItemId":3,"quantity":1}],"paymentReference":"demo"}\'',
    poison: 'curl -s -X POST "http://localhost:8080/api/orders?mode=poison" -H "Content-Type: application/json" -d \'{"userId":1,"lines":[{"bookItemId":4,"quantity":1}],"paymentReference":"demo"}\'',
  };

  function renderEvidence(arg) {
    var group = arg.group;
    var key = arg.key;
    setPanel('Measured, not asserted', 'captured from the running Book Store app', true, false, true);

    if (!EV) {
      bodyEl.appendChild(el('div', 'sb-h-s', 'No evidence captured yet. Run capture-evidence.mjs against the running Book Store app.'));
      return;
    }

    var st = EV.meta ? EV.meta.capturedAt : 'unknown';
    var lead = el('div', 'sb-h-s');
    lead.textContent = 'Captured ' + st + ' by starting the real app and calling it. Spring Boot ' +
      (EV.meta && EV.meta.springBoot ? EV.meta.springBoot : '?') + ' on ' + (EV.meta && EV.meta.java ? EV.meta.java : '?') +
      '. Regenerate with capture-evidence.mjs.';
    bodyEl.appendChild(lead);

    var groups = [];
    if (group === 'nplus1') {
      groups.push({ title: 'findAll plus lazy access', key: 'naive', value: EV.nplus1 && EV.nplus1.naive });
      groups.push({ title: 'single join fetch', key: 'joinFetch', value: EV.nplus1 && EV.nplus1.joinFetch });
    } else if (group === 'transactions') {
      groups.push({ title: 'mode=required — inner call crosses the proxy', key: 'required', value: EV.transactions && EV.transactions.required });
      groups.push({ title: 'mode=requires-new — inner transaction commits alone', key: 'requires-new', value: EV.transactions && EV.transactions['requires-new'] });
      groups.push({ title: 'mode=poison — rollback-only after the catch', key: 'poison', value: EV.transactions && EV.transactions.poison });
    } else if (group === 'outbox') {
      groups.push({ title: 'events written in the order transaction', key: 'events', value: EV.outbox && EV.outbox.events });
      groups.push({ title: 'events delivered after commit', key: 'handled', value: EV.outbox && EV.outbox.handled });
    } else if (group === 'errors') {
      groups.push({ title: 'missing resource', key: 'notFound', value: EV.errors && EV.errors.notFound });
      groups.push({ title: 'validation failure', key: 'validation', value: EV.errors && EV.errors.validation });
      groups.push({ title: 'duplicate value', key: 'conflict', value: EV.errors && EV.errors.conflict });
    }
    if (key) groups = groups.filter(function (g) { return g.key === key; });

    if (group === 'nplus1' && !key && EV.nplus1) {
      var cmp = el('div', 'sb-ev-grid');
      var cell = function (label, q, extra) {
        var d = el('div', 'sb-ev-cell');
        d.appendChild(el('div', 'sb-ev-q', String(q)));
        d.appendChild(el('div', 'sb-ev-l', label));
        if (extra) d.appendChild(el('div', 'sb-ev-x', extra));
        return d;
      };
      cmp.appendChild(cell('queries, naive path', EV.nplus1.naive.sqlQueries, '1 + ' + EV.nplus1.naive.queriesPerBook + ' per book'));
      cmp.appendChild(cell('queries, join fetch', EV.nplus1.joinFetch.sqlQueries, 'single statement'));
      cmp.appendChild(cell('queries avoided', EV.nplus1.saved, 'same payload either way'));
      cmp.appendChild(cell('payload identical', EV.nplus1.identicalPayload ? 'yes' : 'no', 'the fix changes cost, not output'));
      bodyEl.appendChild(cmp);
    }

    groups.forEach(function (g) {
      var s = section(g.title);
      var pre = el('pre', 'sb-ev');
      pre.textContent = evPretty(g.value);
      s.appendChild(pre);
      bodyEl.appendChild(s);
    });

    var curlKeys = group === 'nplus1' ? ['naive', 'joinFetch']
      : group === 'transactions' ? ['required', 'requires-new', 'poison']
      : [];
    if (curlKeys.length) {
      var sc = section('Run it yourself');
      sc.appendChild(el('div', 'sb-h-s', 'Start the app with bookstore/run.cmd, then:'));
      curlKeys.forEach(function (k) {
        var pre = el('pre', 'sb-ev sb-ev-cmd');
        pre.textContent = CURL[k];
        sc.appendChild(pre);
      });
      bodyEl.appendChild(sc);
    }

    if (group === 'outbox' && EV.outbox) {
      var note = el('div', 'sb-note');
      note.appendChild(el('span', 'sb-note-k', 'why this matters'));
      note.appendChild(el('span', null, EV.outbox.publishedCount + ' of ' + EV.outbox.totalCount +
        ' events were published, and all ' + (EV.outbox.handled || []).length +
        ' appear as handled. Publication only happens after the order transaction commits, which is what closes the dual-write gap.'));
      bodyEl.appendChild(note);
    }

    clear(footEl);
    footEl.appendChild(el('span', 'sb-spacer'));
    footEl.appendChild(btn('Back', 'sb-btn is-primary', function () { back(); }));
  }

  /* ----------------------------------------------------------------- traces */

  function renderTrace(arg) {
    var slug = arg.slug;
    var tr = TRACES[slug];
    if (!tr) {
      setPanel('Walkthrough', slug, true, false, false);
      bodyEl.appendChild(el('div', 'sb-empty', 'No walkthrough named ' + slug + '.'));
      return;
    }
    var i = Math.max(0, Math.min(tr.steps.length - 1, arg.i || 0));
    state.traceStep = i;
    var step = tr.steps[i];

    setPanel(tr.title, 'step ' + (i + 1) + ' of ' + tr.steps.length, true, false, true);

    if (i === 0) bodyEl.appendChild(el('div', 'sb-h-s', tr.intro));
    bodyEl.appendChild(el('h4', 'sb-h4', step.title));
    bodyEl.appendChild(el('div', 'sb-p', step.body));

    if (FILES[step.file]) {
      var snip = renderSnippet(step.file, step.from, step.to);
      bodyEl.appendChild(snip);
      bodyEl.appendChild(el('div', 'sb-src', step.file));
      var openCode = el('div', 'sb-row');
      openCode.appendChild(btn('Open this file', 'sb-btn', function () {
        open('source', { path: step.file, from: step.from, to: step.to });
      }));
      bodyEl.appendChild(openCode);
    }

    if (step.evidence && EV) {
      var eg = step.evidence;
      var se = section('Measured at this step');
      if (eg.nplus1) {
        var side = eg.nplus1 === 'both' ? null : EV.nplus1[eg.nplus1];
        var cmp = el('div', 'sb-ev-grid');
        cmp.appendChild(evCell('naive path', side === null ? null : EV.nplus1.naive.sqlQueries, 'findAll plus lazy access'));
        cmp.appendChild(evCell('join fetch', side === null ? null : EV.nplus1.joinFetch.sqlQueries, 'one statement'));
        if (eg.nplus1 === 'both' && EV.nplus1) {
          se.appendChild(el('div', 'sb-h-s', 'Both endpoints, for comparison: ' +
            EV.nplus1.naive.sqlQueries + ' queries versus ' + EV.nplus1.joinFetch.sqlQueries +
            ', identical payloads. Avoided ' + EV.nplus1.saved + ' round trips.'));
        } else {
          se.appendChild(cmp);
        }
      } else if (eg.transaction) {
        var r = EV.transactions && EV.transactions[eg.transaction];
        if (r) {
          var body = r.body || r;
          var pre = el('pre', 'sb-ev');
          pre.textContent = evPretty({
            httpStatus: r.status,
            advisedMethods: body.advisedMethods,
            bypassedMethods: body.bypassedMethods,
            txReport: body.transactionReport || body.txReport,
          });
          se.appendChild(pre);
          if (body.bypassedMethods && body.bypassedMethods.length) {
            var n2 = el('div', 'sb-note');
            n2.appendChild(el('span', 'sb-note-k', 'the trap'));
            n2.appendChild(el('span', null, body.bypassedMethods.join(', ') +
              ' is annotated @Transactional and still never ran advice, because the call did not cross a proxy.'));
            se.appendChild(n2);
          }
        }
      }
      bodyEl.appendChild(se);
    }

    if (i === tr.steps.length - 1 && tr.takeaway) {
      var tk = el('div', 'sb-note sb-note-key');
      tk.appendChild(el('span', 'sb-note-k', 'takeaway'));
      tk.appendChild(el('span', null, tr.takeaway));
      bodyEl.appendChild(tk);
    }

    if (step.node && DIA) {
      var fr = el('div', 'sb-row');
      fr.appendChild(btn('Focus ' + nodeTitle(SELF, step.node) + ' on the diagram', 'sb-btn', function () {
        close();
        focusNode(step.node);
        flashNode(step.node);
      }));
      bodyEl.appendChild(fr);
    }

    clear(footEl);
    footEl.appendChild(btn('Previous', 'sb-btn', function () {
      if (i > 0) open('trace', { slug: slug, i: i - 1 });
    }));
    if (i === 0 && tr.diagram && tr.diagram !== SELF) {
      footEl.appendChild(btn('Open ' + tr.diagram.replace('Spring_Boot_', ''), 'sb-btn', function () { go(tr.diagram); }));
    }
    footEl.appendChild(el('span', 'sb-spacer'));
    footEl.appendChild(btn(i === tr.steps.length - 1 ? 'Restart' : 'Next', 'sb-btn is-primary', function () {
      open('trace', { slug: slug, i: i === tr.steps.length - 1 ? 0 : i + 1 });
    }));
  }

  function evCell(label, q, extra) {
    var d = el('div', 'sb-ev-cell');
    if (q !== null && q !== undefined) d.appendChild(el('div', 'sb-ev-q', String(q)));
    d.appendChild(el('div', 'sb-ev-l', label));
    if (extra) d.appendChild(el('div', 'sb-ev-x', extra));
    return d;
  }

  /* Flash the node the step belongs to. Uses the kit's own focusNode for the
   * scroll-and-focus, so deep links and this view stay on one code path. */
  function flashNode(id) {
    var g = document.querySelector('[data-node-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    if (!g) return;
    try {
      g.setAttribute('data-sb-flash', '');
      setTimeout(function () { g.removeAttribute('data-sb-flash'); }, 1400);
    } catch (e) { /* older browsers */ }
  }

  function traceForDia(d) {
    return Object.keys(TRACES).filter(function (slug) { return TRACES[slug].diagram === d; })[0] || null;
  }

  function render() {
    if (!view) return;
    if (view === 'search') return renderSearch(state.arg);
    if (view === 'quiz') return renderQuiz();
    if (view === 'concept') return renderConcept(state.arg);
    if (view === 'glossary') return renderGlossary(state.arg);
    if (view === 'trouble') return renderTrouble(state.arg);
    if (view === 'interview') return renderInterview(state.arg);
    if (view === 'tracks') return renderTracks();
    if (view === 'present') return renderPresent();
    if (view === 'help') return renderHelp();
    if (view === 'source') return renderSource(state.arg || {});
    if (view === 'evidence') return renderEvidence(state.arg || {});
    if (view === 'trace') return renderTrace(state.arg || {});
    if (view === 'info') return renderHubInfo();
    return renderHubInfo();
  }

  function injectCardExtras(kind, nid) {
    var card = document.getElementById('archify-hover-card');
    if (!card) return;
    Array.prototype.forEach.call(card.querySelectorAll('.sb-card-extra'), function (n) { n.parentNode.removeChild(n); });
    if (kind !== 'n') return;
    var wrap = el('div', 'sb-card-extra');
    var slugs = conceptsFor(SELF, nid);
    var codeRows = DIA ? ((DIA.code || []).filter(function (c) { return c.node === nid; })) : [];
    if (codeRows.length) {
      codeRows.slice(0, 2).forEach(function (c) {
        var key = c.path.replace(/^bookstore\//, '');
        var mirrored = !!FILES[key];
        var cb = el('button', 'sb-chip');
        cb.type = 'button';
        cb.appendChild(el('span', 'sb-dot'));
        cb.appendChild(el('span', null, 'code: ' + c.path.split('/').pop()));
        cb.addEventListener('click', function (e) {
          e.stopPropagation();
          open('source', { path: key, raw: c.path });
        });
        wrap.appendChild(cb);
      });
    }
    var tslug = traceForDia(SELF);
    if (tslug && DIA && (DIA.nodes || []).some(function (n) { return n.id === nid; })) {
      var inTrace = TRACES[tslug].steps.some(function (s) { return s.node === nid; });
      if (inTrace) {
        var tb = el('button', 'sb-chip sb-chip-key');
        tb.type = 'button';
        tb.appendChild(el('span', 'sb-dot'));
        tb.appendChild(el('span', null, 'walkthrough'));
        tb.addEventListener('click', function (e) {
          e.stopPropagation();
          var idx = TRACES[tslug].steps.map(function (s) { return s.node; }).indexOf(nid);
          open('trace', { slug: tslug, i: idx === -1 ? 0 : idx });
        });
        wrap.appendChild(tb);
      }
    }
    if (!slugs.length) { if (wrap.childNodes.length) card.appendChild(wrap); return; }
    var row = el('div', 'sb-chips');
    row.style.marginTop = '8px';
    slugs.slice(0, 5).forEach(function (sl) {
      var c = el('button', 'sb-chip');
      c.type = 'button';
      c.appendChild(el('span', 'sb-dot'));
      c.appendChild(el('span', null, CON[sl].t));
      c.addEventListener('click', function (e) { e.stopPropagation(); open('concept', sl); });
      row.appendChild(c);
    });
    wrap.appendChild(row);
    var ft = card.querySelector('.arch-hc-ft');
    if (ft && ft.parentNode) ft.parentNode.insertBefore(wrap, ft);
    else card.appendChild(wrap);
  }

  function build() {
    root = el('div');
    root.id = 'sbkit';

    var bar = el('div', 'sb-bar');
    function barBtn(label, kbd, onClick) {
      var b = el('button');
      b.type = 'button';
      b.title = kbd ? label + '  (' + kbd + ')' : label;
      b.appendChild(el('span', null, label));
      if (kbd) { var k = el('span', 'sb-kbd', kbd); b.appendChild(k); }
      b.addEventListener('click', onClick);
      return b;
    }
    bar.appendChild(barBtn('Search', 'Ctrl K', function () { open('search'); }));
    var barSlug = traceForDia(SELF);
    if (barSlug) {
      bar.appendChild(barBtn('Walk through', '', function () { open('trace', { slug: barSlug, i: 0 }); }));
    }
    if (DIA && (DIA.code || []).length) {
      bar.appendChild(barBtn('Code lab', 'C', function () { open('info'); }));
    }
    bar.appendChild(barBtn('Quiz', 'Q', function () { open('quiz'); }));
    bar.appendChild(barBtn('Present', 'P', function () { if (presentState.on) close(); else startPresent(0); }));
    bar.appendChild(barBtn('Terms', 'G', function () { open('glossary'); }));
    bar.appendChild(barBtn('Debug', 'T', function () { open('trouble'); }));
    bar.appendChild(barBtn('Interview', 'I', function () { open('interview'); }));
    bar.appendChild(barBtn('Hub', '', function () { location.href = 'index.html'; }));
    root.appendChild(bar);

    overlay = el('div', 'sb-overlay');
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
    panel = el('div', 'sb-panel');
    panel.tabIndex = -1;
    headEl = el('div', 'sb-head');
    bodyEl = el('div', 'sb-body');
    footEl = el('div', 'sb-foot');
    panel.appendChild(headEl);
    panel.appendChild(bodyEl);
    overlay.appendChild(panel);
    root.appendChild(overlay);

    toastEl = el('div', 'sb-toast');
    root.appendChild(toastEl);

    document.body.appendChild(root);
  }

  function typing(e) {
    var t = e.target;
    if (!t) return false;
    var tag = (t.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
  }

  function wire() {
    var card = document.getElementById('archify-hover-card');
    if (card) {
      card.addEventListener('sb:hover', function (e) {
        var d = e.detail || {};
        if (d.kind === 'n') injectCardExtras('n', d.key);
        else if (d.kind === null) { Array.prototype.forEach.call(card.querySelectorAll('.sb-card-extra'), function (n) { n.parentNode.removeChild(n); }); }
      });
    }

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open('search'); return; }
      if (e.key === 'Escape') {
        if (view) { e.preventDefault(); close(); }
        return;
      }
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key.toLowerCase();
      if (view === 'present' && (k === 'arrowright' || k === ' ' || k === 'p')) { e.preventDefault(); stepTo(presentState.i + 1, true); return; }
      if (view === 'present' && k === 'arrowleft') { e.preventDefault(); stepTo(presentState.i - 1, true); return; }
      if (view === 'present' && k === 'home') { e.preventDefault(); stepTo(0, true); return; }
      if (view === 'present' && k === 'end') { e.preventDefault(); stepTo(presentSteps().length - 1, true); return; }
      if (view) return;
      if (k === 'q') { e.preventDefault(); open('quiz'); }
      else if (k === 'p') { e.preventDefault(); startPresent(0); }
      else if (k === 'g') { e.preventDefault(); open('glossary'); }
      else if (k === 't') { e.preventDefault(); open('trouble'); }
      else if (k === 'i') { e.preventDefault(); open('interview'); }
      else if (k === 'c') { e.preventDefault(); open('info'); }
      else if (k === '?' || (e.shiftKey && k === '/')) { e.preventDefault(); open('help'); }
    });

    /* A deep link is either a node id or a panel view (#view=quiz). The hub's
     * "quiz this diagram" cards use the view form, because a quiz is not a node.
     * findNode hands back the string it was given rather than null, so an unknown
     * id still has to be recognised as "not a node" before it is read as a view. */
    var hash = location.hash.replace('#', '');
    var asView = /^view=/.test(hash);
    if (asView) {
      var VIEWS = { search: 1, quiz: 1, glossary: 1, trouble: 1, interview: 1, tracks: 1, help: 1, info: 1 };
      var want = hash.slice(5);
      if (VIEWS[want]) setTimeout(function () { open(want); }, 260);
    } else {
      var hashNode = findNode(hash);
      if (hashNode) setTimeout(function () { focusNode(hashNode); }, 260);
    }

    var prog = read('progress', {});
    if (DIA) { prog[SELF] = Date.now(); write('progress', prog); }
  }

  function boot() {
    if (document.getElementById('sbkit')) return;
    build();
    wire();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.SBKit = {
    open: open, close: close, go: go, present: startPresent,
    openSource: function (path) { open('source', { path: path }); },
    concepts: function () { return CON; },
    index: function () { return IDX; }
  };
})();
