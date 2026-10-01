import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9333;
const proc = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=C:/Users/itsni/AppData/Local/Temp/opencode/tools/cdp-code-lab',
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--allow-file-access-from-files', 'about:blank',
], { stdio: 'ignore' });

process.on('exit', () => { try { proc.kill(); } catch {} });
await sleep(3500);

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const target = list.find((t) => t.type === 'page');
let ws = target.webSocketDebuggerUrl;

let id = 0;
const pending = new Map();
const logs = [];
const sock = await (async () => {
  const { WebSocket } = await import('node:worker_threads').then(() => ({ WebSocket: globalThis.WebSocket }));
  return new WebSocket(ws);
})();

await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; });
sock.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    logs.push('console.error: ' + msg.params.args.map((a) => a.value || a.description || '').join(' '));
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    logs.push('EXCEPTION: ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
  }
};

const send = (method, params = {}) => new Promise((res) => {
  const mid = ++id;
  pending.set(mid, res);
  sock.send(JSON.stringify({ id: mid, method, params }));
});

const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text };
  return { value: r.result?.result?.value };
};

await send('Runtime.enable');
await send('Page.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.SB_TOUR_OFF = true' });

const BASE = pathToFileURL(ROOT + '/').href;
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};

// 1. Load the N+1 diagram, confirm assets loaded
await send('Page.navigate', { url: BASE + 'Spring_Boot_Nplus1.html' });
await sleep(5000);

let r = await evalJs(`({ src: !!window.SB_SOURCE, files: Object.keys(window.SB_SOURCE?.files||{}).length, anchors: window.SB_SOURCE?.anchors?.length, ev: !!window.SB_EVIDENCE, traces: Object.keys(window.SB_TRACES||{}) })`);
check('assets loaded on Nplus1', r.value?.src && r.value?.ev && r.value?.files > 0, JSON.stringify(r.value));

// 2. Open the kit and reach the code section
r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  if (!root) return { err: 'no #sbkit root' };
  const btn = [...root.querySelectorAll('button')].find(b => /book store|project|guide|info|code/i.test(b.textContent));
  return { buttons: [...root.querySelectorAll('button')].map(b=>b.textContent.trim()).slice(0,40) };
})()`);
check('kit root present', !!r.value && !r.value.err, JSON.stringify(r.value?.buttons || r.error || '').slice(0, 300));

// 4. Drive the hover card the way the enhancer does: dispatch sb:hover on the card.
const hoverNode = async (nid) => {
  await evalJs(`(() => {
    const card = document.getElementById('archify-hover-card');
    card.dispatchEvent(new CustomEvent('sb:hover', { detail: { kind: 'n', key: ${JSON.stringify(nid)} } }));
    return true;
  })()`);
  await sleep(700);
};

await hoverNode('service');
r = await evalJs(`(() => {
  const card = document.getElementById('archify-hover-card');
  const chips = card ? [...card.querySelectorAll('button')].map(b=>b.textContent.trim()) : [];
  return { chips };
})()`);
const hasWalk = (r.value?.chips || []).some((c) => /walkthrough/i.test(c));
const hasCode = (r.value?.chips || []).some((c) => /code:/i.test(c));
check('hover card shows a walkthrough chip', hasWalk, JSON.stringify(r.value?.chips || r.error));
check('hover card shows code chips', hasCode, '');

// 5. Click the walkthrough chip and inspect the trace view
r = await evalJs(`(() => {
  const card = document.getElementById('archify-hover-card');
  const b = [...card.querySelectorAll('button')].find(x=>/walkthrough/i.test(x.textContent));
  if (!b) return { err: 'no walkthrough chip' };
  b.click(); return true;
})()`);
await sleep(1200);
r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  const view = root.getAttribute('data-sb-view');
  const code = root.querySelector('.sb-code');
  const marked = root.querySelectorAll('.sb-cl-marked').length;
  const rows = root.querySelectorAll('.sb-cl').length;
  const h4 = root.querySelector('.sb-h4');
  const foot = [...root.querySelectorAll('.sb-foot button')].map(b=>b.textContent.trim());
  return { view, codeRows: rows, marked, heading: h4 && h4.textContent, foot, chips: (root.querySelector('.sb-chips')||{textContent:''}).textContent };
})()`);
check('trace view opened', r.value?.view === 'trace', JSON.stringify(r.value || r.error));
check('trace renders source with line numbers', (r.value?.codeRows || 0) > 0, `${r.value?.codeRows} rows, ${r.value?.marked} marked`);
check('trace step has a heading', !!r.value?.heading, r.value?.heading || '');
check('trace footer has Next', (r.value?.foot || []).includes('Next'), JSON.stringify(r.value?.foot));

// 6. Walk to the last step and confirm the takeaway appears
r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  window.__goto = (target) => {
    // restart if wrapped, then walk forward deterministically
    const restart = [...root.querySelectorAll('.sb-foot button')].find(x=>/Restart/.test(x.textContent));
    if (restart) restart.click();
    for (let i = 0; i < 30; i++) {
      const next = [...root.querySelectorAll('.sb-foot button')].find(x=>/Next/.test(x.textContent));
      if (!next) break;
      next.click();
      const h = root.querySelector('.sb-h4');
      const m = h && /step (\\d+) of/.exec(root.querySelector('.sb-head .sb-sub')?.textContent || '');
      if (m && Number(m[1]) - 1 === target) break;
    }
    return root.querySelector('.sb-h4')?.textContent;
  };
  const seen = [];
  for (let i = 0; i < 20; i++) {
    const next = [...root.querySelectorAll('.sb-foot button')].find(x=>/Next/.test(x.textContent));
    if (!next) break;
    seen.push(root.querySelector('.sb-h4')?.textContent);
    next.click();
  }
  const note = root.querySelector('.sb-note-key');
  return {
    stepsSeen: seen.length,
    lastHeading: root.querySelector('.sb-h4')?.textContent,
    hasTakeaway: !!note,
    takeaway: note && note.textContent.replace(/\\s+/g,' ').slice(0,110),
    foot: [...root.querySelectorAll('.sb-foot button')].map(b=>b.textContent.trim()),
  };
})()`);
check('trace walks to the final step', /Restart/.test(JSON.stringify(r.value?.foot)), `${r.value?.stepsSeen} steps from here, ended on "${r.value?.lastHeading}", footer ${JSON.stringify(r.value?.foot)}`);
check('trace ends on the takeaway', r.value?.hasTakeaway === true, r.value?.takeaway || '');

// 7. Evidence view: reach it through the Code lab view (keyboard 'c')
r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  const x = root.querySelector('.sb-head .sb-x'); if (x) x.click();
  return true;
})()`);
await sleep(500);
r = await evalJs(`(() => {
  const bar = [...document.querySelectorAll('#sbkit .sb-bar button')].map(b=>b.textContent.trim());
  return { bar };
})()`);
check('toolbar exposes Walk through and Code lab', (r.value?.bar || []).some((b) => /Walk through/i.test(b)) && (r.value?.bar || []).some((b) => /Code lab/i.test(b)), JSON.stringify(r.value?.bar || r.error));

r = await evalJs(`(() => {
  const b = [...document.querySelectorAll('#sbkit .sb-bar button')].find(x=>/Code lab/i.test(x.textContent));
  if (!b) return { err: 'no Code lab button' };
  b.click(); return true;
})()`);
await sleep(1000);
r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  const hits = [...root.querySelectorAll('.sb-hit .sb-link')].map(a=>a.textContent.trim());
  return { view: root.getAttribute('data-sb-view'), hits: hits.slice(0,6), total: hits.length, inpage: hits.filter(h=>/in page/.test(h)).length };
})()`);
check('code lab view lists mirrored files as in-page', (r.value?.inpage || 0) > 0, `${r.value?.inpage}/${r.value?.total} mirrored: ${JSON.stringify(r.value?.hits)}`);

r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  const b = [...root.querySelectorAll('button')].find(x=>/captured responses/i.test(x.textContent));
  if (!b) return { err: 'no evidence button' };
  b.click(); return true;
})()`);
await sleep(1000);
r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  const cells = [...root.querySelectorAll('.sb-ev-cell')].map(c=>c.textContent.trim().replace(/\\s+/g,' '));
  const cmd = [...root.querySelectorAll('.sb-ev-cmd')].map(c=>c.textContent.slice(0,40));
  return { view: root.getAttribute('data-sb-view'), cells, cmdCount: cmd.length, first: cmd[0] };
})()`);
check('evidence view opened', r.value?.view === 'evidence', JSON.stringify(r.value || r.error));
check('evidence shows the 18 vs 1 comparison', JSON.stringify(r.value?.cells || '').includes('18') && JSON.stringify(r.value?.cells || '').includes('queries, join fetch'), JSON.stringify(r.value?.cells));
check('evidence offers the curl command', (r.value?.cmdCount || 0) > 0, r.value?.first || '');

// 8. Source viewer: open a mirrored file, check highlighting and backlinks
r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  const x = root.querySelector('.sb-head .sb-x'); if (x) x.click();
  const b = [...document.querySelectorAll('#sbkit .sb-bar button')].find(x=>/Code lab/i.test(x.textContent));
  b.click();
  return true;
})()`);
await sleep(900);
r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  const link = [...root.querySelectorAll('.sb-hit .sb-link')].find(a=>/CatalogService\\.java/.test(a.textContent));
  if (!link) return { err: 'no CatalogService row' };
  link.click(); return true;
})()`);
await sleep(900);
r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  const kw = root.querySelectorAll('.sb-kw').length;
  const ann = root.querySelectorAll('.sb-an').length;
  const rows = root.querySelectorAll('.sb-cl').length;
  const marked = root.querySelectorAll('.sb-cl-marked').length;
  const nums = [...root.querySelectorAll('.sb-cn')].slice(0,3).map(n=>n.textContent);
  const sects = [...root.querySelectorAll('.sb-sect h3')].map(h=>h.textContent);
  const backlinks = [...root.querySelectorAll('.sb-hit .sb-link')].map(a=>a.textContent.trim());
  return { view: root.getAttribute('data-sb-view'), kw, ann, rows, marked, nums, sects, backlinks: backlinks.slice(0,8) };
})()`);
check('source viewer opened', r.value?.view === 'source', JSON.stringify(r.value || r.error));
check('source viewer highlights Java syntax', (r.value?.kw || 0) > 0 && (r.value?.ann || 0) > 0, `${r.value?.kw} keywords, ${r.value?.ann} annotations`);
check('source viewer marks the load-bearing lines', (r.value?.marked || 0) > 0, `${r.value?.rows} rows shown, ${r.value?.marked} marked, first line ${r.value?.nums?.[0]}`);
check('source viewer lists marked regions and backlinks', JSON.stringify(r.value?.sects || '').includes('Explained lines') && JSON.stringify(r.value?.sects || '').includes('Implements'), JSON.stringify(r.value?.sects));

// 9. Transactions diagram: check bypassed-methods evidence renders
await send('Page.navigate', { url: BASE + 'Spring_Boot_Transactions.html' });
await sleep(5000);
await hoverNode('inner');
r = await evalJs(`(() => {
  const card = document.getElementById('archify-hover-card');
  const chips = [...card.querySelectorAll('button')].map(b=>b.textContent.trim());
  return { chips };
})()`);
check('transactions node offers a walkthrough', (r.value?.chips || []).some((c) => /walkthrough/i.test(c)), JSON.stringify(r.value?.chips));

r = await evalJs(`(() => {
  const card = document.getElementById('archify-hover-card');
  const b = [...card.querySelectorAll('button')].find(x=>/walkthrough/i.test(x.textContent));
  if (!b) return { err: 'none' };
  b.click(); return true;
})()`);
await sleep(1200);
r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  const goto = (target) => {
    const restart = [...root.querySelectorAll('.sb-foot button')].find(x=>/Restart/.test(x.textContent));
    if (restart) restart.click();
    for (let i = 0; i < 30; i++) {
      const sub = root.querySelector('.sb-head .sb-sub')?.textContent || '';
      const m = /step (\\d+) of/.exec(sub);
      if (m && Number(m[1]) - 1 === target) return root.querySelector('.sb-h4')?.textContent;
      const next = [...root.querySelectorAll('.sb-foot button')].find(x=>/Next/.test(x.textContent));
      if (!next) break;
      next.click();
    }
    return root.querySelector('.sb-h4')?.textContent;
  };
  // step 2 is "a call that does not" - the self-invocation with the bypassed method
  const heading = goto(2);
  const ev = root.querySelector('.sb-ev');
  const notes = [...root.querySelectorAll('.sb-note')].map(n=>n.textContent.replace(/\\s+/g,' ').slice(0,150));
  return { view: root.getAttribute('data-sb-view'), heading, ev: ev && ev.textContent.replace(/\\s+/g,' ').slice(0,220), notes };
})()`);
check('transaction trace shows the required-mode report', /advisedMethods/.test(r.value?.ev || '') && /bypassedMethods/.test(r.value?.ev || ''), (r.value?.heading || '') + ' :: ' + (r.value?.ev || r.error || '').slice(0, 170));
check('transaction trace explains the bypass', JSON.stringify(r.value?.notes || '').toLowerCase().includes('did not cross a proxy'), JSON.stringify(r.value?.notes).slice(0, 230));

// 10. Quiz items cite the walkthrough, the evidence and the source lines.
// Quiz progress persists in localStorage, so clear it or the pool starts mid-way.
await send('Page.navigate', { url: BASE + 'Spring_Boot_Nplus1.html' });
await sleep(4000);
await evalJs(`(() => { Object.keys(localStorage).filter(k=>/quiz/.test(k)).forEach(k=>localStorage.removeItem(k)); return true; })()`);
await send('Page.reload');
await sleep(4500);
r = await evalJs(`(() => {
  const b = [...document.querySelectorAll('#sbkit .sb-bar button')].find(x=>/^Quiz/.test(x.textContent.trim()));
  b.click();
  return true;
})()`);
await sleep(1000);

const walkQuiz = `(() => {
  const root = document.getElementById('sbkit');
  for (let i = 0; i < 24; i++) {
    // answer first: the citation row is only rendered after an answer is chosen
    const opt = root.querySelector('.sb-opt');
    if (opt) opt.click();
    const jump = [...root.querySelectorAll('.sb-row button')];
    if (jump.some(x=>/Walk through:/.test(x.textContent))) {
      return {
        question: root.querySelector('.sb-q')?.textContent.slice(0, 80),
        buttons: jump.map(x=>x.textContent.trim()),
      };
    }
    const next = [...root.querySelectorAll('.sb-foot button')].find(x=>x.textContent.trim()==='Next');
    if (!next) break;
    next.click();
  }
  return { err: 'no citing question found' };
})()`;

r = await evalJs(walkQuiz);
check('a quiz question cites the walkthrough', !!(r.value?.buttons || []).some((b) => /Walk through:/.test(b)), JSON.stringify(r.value?.buttons || r.error));
check('a quiz question cites the captured evidence', !!(r.value?.buttons || []).some((b) => /captured response/.test(b)), r.value?.question || '');
check('a quiz question cites source lines', !!(r.value?.buttons || []).some((b) => /See \w+\.java lines/.test(b)), JSON.stringify(r.value?.buttons));

// the cited buttons must actually navigate
r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  const b = [...root.querySelectorAll('.sb-row button')].find(x=>/Walk through:/.test(x.textContent));
  if (!b) return { err: 'none' };
  b.click();
  return { label: b.textContent.trim() };
})()`);
await sleep(1000);
r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  return { view: root.getAttribute('data-sb-view'), heading: root.querySelector('.sb-h4')?.textContent, rows: root.querySelectorAll('.sb-cl').length };
})()`);
check('quiz citation opens the cited step', r.value?.view === 'trace' && (r.value?.rows || 0) > 0, `${r.value?.heading} (${r.value?.rows} code rows)`);

// the source citation needs its own pass: opening the trace replaced the quiz panel
await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  const x = root.querySelector('.sb-head .sb-x'); if (x) x.click();
  Object.keys(localStorage).filter(k=>/quiz/.test(k)).forEach(k=>localStorage.removeItem(k));
  return true;
})()`);
await send('Page.reload');
await sleep(4500);
r = await evalJs(`(() => {
  [...document.querySelectorAll('#sbkit .sb-bar button')].find(x=>/^Quiz/.test(x.textContent.trim())).click();
  return true;
})()`);
await sleep(900);
r = await evalJs(walkQuiz);
check('found a question with a source citation', !!(r.value?.buttons || []).some((b) => /See \w+\.java lines/.test(b)), JSON.stringify(r.value?.buttons || r.error));
r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  const b = [...root.querySelectorAll('.sb-row button')].find(x=>/See \\w+\\.java lines/.test(x.textContent));
  if (!b) return { err: 'no source citation on the current question' };
  b.click();
  return { label: b.textContent.trim() };
})()`);
await sleep(900);
r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  return { view: root.getAttribute('data-sb-view'), rows: root.querySelectorAll('.sb-cl').length, marked: root.querySelectorAll('.sb-cl-marked').length, note: root.querySelector('.sb-note')?.textContent.slice(0,80) };
})()`);
check('quiz citation opens the cited source lines', r.value?.view === 'source' && (r.value?.rows || 0) > 0, `${r.value?.rows} rows, ${r.value?.marked} marked, note: ${r.value?.note || 'none'}`);

// 11. hub page still fine and loads the new assets
await send('Page.navigate', { url: BASE + 'index.html' });
await sleep(4000);
r = await evalJs(`({ src: !!window.SB_SOURCE, ev: !!window.SB_EVIDENCE, quizItems: (window.SB_STUDY?.quiz||[]).length, citing: (window.SB_STUDY?.quiz||[]).filter(q=>q.t||q.ev||q.p).length })`);
check('hub loads the code lab assets', r.value?.src === true && r.value?.ev === true, JSON.stringify(r.value));
check('quiz items carry citations', r.value?.citing === 7, `${r.value?.citing} citing items of ${r.value?.quizItems}`);

console.log('');
if (logs.length) { console.log('PAGE ERRORS:'); logs.slice(0, 12).forEach((l) => console.log('  ' + l)); }
else console.log('no page errors');

const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (logs.length) console.log(`${logs.length} page error(s)`);
sock.close();
proc.kill();
process.exit(failed.length ? 1 : 0);
