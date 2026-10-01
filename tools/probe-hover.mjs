import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// Functional hover probe over the Chrome DevTools Protocol.
// Launches headless Chrome, opens each enhanced diagram, simulates node/edge
// hover + keyboard focus with real input, and asserts the hover card contents.

import { readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const DIR = ROOT;
const TMP = 'C:/Users/itsni/AppData/Local/Temp/opencode/probe2';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;

const HARNESS = `
(async function(){
  const out={};
  const card=document.getElementById('archify-hover-card');
  out.runtimeBooted=!!card;
  if(!card) return out;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const nodeEls=Array.from(document.querySelectorAll('[data-node-id]'));
  const hitEls=Array.from(document.querySelectorAll('.arch-hc-hit'));
  out.nodeTargets=nodeEls.length;
  out.edgeHitPaths=hitEls.length;
  out.nodeTitlesLeft=document.querySelectorAll('[data-node-id] > title').length;
  out.cardPointerEvents=getComputedStyle(card).pointerEvents;
  out.docScrollX=document.documentElement.scrollWidth-document.documentElement.clientWidth;
  const vw=document.documentElement.clientWidth, vh=document.documentElement.clientHeight;
  const box=el=>{const r=el.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width),h:Math.round(r.height),inView:r.top>=-2&&r.bottom<=vh+2&&r.left>=-2&&r.right<=vw+2};};
  const enter=el=>el.dispatchEvent(new MouseEvent('mouseenter',{bubbles:false,clientX:0,clientY:0,view:window}));
  const leave=el=>el.dispatchEvent(new MouseEvent('mouseleave',{bubbles:false,clientX:0,clientY:0,view:window}));
  const read=()=>({
    show:card.getAttribute('data-show'),
    aria:card.getAttribute('aria-hidden'),
    title:(card.querySelector('.arch-hc-t')||{}).textContent||'',
    kind:(card.querySelector('.arch-hc-k')||{}).textContent||'',
    meta:Array.from(card.querySelectorAll('.arch-hc-m')).map(n=>n.textContent),
    summary:(card.querySelector('.arch-hc-s')||{}).textContent||'',
    bullets:Array.from(card.querySelectorAll('.arch-hc-ul li')).map(n=>n.textContent),
    footer:(card.querySelector('.arch-hc-ft')||{}).textContent||'',
    accent:card.style.getPropertyValue('--hc-accent'),
    hasIcon:!!card.querySelector('.arch-hc-ic svg'),
    lines:card.getBoundingClientRect().height,
    w:card.getBoundingClientRect().width,
    fits:(()=>{const r=card.getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=vw+1&&r.bottom<=vh+1;})(),
  });

  // ---- every node target, sampled in a few batches ----
  const nodes=[];
  for(const el of nodeEls){
    const b=box(el);
    if(!b.w) continue;
    enter(el);
    await sleep(150);
    const c=read();
    nodes.push({title:c.title,kind:c.kind,bullets:c.bullets.length,summaryLen:(c.summary||'').length,fits:c.fits,icon:c.hasIcon,accent:c.accent,meta:c.meta.length,targetInView:b.inView});
    leave(el);
    await sleep(110);
  }
  out.nodes=nodes;
  out.nodeLeaveClears=read().show==='0';

  // ---- every edge hit path ----
  const edges=[];
  for(const el of hitEls){
    const b=box(el);
    enter(el);
    await sleep(150);
    const c=read();
    edges.push({title:c.title,kind:c.kind,summaryLen:(c.summary||'').length,fits:c.fits,icon:c.hasIcon,accent:c.accent,targetInView:b.inView});
    leave(el);
    await sleep(110);
  }
  out.edges=edges;
  out.edgeLeaveClears=read().show==='0';

  // ---- keyboard focus on a node ----
  const k=nodeEls.find(e=>box(e).w)||nodeEls[0];
  k.dispatchEvent(new FocusEvent('focus'));
  await sleep(200);
  out.focusShow=read().show;
  k.dispatchEvent(new FocusEvent('blur'));
  await sleep(160);
  out.focusBlurClears=read().show==='0';

  // ---- escape key ----
  k.dispatchEvent(new FocusEvent('focus'));
  await sleep(200);
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  out.escapeCloses=read().show==='0';

  return out;
})()
`;

const files = [
  'Spring_Boot_Roadmap', 'Spring_Boot_Startup', 'Spring_Boot_Layers', 'Spring_Boot_Request_Path',
  'Spring_Boot_Bean_Lifecycle', 'Spring_Boot_AOP_Proxy', 'Spring_Boot_Nplus1', 'Spring_Boot_Security_JWT',
  'Spring_Boot_AutoConfiguration', 'Spring_Boot_Transactions', 'Spring_Boot_Data_Model', 'Spring_Boot_Testing_Slices',
  'Spring_Boot_Config_Properties', 'Spring_Boot_Observability', 'Spring_Boot_Caching',
  'Spring_Boot_Messaging', 'Spring_Boot_Async_Scheduling', 'Spring_Boot_Deployment',
  'Spring_Boot_Migration_3', 'Spring_Boot_WebFlux', 'Spring_Boot_AntiPatterns',
];

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
for (const asset of ['sbkit.css', 'content-index.js', 'concepts.js', 'study-data.js', 'sbkit.js']) {
  writeFileSync(`${TMP}/${asset}`, readFileSync(`${DIR}/${asset}`, 'utf8'), 'utf8');
}

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
  // wait for the debugger endpoint
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
    const src = `${DIR}/${f}.html`;
    const local = `${TMP}/${f}.html`;
    writeFileSync(local, readFileSync(src, 'utf8'), 'utf8');
    const url = 'file:///' + local.replace(/\\/g, '/');

    await send('Page.navigate', { url }, sessionId);
    // wait for load
    for (let i = 0; i < 80; i++) {
      const r = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }, sessionId);
      if (r.result.value === 'complete') break;
      await sleep(150);
    }
    await sleep(500);

    const res = await send('Runtime.evaluate', {
      expression: HARNESS, awaitPromise: true, returnByValue: true, timeout: 180000,
    }, sessionId);
    if (res.exceptionDetails) throw new Error(f + ': ' + JSON.stringify(res.exceptionDetails).slice(0, 500));
    const r = res.result.value;

    const problems = [];
    if (!r.runtimeBooted) problems.push('no-runtime');
    if (r.nodeTargets < 5) problems.push(`few-node-targets=${r.nodeTargets}`);
    if (r.edgeHitPaths < 5) problems.push(`few-hit-paths=${r.edgeHitPaths}`);
    if (r.nodeTitlesLeft) problems.push(`node-titles=${r.nodeTitlesLeft}`);
    if (r.cardPointerEvents !== 'none') problems.push(`pointer-events=${r.cardPointerEvents}`);
    if (r.docScrollX > 0) problems.push(`h-scroll=${r.docScrollX}`);

    const nodes = r.nodes || [];
    const nodeNoBullets = nodes.filter(n => !n.bullets).length;
    const nodeNoSummary = nodes.filter(n => !n.summaryLen).length;
    const nodeNoIcon = nodes.filter(n => !n.icon).length;
    const nodeOff = nodes.filter(n => !n.fits).length;
    if (nodes.some(n => !n.title)) problems.push('node-no-title');
    if (nodeNoBullets) problems.push(`node-no-bullets=${nodeNoBullets}`);
    if (nodeNoSummary) problems.push(`node-no-summary=${nodeNoSummary}`);
    if (nodeNoIcon) problems.push(`node-no-icon=${nodeNoIcon}`);
    if (nodeOff) problems.push(`node-card-offscreen=${nodeOff}`);
    if (!r.nodeLeaveClears) problems.push('node-leave-sticks');

    const edges = r.edges || [];
    const edgeNoSummary = edges.filter(e => !e.summaryLen).length;
    const edgeNoTitle = edges.filter(e => !e.title).length;
    if (edgeNoTitle) problems.push(`edge-no-title=${edgeNoTitle}`);
    if (edgeNoSummary) problems.push(`edge-no-summary=${edgeNoSummary}`);
    if (edges.some(e => !e.icon)) problems.push('edge-no-icon');
    if (edges.some(e => !e.fits)) problems.push(`edge-card-offscreen`);
    if (!r.edgeLeaveClears) problems.push('edge-leave-sticks');
    if (r.focusShow !== '1') problems.push(`focus=${r.focusShow}`);
    if (!r.focusBlurClears) problems.push('blur-sticks');
    if (!r.escapeCloses) problems.push('escape-fails');

    if (problems.length) exitCode = 1;
    const sample = nodes[0] || {};
    const esample = edges[0] || {};
    console.log(
      `${f.padEnd(30)} ${problems.length ? 'FAIL ' + problems.join(',') : 'PASS'}` +
      `  nodes=${nodes.length} edges=${edges.length}` +
      `  card=${Math.round(sample.w || 0)}x${Math.round(sample.lines || 0)}` +
      `  accent=${sample.accent || '?'}`
    );
    console.log(`   node[0] "${sample.title}" <${sample.kind}> bullets=${sample.bullets} summary="${String(sample.summary || '').slice(0, 70)}..."`);
    console.log(`   edge[0] "${esample.title}" <${esample.kind}>`);
  }
} catch (e) {
  exitCode = 1;
  console.log('PROBE_ERROR ' + String(e && e.message || e).slice(0, 600));
} finally {
  try { ws && ws.close(); } catch { }
  chrome.kill();
}

console.log('-'.repeat(72));
console.log(exitCode ? 'problems found' : `all ${files.length} diagrams pass`);
process.exit(exitCode);
