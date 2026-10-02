import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// Functional probe for the first-visit tour (tour.js) over CDP.
// Walks the hub, a diagram and the guide: auto-start, spotlight hole, step
// keys, skip + persistence, the Tour button, and both opt-outs (? and flag).

import { rmSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const DIR = join(ROOT, 'site');
const TMP = 'C:/Users/itsni/AppData/Local/Temp/opencode/probetour';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9351;

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--window-size=1500,1000', `--remote-debugging-port=${PORT}`, `--user-data-dir=${TMP}/profile`, 'about:blank'], { stdio: 'ignore' });

let ws, msgId = 0;
const pending = new Map();
const send = (m, p = {}, s) => { const id = ++msgId; return new Promise((res, rej) => { pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify(s ? { id, method: m, params: p, sessionId: s } : { id, method: m, params: p })); }); };
const errs = [];
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};

const LIVE = `
(() => {
  const t = window.SBTour;
  const r = document.getElementById('sbtour');
  const b = document.getElementById('sbtour-btn');
  const eye = r && r.querySelector('.sbtour-eye');
  const hole = r && r.querySelector('.sbtour-hole');
  const card = r && r.querySelector('.sbtour-card');
  const cs = r ? getComputedStyle(r) : null;
  return {
    api: !!t,
    key: t ? t.key() : null,
    active: t ? t.active() : false,
    steps: t ? t.steps().length : 0,
    seen: t ? t.seen(t.key()) : null,
    rootHidden: r ? r.hidden : null,
    opacity: cs ? cs.opacity : null,
    z: cs ? cs.zIndex : null,
    eye: eye ? eye.textContent : '',
    title: (r && r.querySelector('.sbtour-title') || {}).textContent || '',
    nextLabel: (r && r.querySelector('.sbtour-next') || {}).textContent || '',
    backHidden: r ? r.querySelector('.sbtour-back').hidden : null,
    dots: r ? r.querySelectorAll('.sbtour-dots i').length : 0,
    dotOn: r ? r.querySelectorAll('.sbtour-dots i[data-on]').length : 0,
    cardW: card ? card.offsetWidth : 0,
    shadow: hole ? getComputedStyle(hole).boxShadow : '',
    btn: !!b,
    btnInHeader: !!(b && b.closest('header.top')),
    btnInBar: !!(b && b.closest('.sb-bar')),
    btnBeforeHub: !!(b && b.nextElementSibling && /^Hub/.test(b.nextElementSibling.textContent.trim())),
    btnInNav: !!(b && b.closest('#nav')),
    scrollX: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };
})()`;

const rectOf = (s) => `(() => {
  const h = document.querySelector('#sbtour .sbtour-hole');
  const t = document.querySelector(${JSON.stringify(s)});
  if (!h || !t) return null;
  const a = h.getBoundingClientRect(), b = t.getBoundingClientRect();
  return { dL: Math.abs(a.left - (b.left - 8)), dT: Math.abs(a.top - (b.top - 8)),
           dW: Math.abs(a.width - (b.width + 16)), dH: Math.abs(a.height - (b.height + 16)) };
})()`;

let wsOpen = false;
try {
  for (let i = 0; i < 60 && !wsOpen; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
      if (list.webSocketDebuggerUrl) wsOpen = true;
    } catch { }
    if (!wsOpen) await sleep(250);
  }
  const version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
  ws = new WebSocket(version.webSocketDebuggerUrl);
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
  await send('Runtime.enable', {}, sessionId);
  await send('Log.enable', {}, sessionId);

  const go = async (file, hash) => {
    const url = 'file:///' + `${DIR}/${file}`.replace(/\\/g, '/') + (hash || '');
    await send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 80; i++) { const r = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }, sessionId); if (r.result.value === 'complete') break; await sleep(150); }
  };
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: 60000 }, sessionId);
    if (r.exceptionDetails) { errs.push('EVAL ' + JSON.stringify(r.exceptionDetails).slice(0, 400)); return null; }
    return r.result.value;
  };
  const key = async (k, code, vk) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }, sessionId);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }, sessionId);
    await sleep(220);
  };
  const waitLive = async (want, ms = 4000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const v = await ev('!window.SB_TOUR_OFF && !!window.SBTour && window.SBTour.active()');
      if (v === want) { if (want) await sleep(400); return true; }
      await sleep(120);
    }
    return false;
  };
  const click = async (sel) => { await ev(`document.querySelector(${JSON.stringify(sel)}).click()`); await sleep(520); };

  /* ---------------------------------------------------------- hub, first visit */
  await go('index.html');
  check('hub: tour starts on a first visit', await waitLive(true), 'waited 4s');
  let s = await ev(LIVE);
  check('hub: engine reports hub / 7 steps', !!s && s.key === 'hub' && s.steps === 7, JSON.stringify({ key: s && s.key, steps: s && s.steps }));
  check('hub: card is on screen, step 01 of 07', !!s && s.rootHidden === false && s.eye === 'Step 01 / 07', (s && s.eye) || '');
  check('hub: card fades in at full opacity', !!s && s.opacity === '1', (s && s.opacity) || '');
  check('hub: spotlight sits above every layer', !!s && s.z === '2147483200', (s && s.z) || '');
  check('hub: spotlight is a dim, not a fill', !!s && /rgba/.test(s.shadow) && /9999px/.test(s.shadow), (s && s.shadow || '').slice(0, 64));
  check('hub: progress dots for every step', !!s && s.dots === 7 && s.dotOn === 1, `${s && s.dotOn}/${s && s.dots}`);
  check('hub: first CTA reads Start', !!s && s.nextLabel === 'Start', s && s.nextLabel);
  check('hub: Tour button lives in the header, not the tabs', !!s && s.btn && s.btnInHeader && !s.btnInNav, JSON.stringify({ btn: s && s.btn, header: s && s.btnInHeader }));
  check('hub: no horizontal overflow while touring', !!s && s.scrollX <= 0, 'scrollX=' + (s && s.scrollX));

  await click('#sbtour .sbtour-next');
  s = await ev(LIVE);
  check('hub: Next advances to step 02', !!s && s.eye === 'Step 02 / 07' && s.backHidden === false, (s && s.eye) || '');
  let d = await ev(rectOf('#nav'));
  check('hub: spotlight frames the tab row', !!d && d.dL < 14 && d.dT < 14 && d.dW < 14 && d.dH < 14, JSON.stringify(d));
  check('hub: step 02 is about the tabs', !!s && /Six tabs/.test(s.title), s && s.title);
  const box = await ev(`(() => {
    const c = document.querySelector('#sbtour .sbtour-card').getBoundingClientRect();
    const h = document.querySelector('#sbtour .sbtour-hole').getBoundingClientRect();
    return { vw: innerWidth, vh: innerHeight, l: Math.round(c.left), t: Math.round(c.top),
             r: Math.round(c.right), b: Math.round(c.bottom),
             overlap: !(c.right <= h.left || c.left >= h.right || c.bottom <= h.top || c.top >= h.bottom) };
  })()`);
  check('hub: card fits inside the window', !!box && box.l >= 0 && box.t >= 0 && box.r <= box.vw && box.b <= box.vh, JSON.stringify(box));
  check('hub: card never covers what it points at', !!box && box.overlap === false, 'overlap=' + (box && box.overlap));

  await key('ArrowRight', 'ArrowRight', 39);
  s = await ev(LIVE);
  check('hub: ArrowRight steps forward', !!s && s.eye === 'Step 03 / 07', (s && s.eye) || '');
  await key('ArrowLeft', 'ArrowLeft', 37);
  s = await ev(LIVE);
  check('hub: ArrowLeft steps back', !!s && s.eye === 'Step 02 / 07', (s && s.eye) || '');
  await click('#sbtour .sbtour-back');
  s = await ev(LIVE);
  check('hub: Back hides on the first step', !!s && s.eye === 'Step 01 / 07' && s.backHidden === true, (s && s.eye) || '');

  await click('#sbtour .sbtour-skip');
  s = await ev(LIVE);
  check('hub: Skip closes the tour', !!s && s.active === false && s.rootHidden === true, JSON.stringify({ active: s && s.active, hidden: s && s.rootHidden }));
  check('hub: Skip remembers this page was seen', !!s && s.seen === true, 'seen=' + (s && s.seen));

  await go('index.html');
  await sleep(1900);
  s = await ev(LIVE);
  check('hub: it does not start again on the next visit', !!s && s.active === false, 'active=' + (s && s.active));
  await key('u', 'KeyU', 85);
  s = await ev(LIVE);
  check('hub: U brings the tour back', !!s && s.active === true, 'active=' + (s && s.active));
  await key('Escape', 'Escape', 27);
  s = await ev(LIVE);
  check('hub: Escape closes it', !!s && s.active === false, 'active=' + (s && s.active));

  /* ---------------------------------------------------- a diagram, first visit */
  await go('Spring_Boot_Data_Model.html');
  check('diagram: tour starts on a first visit', await waitLive(true), 'waited 4s');
  s = await ev(LIVE);
  check('diagram: engine reports this page / 7 steps', !!s && s.key === 'diagram:Spring_Boot_Data_Model' && s.steps === 7, JSON.stringify({ key: s && s.key, steps: s && s.steps }));
  check('diagram: Tour button sits in the toolbar before Hub', !!s && s.btnInBar && s.btnBeforeHub, JSON.stringify({ bar: s && s.btnInBar, beforeHub: s && s.btnBeforeHub }));
  check('diagram: step 01 of 07', !!s && s.eye === 'Step 01 / 07', (s && s.eye) || '');

  await click('#sbtour .sbtour-next');
  d = await ev(rectOf('.diagram-container'));
  check('diagram: spotlight frames the diagram', !!d && d.dL < 14 && d.dT < 14 && d.dW < 14 && d.dH < 14, JSON.stringify(d));
  s = await ev(LIVE);
  check('diagram: step 02 explains the diagram', !!s && /diagram itself/.test(s.title), s && s.title);
  await key('Escape', 'Escape', 27);
  s = await ev(LIVE);
  check('diagram: Escape marks the page as seen', !!s && s.active === false && s.seen === true, JSON.stringify({ active: s && s.active, seen: s && s.seen }));

  /* ------------------------------------------------------------ the guide */
  await go('guide.html');
  check('guide: tour starts on a first visit', await waitLive(true), 'waited 4s');
  s = await ev(LIVE);
  check('guide: engine reports guide / 6 steps', !!s && s.key === 'guide' && s.steps === 6, JSON.stringify({ key: s && s.key, steps: s && s.steps }));
  check('guide: Tour button sits in the header', !!s && s.btnInHeader, 'header=' + (s && s.btnInHeader));
  check('guide: step 01 of 06', !!s && s.eye === 'Step 01 / 06', (s && s.eye) || '');
  await key('Escape', 'Escape', 27);

  /* ------------------------------------------------- the two opt-outs */
  await go('Spring_Boot_Caching.html', '#node=db');
  await sleep(1900);
  s = await ev(LIVE);
  check('deep link: a hash keeps the tour quiet', !!s && s.active === false, 'active=' + (s && s.active));

  await go('Spring_Boot_Async_Scheduling.html?tour=1');
  check('?tour=1 forces the tour', await waitLive(true), 'waited 4s');
  await key('Escape', 'Escape', 27);

  await go('Spring_Boot_WebFlux.html?tour=0');
  await sleep(1900);
  s = await ev(LIVE);
  check('?tour=0 keeps the tour quiet', !!s && s.active === false, 'active=' + (s && s.active));

  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.SB_TOUR_OFF = true' }, sessionId);
  await go('Spring_Boot_Layers.html');
  await sleep(1900);
  s = await ev(LIVE);
  check('SB_TOUR_OFF: no auto-start', !!s && s.active === false, 'active=' + (s && s.active));
  await ev('window.SBTour && window.SBTour.start()');
  await sleep(300);
  s = await ev(LIVE);
  check('SB_TOUR_OFF: start() is a no-op', !!s && s.active === false, 'active=' + (s && s.active));
} catch (e) {
  results.push({ name: 'probe crashed', ok: false });
  console.log('FAIL  probe crashed  ' + String(e && e.message || e).slice(0, 500));
} finally {
  try { ws && ws.close(); } catch { }
  chrome.kill();
}

if (errs.length) {
  check('no page errors', false, errs.slice(0, 6).join(' | '));
} else {
  check('no page errors', true);
}

const passed = results.filter(r => r.ok).length;
console.log('-'.repeat(72));
console.log(`${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
