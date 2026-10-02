import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// Functional probe for the shared study kit (sbkit.js) over CDP.
// Runs against the real resource directory so relative assets resolve.

import { rmSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const DIR = ROOT;
const TMP = 'C:/Users/itsni/AppData/Local/Temp/opencode/probekit';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9337;

const HARNESS = `
(async function(){
  const out={};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const $=(s,r)=>(r||document).querySelector(s);
  const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
  const kit=document.getElementById('sbkit');
  out.mounted=!!kit;
  if(!kit) return out;
  out.barButtons=$$('.sb-bar button').length;
  out.barLabels=$$('.sb-bar button span').map(s=>s.textContent).filter(Boolean);
  out.cssApplied=getComputedStyle($$('.sb-bar')[0]).position==='fixed';
  out.apiOk=typeof window.SBKit==='object';
  const IDX=window.SBKit.index();
  out.stats=IDX.stats;
  out.overlayHidden=getComputedStyle(kit.querySelector('.sb-overlay')).display==='none';

  // ---- search ----
  window.SBKit.open('search');
  await sleep(120);
  out.searchOpen=kit.getAttribute('data-sb-view')==='search';
  const si=kit.querySelector('.sb-searchwrap input');
  out.searchInput=!!si;
  si.value='transaction';
  si.dispatchEvent(new Event('input',{bubbles:true}));
  await sleep(180);
  out.searchHits=$$('.sb-hit').length;
  out.searchGroups=$$('.sb-body .sb-sect h3').map(h=>h.textContent);
  out.searchMarks=$$('.sb-hit mark').length;
  // click a concept result if present, else the first hit
  const conceptHit=$$('.sb-hit').find(b=>b.closest('.sb-sect')&&b.closest('.sb-sect').querySelector('h3').textContent==='Concepts');
  out.conceptResultFound=!!conceptHit;
  window.SBKit.close();
  await sleep(80);
  out.closeHides=kit.getAttribute('data-sb-view')===null;

  // ---- quiz ----
  window.SBKit.open('quiz');
  await sleep(150);
  out.quizOpen=kit.getAttribute('data-sb-view')==='quiz';
  out.quizQuestion=($('.sb-q')||{}).textContent||'';
  out.quizOptions=$$('.sb-opt').length;
  out.quizMeter=($('.sb-meter b')||{}).textContent||'';
  const firstOpt=$$('.sb-opt')[0];
  if(firstOpt) firstOpt.click();
  await sleep(150);
  out.quizFeedback=!!$('.sb-why');
  out.quizMarked=$$('.sb-opt[data-ok]').length+( $$('.sb-opt[data-bad]').length?1:0 );
  out.quizScoreAfter=($('.sb-meter b')||{}).textContent||'';
  window.SBKit.close();
  await sleep(80);

  // ---- review queue ----
  const seedRev={};
  seedRev['Probe: is a past-due question listed as due?']={ d:window.SBKit.selfKey, n:'', due:'2020-01-01', stage:0, misses:2 };
  seedRev['Probe: is a future question held back from due?']={ d:window.SBKit.selfKey, n:'', due:'2099-12-31', stage:1, misses:1 };
  localStorage.setItem('sbk.v1.review', JSON.stringify(seedRev));
  window.SBKit.open('review');
  await sleep(140);
  out.reviewOpen=kit.getAttribute('data-sb-view')==='review';
  out.reviewRows=$$('.sb-note-item').length;
  out.reviewDueRows=$$('.sb-note-item[data-due]').length;
  out.reviewOpenBtns=$$('.sb-note-item button').length;
  window.SBKit.close();
  await sleep(80);
  // a wrong answer must add a queue entry (2 seeds + 1 = 3)
  window.SBKit.open('quiz');
  await sleep(140);
  const nxt=$$('.sb-foot button').find(b=>b.textContent==='Next');
  if(nxt){ nxt.click(); await sleep(80); }
  const qtxt=(($('.sb-q')||{}).textContent||'').replace(/^\\d+\\.\\s*/,'');
  const item=(window.SB_STUDY.quiz||[]).find(x=>x.q===qtxt);
  const opts2=$$('.sb-opt');
  out.reviewDebug={ nxt:!!nxt, qlen:qtxt.length, found:!!item, opts:opts2.length, view:kit.getAttribute('data-sb-view'), qtxt:qtxt.slice(0,70), sample:((window.SB_STUDY.quiz||[]).filter(x=>x.d===window.SBKit.selfKey)[0]||{}).q };
  if(item&&opts2.length){
    opts2[(item.a+1)%opts2.length].click();
    await sleep(120);
    out.wrongMarked=!!$('.sb-opt[data-bad]');
    out.reviewStoreCount=Object.keys(JSON.parse(localStorage.getItem('sbk.v1.review')||'{}')).length;
  }
  window.SBKit.close();
  await sleep(80);

  // ---- concept chips inside the hover card ----
  const CON=window.SBKit.concepts();
  const nodeIds=$$('[data-node-id]').map(n=>n.getAttribute('data-node-id'));
  const withConcepts=nodeIds.filter(id=>Object.keys(CON).some(s=>CON[s].refs.some(r=>r[0]===window.SBKit.selfKey&&r[1]===id)));
  let chipInfo={covered:withConcepts.length,testedNodes:0,withChips:0,chipLabels:[]};
  for(const id of withConcepts){
    chipInfo.testedNodes++;
    const el=document.querySelector('g[data-node-id="'+id+'"]')||document.querySelector('[data-node-id="'+id+'"]');
    el.dispatchEvent(new MouseEvent('mouseenter',{bubbles:false,clientX:0,clientY:0,view:window}));
    await sleep(180);
    const chips=$$('#archify-hover-card .sb-card-extra .sb-chip');
    if(chips.length){ chipInfo.withChips++; if(chipInfo.chipLabels.length<4) chipInfo.chipLabels=chipInfo.chipLabels.concat(chips.map(c=>c.textContent)); }
    el.dispatchEvent(new MouseEvent('mouseleave',{bubbles:false,view:window}));
    await sleep(120);
    if(chipInfo.testedNodes>=4) break;
  }
  out.chips=chipInfo;

  // ---- node mastery: hover indicator + the passport's I know this toggle ----
  localStorage.removeItem('sbk.v1.mastery');
  if(withConcepts.length){
    const seedM={}; seedM[window.SBKit.selfKey+'::'+withConcepts[0]]=Date.now();
    localStorage.setItem('sbk.v1.mastery', JSON.stringify(seedM));
    const mEl=document.querySelector('g[data-node-id="'+withConcepts[0]+'"]')||document.querySelector('[data-node-id="'+withConcepts[0]+'"]');
    mEl.dispatchEvent(new MouseEvent('mouseenter',{bubbles:false,clientX:0,clientY:0,view:window}));
    await sleep(200);
    out.masteryIndicator=!!document.querySelector('#archify-hover-card .sb-card-extra .sb-chip[data-sb-on]');
    mEl.dispatchEvent(new MouseEvent('mouseleave',{bubbles:false,view:window}));
    await sleep(120);
    localStorage.removeItem('sbk.v1.mastery');
  } else out.masteryIndicator=true;
  // click a node for real: the svg click contract opens the passport
  const pNode=document.querySelector('[data-node-id]');
  const pId=pNode.getAttribute('data-node-id');
  pNode.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
  await sleep(450);
  const lens=document.getElementById('focus-chip');
  out.passportOpens=!!lens && !lens.hasAttribute('hidden');
  const mb=document.getElementById('sb-mastery');
  out.masteryBtn=!!mb && mb.style.display!=='none' && /I know this/.test(mb.textContent);
  if(mb){
    mb.click(); await sleep(120);
    out.masteryStored=!!(JSON.parse(localStorage.getItem('sbk.v1.mastery')||'{}'))[window.SBKit.selfKey+'::'+pId];
    out.masteryOn=mb.hasAttribute('data-sb-on') && /Known/.test(mb.textContent);
    mb.click(); await sleep(120);
    out.masteryCleared=!JSON.parse(localStorage.getItem('sbk.v1.mastery')||'{}')[window.SBKit.selfKey+'::'+pId];
    out.masteryOff=!mb.hasAttribute('data-sb-on') && /I know this/.test(mb.textContent);
  }
  // click empty canvas: the passport must close again (document click contract)
  document.body.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
  await sleep(300);
  out.passportCloses=!lens || lens.hasAttribute('hidden');

  // ---- presentation ----
  window.SBKit.present(0);
  await sleep(200);
  out.presentClass=document.body.classList.contains('sb-present');
  out.presentStep=($('.sb-body .sb-sect h3')||{}).textContent||'';
  out.presentSteps=$$('.sb-chips .sb-chip').length;
  out.dimmedAtOverview=$$('[data-node-id]').filter(n=>n.style.opacity&&parseFloat(n.style.opacity)<0.5).length;
  const nextBtn=$$('.sb-foot button').find(b=>b.textContent==='Next');
  if(nextBtn) nextBtn.click();
  await sleep(200);
  out.presentStepAfter=($('.sb-body .sb-sect h3')||{}).textContent||'';
  out.dimmedAfterStep=$$('[data-node-id]').filter(n=>n.style.opacity&&parseFloat(n.style.opacity)<0.5).length;
  out.totalNodes=nodeIds.length;
  window.SBKit.close();
  await sleep(120);
  out.presentClassCleared=!document.body.classList.contains('sb-present');
  out.dimCleared=$$('[data-node-id]').filter(n=>n.style.opacity&&parseFloat(n.style.opacity)<0.5).length===0;

  // ---- keyboard: Ctrl+K and Escape ----
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));
  await sleep(140);
  out.ctrlKOpens=kit.getAttribute('data-sb-view')==='search';
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  await sleep(120);
  out.escCloses=kit.getAttribute('data-sb-view')===null;

  return out;
})()
`;

const files = [
  'Spring_Boot_Data_Model', 'Spring_Boot_Transactions', 'Spring_Boot_AntiPatterns',
  'Spring_Boot_Config_Properties', 'Spring_Boot_Roadmap',
];

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const profile = `${TMP}/profile`;
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--window-size=1600,1000', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

let ws, msgId = 0;
const pending = new Map();
function send(method, params = {}, sessionId) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
}

let exitCode = 0;
try {
  let version = null;
  for (let i = 0; i < 60; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break; }
    catch { await sleep(250); }
  }
  if (!version) throw new Error('chrome debugger never came up');
  ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  };

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.SB_TOUR_OFF = true' }, sessionId);
  await send('Runtime.enable', {}, sessionId);

  for (const f of files) {
    const url = 'file:///' + `${DIR}/${f}.html`.replace(/\\/g, '/');
    await send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 80; i++) {
      const r = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }, sessionId);
      if (r.result.value === 'complete') break;
      await sleep(150);
    }
    await sleep(400);
    // expose the current key for chip resolution
    await send('Runtime.evaluate', { expression: 'window.SBKit.selfKey=(location.pathname.split(/[\\\\/]/).pop()||"").replace(/\\.html$/i,"")', returnByValue: true }, sessionId);

    const res = await send('Runtime.evaluate', { expression: HARNESS, awaitPromise: true, returnByValue: true, timeout: 180000 }, sessionId);
    if (res.exceptionDetails) throw new Error(f + ': ' + JSON.stringify(res.exceptionDetails).slice(0, 700));
    const r = res.result.value;

    const p = [];
    if (!r.mounted) p.push('not-mounted');
    else {
      if (r.barButtons < 8) p.push('bar=' + r.barButtons);
      if (!r.cssApplied) p.push('css-not-applied');
      if (!r.apiOk) p.push('no-api');
      if (!r.overlayHidden) p.push('overlay-visible-at-rest');
      if (!r.searchOpen || !r.searchInput) p.push('search-broken');
      if (!r.searchHits) p.push('search-no-hits');
      if (!r.closeHides) p.push('close-broken');
      if (!r.quizOpen || !r.quizQuestion) p.push('quiz-broken');
      if (r.quizOptions < 3) p.push('quiz-opts=' + r.quizOptions);
      if (!r.quizFeedback) p.push('quiz-no-feedback');
      if (!r.quizMarked) p.push('quiz-unmarked');
      if (!r.reviewOpen || r.reviewRows < 2) p.push('review-broken=' + r.reviewRows);
      if (r.reviewDueRows !== 1) p.push('review-due=' + r.reviewDueRows);
      if (r.reviewOpenBtns < 2) p.push('review-btns=' + r.reviewOpenBtns);
      if (!r.wrongMarked) p.push('review-no-wrong-mark:' + JSON.stringify(r.reviewDebug) + ' store=' + r.reviewStoreCount);
      else if (r.reviewStoreCount !== 3) p.push('review-store=' + r.reviewStoreCount);
      if (!/Review/.test((r.barLabels||[]).join(' '))) p.push('no-review-btn');
      if (r.chips.covered > 0 && r.chips.testedNodes < 1) p.push('no-concept-node');
      if (r.chips.testedNodes && !r.chips.withChips) p.push('no-card-chips');
      if (r.chips.testedNodes && r.chips.withChips !== r.chips.testedNodes) p.push('partial-chips=' + r.chips.withChips + '/' + r.chips.testedNodes);
      if (!r.masteryIndicator) p.push('no-mastery-indicator');
      if (!r.passportOpens) p.push('passport-not-open');
      if (!r.masteryBtn) p.push('no-mastery-btn');
      if (r.masteryBtn && !r.masteryStored) p.push('mastery-not-stored');
      if (r.masteryBtn && !r.masteryOn) p.push('mastery-not-on');
      if (r.masteryBtn && !r.masteryCleared) p.push('mastery-not-cleared');
      if (r.masteryBtn && !r.masteryOff) p.push('mastery-not-off');
      if (!r.passportCloses) p.push('passport-stuck');
      if (!r.presentClass) p.push('present-off');
      if (!r.presentSteps) p.push('present-no-steps');
      if (r.presentStepAfter === r.presentStep) p.push('present-no-advance');
      if (r.dimmedAfterStep >= r.totalNodes) p.push('no-dim');
      if (r.dimmedAfterStep === 0) p.push('dim-all');
      if (!r.presentClassCleared) p.push('present-stuck');
      if (!r.dimCleared) p.push('dim-stuck');
      if (!r.ctrlKOpens) p.push('ctrlK-fails');
      if (!r.escCloses) p.push('esc-fails');
    }
    if (p.length) exitCode = 1;
    console.log(`${f.padEnd(30)} ${p.length ? 'FAIL ' + p.join(',') : 'PASS'}`);
    if (!p.length) {
      console.log(`   bar=${r.barButtons} [${r.barLabels.join(' ')}]  stats=${r.stats.diagrams}d/${r.stats.nodes}n/${r.stats.edges}e/${r.stats.views}v`);
      console.log(`   search hits=${r.searchHits} marks=${r.searchMarks} groups=${(r.searchGroups || []).join('|')}  conceptResult=${r.conceptResultFound}`);
      console.log(`   quiz "${String(r.quizQuestion).slice(0, 58)}..." opts=${r.quizOptions} ${r.quizMeter} -> ${r.quizScoreAfter}`);
      console.log(`   review rows=${r.reviewRows} due=${r.reviewDueRows} store=${r.reviewStoreCount} wrongMarked=${r.wrongMarked}`);
      console.log(`   chips=${r.chips.withChips}/${r.chips.testedNodes} of ${r.chips.covered} covered nodes [${r.chips.chipLabels.join(' / ')}]`);
      console.log(`   mastery indicator=${r.masteryIndicator} passport=${r.passportOpens}/${r.passportCloses} toggle stored=${r.masteryStored} on=${r.masteryOn} cleared=${r.masteryCleared} off=${r.masteryOff}`);
      console.log(`   present "${r.presentStep}" -> "${r.presentStepAfter}" steps=${r.presentSteps} dimmed=${r.dimmedAfterStep}/${r.totalNodes}`);
    }
  }
} catch (e) {
  exitCode = 1;
  console.log('PROBE_ERROR ' + String(e && e.message || e).slice(0, 700));
} finally {
  try { ws && ws.close(); } catch { }
  chrome.kill();
}

console.log('-'.repeat(72));
console.log(exitCode ? 'problems found' : `kit passes on all ${files.length} sampled diagrams`);
process.exit(exitCode);
