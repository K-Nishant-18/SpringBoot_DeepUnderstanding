import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// Functional probe for index.html (the hub) and the hub -> diagram -> concept loop.
import { rmSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const DIR = ROOT;
const TMP = 'C:/Users/itsni/AppData/Local/Temp/opencode/probehub';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9347;

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--window-size=1500,1000', `--remote-debugging-port=${PORT}`, `--user-data-dir=${TMP}/profile`, 'about:blank'], { stdio: 'ignore' });

let ws, msgId = 0;
const pending = new Map();
const send = (m, p = {}, s) => { const id = ++msgId; return new Promise((res, rej) => { pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify(s ? { id, method: m, params: p, sessionId: s } : { id, method: m, params: p })); }); };
const errs = [];

const HUB = `
(async function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const o={};
  o.title=document.title;
  o.hubClass=document.body.classList.contains('sb-hub');
  o.panes=document.querySelectorAll('section.pane').length;
  o.navButtons=document.querySelectorAll('#nav button').length;
  o.statCards=document.querySelectorAll('#stats .stat').length;
  o.statsText=Array.from(document.querySelectorAll('#stats .stat')).map(s=>s.querySelector('b').textContent+' '+s.querySelector('span').textContent);
  o.homeCards=document.querySelectorAll('#home-cards .card').length;
  o.howto=document.querySelectorAll('#howto .card').length;
  o.kitBarHidden=getComputedStyle(document.querySelector('#sbkit .sb-bar')).display==='none';
  o.kitMounted=!!document.getElementById('sbkit');
  o.libraryCards=document.querySelectorAll('#library .card').length;
  o.practiceCards=document.querySelectorAll('#practice .card').length;
  o.quizGrid=document.querySelectorAll('#practice-quiz .grid .card').length;
  o.conceptCards=document.querySelectorAll('#conceptlist .card').length;
  o.docScrollX=document.documentElement.scrollWidth-document.documentElement.clientWidth;
  o.guideHomeCard=[...document.querySelectorAll('#home-cards .card')].some(c=>/guide\.html/.test(c.getAttribute('onclick')||'')||/first time|start with this/i.test(c.textContent));
  o.guideFooter=!!document.querySelector('.foot a[href="guide.html"]');

  // tab navigation
  const nav=document.getElementById('nav');
  const tabBtn=[...nav.querySelectorAll('button')].find(b=>b.getAttribute('data-tab')==='tracks');
  tabBtn.click(); await sleep(200);
  o.tracksVisible=!!document.querySelector('section.pane[data-pane="tracks"][data-on]');
  o.trackSections=document.querySelectorAll('.track').length;
  o.trackCards=document.querySelectorAll('.track .grid .card').length;
  o.tracksHash=location.hash;

  // progress tab (seed the review queue first so the due list renders with one row)
  localStorage.setItem('sbk.v1.review', JSON.stringify({
    'Probe: is a past-due question listed on the hub?': { d: 'Spring_Boot_Roadmap', n: 'partA', due: '2020-01-01', stage: 0, misses: 2 },
    'Probe: is a future question held back?': { d: 'Spring_Boot_Roadmap', n: '', due: '2099-12-31', stage: 1, misses: 1 }
  }));
  [...nav.querySelectorAll('button')].find(b=>b.getAttribute('data-tab')==='progress').click();
  await sleep(200);
  o.progressVisible=!!document.querySelector('section.pane[data-pane="progress"][data-on]');
  o.progressRows=document.querySelectorAll('#progress .prow').length-1;
  o.progressStats=document.querySelectorAll('#progress .stat').length;
  o.reviewRows=document.querySelectorAll('#progress .rrow').length;
  o.reviewBtn=!!document.querySelector('#progress .rrow button');
  o.reviewStat=[...document.querySelectorAll('#progress .stat')].some(s=>/due for review/.test(s.textContent));

  // theme toggle
  const before=document.documentElement.getAttribute('data-theme');
  document.getElementById('theme').click(); await sleep(120);
  o.themeFlipped=document.documentElement.getAttribute('data-theme')!==before;
  o.themePersisted=!!localStorage.getItem('sbk.theme');
  document.getElementById('theme').click(); await sleep(120);

  // delegated kit modals from the hub
  window.SBKit.open('trouble'); await sleep(180);
  o.troubleOpen=document.getElementById('sbkit').getAttribute('data-sb-view')==='trouble';
  o.troubleRows=document.querySelectorAll('#sbkit .sb-table tbody tr').length;
  const inp=document.querySelector('#sbkit .sb-searchwrap input');
  inp.value='N+1'; inp.dispatchEvent(new Event('input',{bubbles:true})); await sleep(200);
  o.troubleFiltered=document.querySelectorAll('#sbkit .sb-table tbody tr').length;
  window.SBKit.close(); await sleep(120);

  window.SBKit.open('glossary'); await sleep(160);
  o.glossaryOpen=document.getElementById('sbkit').getAttribute('data-sb-view')==='glossary';
  o.glossaryTerms=document.querySelectorAll('#sbkit .sb-dict dt').length;
  window.SBKit.close(); await sleep(100);

  window.SBKit.open('interview'); await sleep(160);
  o.interviewOpen=document.getElementById('sbkit').getAttribute('data-sb-view')==='interview';
  o.interviewQs=document.querySelectorAll('#sbkit .sb-note-item').length;
  const showBtn=[...document.querySelectorAll('#sbkit button')].find(b=>b.textContent==='Show answer');
  if(showBtn) showBtn.click(); await sleep(120);
  o.answerRevealed=!!document.querySelector('#sbkit .sb-note-item .sb-nb') &&
    [...document.querySelectorAll('#sbkit .sb-note-item .sb-nb')].some(n=>n.style.display!=='none');
  window.SBKit.close(); await sleep(100);

  window.SBKit.open('concept','self-invocation'); await sleep(200);
  o.conceptOpen=document.getElementById('sbkit').getAttribute('data-sb-view')==='concept';
  o.conceptTitle=(document.querySelector('#sbkit .sb-body h3')||{}).textContent||'';
  o.conceptLinks=document.querySelectorAll('#sbkit .sb-link').length;
  o.conceptJumps=document.querySelectorAll('#sbkit a[href], #sbkit button.sb-link').length;
  window.SBKit.close(); await sleep(100);

  window.SBKit.open('help'); await sleep(200);
  o.helpOpen=document.getElementById('sbkit').getAttribute('data-sb-view')==='help';
  o.helpShortcuts=document.querySelectorAll('#sbkit .sb-table tbody tr').length;
  o.helpGuideLink=[...document.querySelectorAll('#sbkit button')].some(b=>/Open the guide/.test(b.textContent));
  window.SBKit.close(); await sleep(100);

  window.SBKit.open('search'); await sleep(150);
  const si=document.querySelector('#sbkit .sb-searchwrap input');
  si.value='readiness'; si.dispatchEvent(new Event('input',{bubbles:true})); await sleep(220);
  o.searchHits=document.querySelectorAll('#sbkit .sb-hit').length;
  o.searchGroups=[...document.querySelectorAll('#sbkit .sb-body .sb-sect h3')].map(h=>h.textContent);
  window.SBKit.close(); await sleep(120);

  return o;
})()
`;

const DEEPLINK = `
(async function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const o={};
  o.hash=location.hash;
  const el=document.querySelector('[data-node-id="rollback"]');
  o.targetFound=!!el;
  const card=document.getElementById('archify-hover-card');
  o.cardTitle=(card.querySelector('.arch-hc-t')||{}).textContent||'';
  o.cardShown=card.getAttribute('data-show');
  o.inViewport=(()=>{if(!el)return false;const r=el.getBoundingClientRect();return r.top>0&&r.bottom<window.innerHeight+200;})();
  return o;
})()
`;

let exitCode = 0;
const out = [];
try {
  let v = null;
  for (let i = 0; i < 60; i++) { try { v = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break; } catch { await sleep(250); } }
  ws = new WebSocket(v.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
    if (m.method === 'Runtime.exceptionThrown') errs.push('EXC ' + ((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errs.push('LOG ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
  };

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.SB_TOUR_OFF = true' }, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Log.enable', {}, sessionId);

  const go = async (file, hash) => {
    const url = 'file:///' + `${DIR}/${file}`.replace(/\\/g, '/') + (hash || '');
    await send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 80; i++) { const r = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }, sessionId); if (r.result.value === 'complete') break; await sleep(150); }
    await sleep(500);
  };
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: 120000 }, sessionId);
    if (r.exceptionDetails) { errs.push('EVAL ' + JSON.stringify(r.exceptionDetails).slice(0, 400)); return null; }
    return r.result.value;
  };

  await go('index.html');
  const h = await ev(HUB);
  out.push('--- hub ---');
  if (!h) { out.push('  hub probe returned null'); exitCode = 1; }
  else {
    for (const [k, val] of Object.entries(h)) out.push('  ' + k.padEnd(20) + (typeof val === 'object' ? JSON.stringify(val) : val));
    const p = [];
    if (!h.hubClass) p.push('no-hub-class');
    if (h.panes !== 6) p.push('panes=' + h.panes);
    if (h.navButtons !== 6) p.push('nav=' + h.navButtons);
    if (h.statCards !== 10) p.push('stats=' + h.statCards);
    if (!h.homeCards || !h.howto) p.push('home-empty');
    if (!h.kitBarHidden) p.push('kit-bar-visible');
    if (h.libraryCards !== 21) p.push('library=' + h.libraryCards);
    if (h.practiceCards !== 4) p.push('practice=' + h.practiceCards);
    if (h.quizGrid !== 21) p.push('quizGrid=' + h.quizGrid);
    if (h.conceptCards !== 30) p.push('concepts=' + h.conceptCards);
    if (h.docScrollX > 0) p.push('h-scroll=' + h.docScrollX);
    if (!h.tracksVisible || h.trackSections !== 6) p.push('tracks=' + h.trackSections);
    if (h.trackCards !== 21) p.push('trackCards=' + h.trackCards);
    if (!h.progressVisible || h.progressRows !== 21) p.push('progress=' + h.progressRows);
    if (h.reviewRows !== 1 || !h.reviewBtn) p.push('review=' + h.reviewRows);
    if (!h.reviewStat) p.push('review-stat');
    if (!h.themeFlipped || !h.themePersisted) p.push('theme');
    if (!h.troubleOpen || !h.troubleRows) p.push('trouble=' + h.troubleRows);
    if (h.troubleFiltered >= h.troubleRows) p.push('trouble-filter-noop');
    if (!h.glossaryOpen || !h.glossaryTerms) p.push('glossary=' + h.glossaryTerms);
    if (!h.interviewOpen || !h.interviewQs) p.push('interview=' + h.interviewQs);
    if (!h.answerRevealed) p.push('answer-not-revealed');
    if (!h.conceptOpen || h.conceptLinks < 3) p.push('concept-links=' + h.conceptLinks);
    if (!h.searchHits) p.push('search-no-hits');
    if (!h.helpOpen || h.helpShortcuts < 8) p.push('help=' + h.helpShortcuts);
    if (!h.helpGuideLink) p.push('help-guide-link-missing');
    if (!h.guideFooter) p.push('guide-footer-link-missing');
    if (!h.guideHomeCard) p.push('guide-home-card-missing');
    if (p.length) { exitCode = 1; out.push('  RESULT FAIL ' + p.join(',')); }
    else out.push('  RESULT PASS');
  }

  await go('Spring_Boot_Transactions.html', '#node=rollback');
  const d = await ev(DEEPLINK);
  out.push('--- deep link into Transactions#node=rollback ---');
  if (!d) { out.push('  null'); exitCode = 1; }
  else {
    for (const [k, val] of Object.entries(d)) out.push('  ' + k.padEnd(20) + val);
    const p = [];
    if (!d.targetFound) p.push('node-not-found');
    if (d.cardShown !== '1') p.push('card-not-open');
    if (!/rollback/i.test(d.cardTitle)) p.push('card-title=' + d.cardTitle);
    if (!d.inViewport) p.push('node-not-scrolled');
    if (p.length) { exitCode = 1; out.push('  RESULT FAIL ' + p.join(',')); }
    else out.push('  RESULT PASS');
  }

  /* The hub's "quiz this diagram" cards land on #view=quiz: a panel is not a
   * node, so the old #node=quiz form could never have resolved. */
  await go('Spring_Boot_Nplus1.html', '#view=quiz');
  const vdeep = await ev(`(() => {
    const root = document.getElementById('sbkit');
    return {
      view: root ? root.getAttribute('data-sb-view') : null,
      open: root ? root.getAttribute('data-sb-open') : null,
      title: (root && root.querySelector('.sb-panel h2') ? root.querySelector('.sb-panel h2').textContent : null),
      opts: root ? root.querySelectorAll('.sb-opt').length : 0
    };
  })()`);
  out.push('--- view deep link into N+1#view=quiz ---');
  if (!vdeep) { out.push('  null'); exitCode = 1; }
  else {
    for (const [k, val] of Object.entries(vdeep)) out.push('  ' + k.padEnd(20) + val);
    const pv = [];
    if (vdeep.view !== 'quiz') pv.push('view=' + vdeep.view);
    if (vdeep.opts < 4) pv.push('opts=' + vdeep.opts);
    if (pv.length) { exitCode = 1; out.push('  RESULT FAIL ' + pv.join(',')); }
    else out.push('  RESULT PASS');
  }

  /* The guide is a standalone page, not a hub pane, so it gets its own
   * probe: every section anchor must resolve, the scroll-spy nav must point at
   * real ids, and the page must stay free of horizontal overflow. */
  await go('guide.html');
  const g = await ev(`(async function(){
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    const o={};
    o.title=document.title;
    o.sections=document.querySelectorAll('section.sec').length;
    o.pillLinks=document.querySelectorAll('#pillnav a').length;
    o.stats=document.querySelectorAll('.hero .stats .stat').length;
    o.steps=document.querySelectorAll('.steps li').length;
    o.cards=document.querySelectorAll('.card').length;
    o.tables=document.querySelectorAll('table.tbl').length;
    o.shortcuts=document.querySelectorAll('#s09 table.tbl tbody tr').length;
    o.anchorsBroken=[...document.querySelectorAll('#pillnav a, .cta a, footer a')]
      .map(a=>a.getAttribute('href')||'')
      .filter(h=>h.startsWith('#'))
      .filter(h=>!document.getElementById(h.slice(1)));
    o.hasChinese=/[\\u4e00-\\u9fff]/.test(document.body.innerText);
    o.hasDevanagari=/[\\u0900-\\u097F]/.test(document.body.innerText);
    o.docScrollX=document.documentElement.scrollWidth-document.documentElement.clientWidth;
    const b=document.getElementById('theme');
    const before=document.documentElement.getAttribute('data-theme');
    b.click(); await sleep(120);
    o.themeFlipped=document.documentElement.getAttribute('data-theme')!==before;
    b.click(); await sleep(120);
    await sleep(400);
    document.getElementById('s09').scrollIntoView();
    await sleep(700);
    o.spied=document.querySelectorAll('#pillnav a[data-on]').length;
    o.spiedLabel=(document.querySelector('#pillnav a[data-on]')||{}).textContent||'';
    return o;
  })()`);
  out.push('--- guide (guide.html) ---');
  if (!g) { out.push('  null'); exitCode = 1; }
  else {
    for (const [k, val] of Object.entries(g)) out.push('  ' + k.padEnd(20) + (typeof val === 'object' ? JSON.stringify(val) : val));
    const pg = [];
    if (g.sections !== 14) pg.push('sections=' + g.sections);
    if (g.pillLinks !== g.sections) pg.push('pill=' + g.pillLinks + ' vs ' + g.sections);
    if (g.stats !== 8) pg.push('stats=' + g.stats);
    if (g.steps < 10) pg.push('steps=' + g.steps);
    if (g.tables !== 4) pg.push('tables=' + g.tables);
    if (g.shortcuts < 13) pg.push('shortcuts=' + g.shortcuts);
    if (g.anchorsBroken.length) pg.push('broken-anchors=' + JSON.stringify(g.anchorsBroken));
    if (g.hasChinese || g.hasDevanagari) pg.push('not-roman-script');
    if (g.docScrollX > 0) pg.push('h-scroll=' + g.docScrollX);
    if (!g.themeFlipped) pg.push('theme');
    if (!g.spied) pg.push('scroll-spy=' + g.spied);
    if (pg.length) { exitCode = 1; out.push('  RESULT FAIL ' + pg.join(',')); }
    else out.push('  RESULT PASS');
  }
} catch (e) { exitCode = 1; out.push('ERROR ' + e.message); }
finally { try { ws && ws.close(); } catch { } chrome.kill(); }

if (errs.length) { out.push('--- page errors ---'); errs.slice(0, 12).forEach(e => out.push('  ' + e)); exitCode = 1; }
console.log(out.join('\n'));
process.exit(exitCode);
