import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9337;
const proc = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=C:/Users/itsni/AppData/Local/Temp/opencode/tools/cdp-code-viewer',
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--allow-file-access-from-files', 'about:blank',
], { stdio: 'ignore' });

process.on('exit', () => { try { proc.kill(); } catch {} });
await sleep(3500);

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const target = list.find((t) => t.type === 'page');

let id = 0;
const pending = new Map();
const logs = [];
const { WebSocket } = await import('node:worker_threads').then(() => ({ WebSocket: globalThis.WebSocket }));
const sock = new WebSocket(target.webSocketDebuggerUrl);

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

const BASE = pathToFileURL(join(ROOT, 'site') + '/').href;
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};

// ---- 1. assets -------------------------------------------------------------
await send('Page.navigate', { url: BASE + 'Spring_Boot_Nplus1.html' });
await sleep(5500);

let r = await evalJs(`({
  src: !!window.SB_SOURCE,
  files: Object.keys(window.SB_SOURCE?.files || {}).length,
  readme: !!window.SB_SOURCE?.files['README.md'],
  keysRelative: Object.keys(window.SB_SOURCE?.files || {}).every(k => !k.startsWith('bookstore/')),
  anchors: window.SB_SOURCE?.anchors?.length,
  outlines: Object.values(window.SB_SOURCE?.files || {}).filter(f => f.outline && f.outline.length).length
})`);
check('source mirror loaded', r.value?.src === true, JSON.stringify(r.value));
check('48 files mirrored', r.value?.files === 48, 'got ' + r.value?.files);
check('README mirrored', r.value?.readme === true);
check('keys are bookstore-relative', r.value?.keysRelative === true);
check('outline generated for most files', (r.value?.outlines || 0) >= 40, r.value?.outlines + ' of 48');

// ---- 2. every index link resolves (no raw-dump path left) ------------------
r = await evalJs(`(() => {
  const idx = window.SB_INDEX, F = window.SB_SOURCE.files, miss = [];
  Object.values(idx.diagrams).forEach(d => (d.code || []).forEach(c => {
    const k = c.path.replace(/^bookstore\\//, '');
    if (!F[k]) miss.push(c.path);
  }));
  (idx.code || []).forEach(c => {
    const k = c.path.replace(/^bookstore\\//, '');
    if (!F[k]) miss.push(c.path);
  });
  return { miss, total: new Set(Object.values(idx.diagrams).flatMap(d => (d.code || []).map(c => c.path))).size };
})()`);
check('every diagram code link resolves to a mirrored file', (r.value?.miss || []).length === 0,
  r.value?.total + ' paths, missing: ' + JSON.stringify(r.value?.miss));

// ---- 3. hover a node, click its code chip ---------------------------------
await evalJs(`(() => {
  const card = document.getElementById('archify-hover-card');
  card.dispatchEvent(new CustomEvent('sb:hover', { detail: { kind: 'n', key: 'service' } }));
  return true;
})()`);
await sleep(700);

r = await evalJs(`(() => {
  const card = document.getElementById('archify-hover-card');
  const btns = [...(card?.querySelectorAll('button') || [])];
  const code = btns.find(b => /^code:/i.test(b.textContent.trim()));
  if (!code) return { err: 'no code chip', all: btns.map(b => b.textContent.trim()).slice(0, 20) };
  code.click();
  return { label: code.textContent.trim() };
})()`);
await sleep(900);

r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  const fcard = root.querySelector('.sb-fcard');
  const rows = root.querySelectorAll('.sb-file .sb-cl');
  const marked = root.querySelectorAll('.sb-cl-marked');
  const notes = root.querySelectorAll('.sb-cnote');
  const chips = root.querySelectorAll('.sb-ochip');
  return {
    view: root.getAttribute('data-sb-view'),
    loc: location.pathname.split('/').pop(),
    role: fcard?.querySelector('.sb-role')?.textContent,
    fname: fcard?.querySelector('.sb-fname')?.textContent,
    fpath: fcard?.querySelector('.sb-fpath')?.textContent,
    fsum: fcard?.querySelector('.sb-fsum')?.textContent,
    rows: rows.length, marked: marked.length, notes: notes.length, chips: chips.length
  };
})()`);
check('code chip opens the source viewer', r.value?.view === 'source', 'view=' + r.value?.view);
check('stayed on the diagram page (no raw-file navigation)', r.value?.loc === 'Spring_Boot_Nplus1.html', r.value?.loc);
check('file header card rendered', !!r.value?.role && !!r.value?.fname, `${r.value?.role} / ${r.value?.fname}`);
check('header shows the readable path', /^src\/main\/java/.test(r.value?.fpath || ''), r.value?.fpath);
check('header shows a summary', (r.value?.fsum || '').length > 10, r.value?.fsum);
check('whole file rendered, not a snippet', (r.value?.rows || 0) >= 50, r.value?.rows + ' rows');
check('marked lines highlighted', (r.value?.marked || 0) >= 5, r.value?.marked + ' marked');
check('inline explanations beside the lines', (r.value?.notes || 0) >= 5, r.value?.notes + ' notes');
check('structure outline rendered', (r.value?.chips || 0) >= 5, r.value?.chips + ' chips');

// ---- 4. outline chip jumps to a line --------------------------------------
r = await evalJs(`(() => {
  const chips = [...document.querySelectorAll('#sbkit .sb-ochip')];
  const target = chips.find(c => /placeOrder/.test(c.textContent)) || chips[3];
  if (!target) return { err: 'no chip' };
  const line = target.textContent.match(/^\\s*(\\d+)/)?.[1] || target.querySelector('.sb-oln')?.textContent;
  target.click();
  return { line: Number(line) };
})()`);
await sleep(700);
r = await evalJs(`(() => {
  const flashed = document.querySelector('#sbkit .sb-cl-flash');
  return { line: flashed?.getAttribute('data-line'), has: !!flashed };
})()`);
check('outline chip jumps and flashes the line', r.value?.has === true, 'line ' + r.value?.line);

// ---- 5. non-Java files open in the same viewer ----------------------------
const openFile = async (path) => {
  await evalJs(`window.SBKit.openSource(${JSON.stringify(path)})`);
  await sleep(700);
  return evalJs(`(() => {
    const root = document.getElementById('sbkit');
    const f = root.querySelector('.sb-fcard');
    return {
      view: root.getAttribute('data-sb-view'),
      role: f?.querySelector('.sb-role')?.textContent,
      chips: root.querySelectorAll('.sb-ochip').length,
      rows: root.querySelectorAll('.sb-file .sb-cl').length,
      highlight: root.querySelectorAll('.sb-file .sb-cd i').length,
      rawHref: root.querySelectorAll('a[href]').length
    };
  })()`);
};

r = await openFile('src/main/resources/application.yml');
check('application.yml opens in the viewer', r.value?.view === 'source', JSON.stringify(r.value));
check('yaml identified and structured', r.value?.role === 'Config' && r.value?.chips > 10, `${r.value?.role}, ${r.value?.chips} keys`);

r = await openFile('src/main/resources/schema.sql');
check('schema.sql opens in the viewer', r.value?.view === 'source', JSON.stringify(r.value));
check('sql identified and structured', r.value?.role === 'Schema' && r.value?.chips >= 12, `${r.value?.role}, ${r.value?.chips} statements`);

r = await openFile('README.md');
check('README opens in the viewer', r.value?.view === 'source', JSON.stringify(r.value));
check('README identified and structured', r.value?.role === 'Docs' && r.value?.chips > 10, `${r.value?.role}, ${r.value?.chips} headings`);

r = await openFile('src/main/java/com/example/bookstore/service/CatalogService.java');
check('java highlighting present', (r.value?.highlight || 0) > 10, r.value?.highlight + ' tokens');

// ---- 6. quiz citation lands on the cited lines ----------------------------
await evalJs(`(() => { window.SBKit.open('quiz'); return true; })()`);
await sleep(700);

let citation = null;
for (let i = 0; i < 12 && !citation; i++) {
  // answer the current question: the citation buttons only appear after an answer
  await evalJs(`(() => {
    const opt = document.querySelector('#sbkit .sb-opt');
    if (opt) opt.click();
    return !!opt;
  })()`);
  await sleep(160);
  const found = await evalJs(`(() => {
    const b = [...document.querySelectorAll('#sbkit button')].find(x => /^See .* lines \\d/.test(x.textContent.trim()));
    return b ? b.textContent.trim() : null;
  })()`);
  if (found.value) { citation = found.value; break; }
  // not this one - advance only after the check above
  await evalJs(`(() => {
    const b = [...document.querySelectorAll('#sbkit button')].find(x => x.textContent.trim() === 'Next');
    if (b) b.click();
    return !!b;
  })()`);
  await sleep(160);
}
check('reached a quiz question that cites source', !!citation, citation || 'none in 12 questions');

r = await evalJs(`(() => {
  const b = [...document.querySelectorAll('#sbkit button')].find(x => /^See .* lines \\d/.test(x.textContent.trim()));
  if (!b) return { err: 'no source citation on the current question' };
  b.click();
  return { label: b.textContent.trim() };
})()`);
await sleep(900);
r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  return {
    view: root.getAttribute('data-sb-view'),
    focus: root.querySelectorAll('.sb-cl-focus').length,
    rows: root.querySelectorAll('.sb-file .sb-cl').length
  };
})()`);
check('quiz citation opens the cited file', r.value?.view === 'source', 'view=' + r.value?.view);
check('quiz citation focuses the cited lines', (r.value?.focus || 0) > 0, r.value?.focus + ' focus lines of ' + r.value?.rows);

r = await evalJs(`(() => {
  const box = document.querySelector('#sbkit .sb-file');
  const row = document.querySelector('#sbkit .sb-cl-focus');
  if (!box || !row) return { err: 'missing box or focus row' };
  const boxTop = box.getBoundingClientRect().top;
  const rowTop = row.getBoundingClientRect().top;
  return {
    scrollTop: Math.round(box.scrollTop),
    inView: rowTop >= boxTop - 2 && rowTop <= boxTop + box.clientHeight,
    line: row.getAttribute('data-line'),
    flashed: !!document.querySelector('#sbkit .sb-cl-flash')
  };
})()`);
check('focused lines are scrolled into view', r.value?.inView === true, JSON.stringify(r.value));
check('cited line is flashed', r.value?.flashed === true, JSON.stringify(r.value));

// ---- 7. the code lab lists every file as an in-page link ------------------
await evalJs(`(() => { window.SBKit.open('info'); return true; })()`);
await sleep(800);

r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  const links = [...root.querySelectorAll('.sb-link')];
  const raw = links.filter(b => !b.querySelector('.sb-lk') && /\\.(java|yml|sql|md)$/.test(b.textContent.trim()));
  const readme = links.find(b => /README\\.md/.test(b.textContent));
  return { total: links.length, rawish: raw.map(b => b.textContent.trim()), readme: !!readme };
})()`);
check('code lab lists files as in-page links', (r.value?.total || 0) > 3, r.value?.total + ' links');
check('no code-lab link falls back to raw', (r.value?.rawish || []).length === 0, JSON.stringify(r.value?.rawish));

r = await evalJs(`(() => {
  const idx = window.SB_INDEX;
  const diagrams = Object.entries(idx.diagrams)
    .filter(([k, d]) => (d.code || []).some(c => /README\\.md$/.test(c.path)))
    .map(([k]) => k);
  return { diagrams, top: (idx.code || []).some(c => /README\\.md$/.test(c.path)), mirrored: !!window.SB_SOURCE.files['README.md'] };
})()`);
check('README is referenced by the index and mirrored',
  r.value?.mirrored === true && ((r.value?.diagrams || []).length > 0 || r.value?.top === true),
  JSON.stringify(r.value));

r = await evalJs(`(() => {
  const b = [...document.querySelectorAll('#sbkit button')].find(x => /Open the Book Store project/.test(x.textContent));
  if (!b) return { err: 'button not found' };
  b.click();
  return true;
})()`);
await sleep(900);
r = await evalJs(`(() => {
  const root = document.getElementById('sbkit');
  const f = root.querySelector('.sb-fcard');
  return { view: root.getAttribute('data-sb-view'), role: f?.querySelector('.sb-role')?.textContent, chips: root.querySelectorAll('.sb-ochip').length };
})()`);
check('project button opens the README in the viewer', r.value?.view === 'source' && r.value?.role === 'Docs', JSON.stringify(r.value));

// ---- 8. hub page still loads the assets -----------------------------------
await send('Page.navigate', { url: BASE + 'index.html' });
await sleep(4500);
r = await evalJs(`({ src: !!window.SB_SOURCE, files: Object.keys(window.SB_SOURCE?.files || {}).length, ev: !!window.SB_EVIDENCE })`);
check('hub loads the mirror and evidence', r.value?.src === true && r.value?.ev === true && r.value?.files === 48, JSON.stringify(r.value));

// ---- 9. no stray raw-file navigation anywhere -----------------------------
r = await evalJs(`(() => {
  const bad = [...document.querySelectorAll('#sbkit button')].filter(b => b.getAttribute('onclick'));
  return { inline: bad.length, loc: location.pathname.split('/').pop() };
})()`);
check('no inline raw-file handlers left in the panel', r.value?.inline === 0, JSON.stringify(r.value));

console.log('');
if (logs.length) { console.log('PAGE ERRORS:'); logs.slice(0, 14).forEach((l) => console.log('  ' + l)); }
else console.log('no page errors');

const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (logs.length) console.log(`${logs.length} page error(s)`);
sock.close();
proc.kill();
process.exit(failed.length || logs.length ? 1 : 0);
