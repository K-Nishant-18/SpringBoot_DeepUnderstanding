import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
﻿import { readFileSync, existsSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const DIR = ROOT;
const load = (file, globalName) => {
  const ctx = { window: {} };
  createContext(ctx);
  runInContext(readFileSync(`${DIR}/${file}`, 'utf8'), ctx);
  return ctx.window[globalName];
};
const IDX = load('content-index.js', 'SB_INDEX');
const C = load('concepts.js', 'SB_CONCEPTS');
const problems = [];
const note = (m) => problems.push(m);

const KEYS = Object.keys(IDX.diagrams);
const MARKERS = [
  ['archify-hover-style', 1],
  ['id="archify-hover-detail-data"', 1],
  ['id="archify-hover-detail-runtime"', 1],
  ['id="archify-hover-card"', 1],
  ['sb:hover', 2],
  ['<link rel="stylesheet" href="sbkit.css">', 1],
  ['src="sbkit.js"', 1],
  ['src="concepts.js"', 1],
  ['src="content-index.js"', 1],
  ['src="study-data.js"', 1],
];
let links = 0;
let nodes = 0;
let edges = 0;

const countOf = (hay, needle) => hay.split(needle).length - 1;

for (const key of KEYS) {
  const d = IDX.diagrams[key];
  const file = `${DIR}/${d.file}`;
  if (!existsSync(file)) { note(`${key}: diagram file missing`); continue; }
  const html = readFileSync(file, 'utf8');

  for (const [marker, want] of MARKERS) {
    const got = countOf(html, marker);
    if (got !== want) note(`${key}: "${marker}" found ${got}x, expected ${want}x`);
  }
  if (countOf(html, '<svg') !== 1) note(`${key}: expected exactly one <svg`);

  const nodeIds = new Set(d.nodes.map((n) => n.id));
  for (const n of d.nodes) {
    nodes++;
    if (countOf(html, `data-node-id="${n.id}"`) !== 1) {
      note(`${key}: node ${n.id} appears ${countOf(html, `data-node-id="${n.id}"`)}x in the diagram`);
    }
  }
  for (const e of d.edges) {
    edges++;
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) note(`${key}: edge ${e.i} ${e.from}->${e.to} references an unknown node`);
  }
  for (const v of d.views) {
    for (const f of v.focus) if (!nodeIds.has(f)) note(`${key}: view ${v.id} focuses unknown node ${f}`);
  }
  for (const c of d.code) {
    links++;
    if (!nodeIds.has(c.node)) note(`${key}: code link targets unknown node ${c.node}`);
    if (!existsSync(`${DIR}/${c.path.replace(/\//g, '\\')}`)) note(`${key}: code file missing ${c.path}`);
  }
}

let refs = 0;
for (const slug of Object.keys(C)) {
  for (const [dKey, node, noteText] of C[slug].refs) {
    refs++;
    const d = IDX.diagrams[dKey];
    if (!d) { note(`concept ${slug}: unknown diagram ${dKey}`); continue; }
    if (!d.nodes.some((n) => n.id === node)) note(`concept ${slug}: unknown node ${dKey}/${node}`);
    if (!noteText) note(`concept ${slug}: empty note for ${dKey}/${node}`);
  }
}

const hub = readFileSync(`${DIR}/index.html`, 'utf8');
for (const s of ['sbkit.css', 'sbkit.js', 'concepts.js', 'content-index.js', 'study-data.js', 'hub.js']) {
  if (!hub.includes(s)) note(`index.html: ${s} not referenced`);
}
for (const pane of ['home-cards', 'tracks', 'library', 'practice', 'conceptlist', 'progress']) {
  if (!hub.includes(`id="${pane}"`)) note(`index.html: pane host #${pane} missing`);
}
const hubjs = readFileSync(`${DIR}/hub.js`, 'utf8');
if (!/k \+ '\.html'/.test(hubjs)) note('hub.js: does not build diagram links from the index');
const covered = IDX.tracks.reduce((n, t) => n + t.diagrams.length, 0);
if (covered !== KEYS.length) note(`track membership covers ${covered} of ${KEYS.length} diagrams`);
const seen = new Set();
for (const t of IDX.tracks) for (const k of t.diagrams) {
  if (!IDX.diagrams[k]) note(`track ${t.id}: unknown diagram key ${k}`);
  if (seen.has(k)) note(`diagram ${k} is listed in more than one track`);
  seen.add(k);
}
for (const k of KEYS) if (!seen.has(k)) note(`diagram ${k} is not in any track`);
for (const p of ['bookstore/README.md', 'bookstore/run.cmd', 'bookstore/test.cmd', 'bookstore/pom.xml']) {
  if (!existsSync(`${DIR}/${p}`)) note(`${p} missing`);
}
if (existsSync(`${DIR}/bookstore/.stubs`)) note('the removed .stubs tree is back');
for (const gone of ['bookstore/verify.cmd', 'bookstore/verify.ps1']) {
  if (existsSync(`${DIR}/${gone}`)) note(`${gone} should have been removed with the stub harness`);
}
const readme = readFileSync(`${DIR}/bookstore/README.md`, 'utf8');
for (const claim of ['verify.cmd', '.stubs']) {
  if (new RegExp('`' + claim + '`').test(readme.replace(/^.*`verify\.cmd` and the `verify\.\*` scripts.*$/gm, ''))) {
    const remaining = readme.split('\n').filter((l) => l.includes(claim) && !l.includes('removed') && !l.includes('no longer') && !l.includes('used to ship'));
    if (remaining.length) note(`README still advertises ${claim} in ${remaining.length} place(s)`);
  }
}

/* The Hinglish guide is hand-written prose full of links into the rest of the
 * resource, so it gets resolved the same way diagram links are - including the
 * fragments, because index.html addresses its panes by data-pane rather than id. */
const guideFile = `${DIR}/guide.html`;
if (!existsSync(guideFile)) note('guide.html missing');
else {
  const gh = readFileSync(guideFile, 'utf8');
  for (const m of gh.matchAll(/href="([^"]+)"/g)) {
    const h = m[1];
    if (/^(https?:|mailto:)/.test(h)) continue;
    if (h.startsWith('#')) {
      if (h.length > 1 && !gh.includes(`id="${h.slice(1)}"`)) note(`guide.html: ${h} has no target`);
      continue;
    }
    const [file, frag] = [h.split('#')[0], h.split('#')[1]];
    if (!file) continue;
    if (!existsSync(`${DIR}/${file}`)) { note(`guide.html: link target missing ${file}`); continue; }
    if (frag) {
      const target = readFileSync(`${DIR}/${file}`, 'utf8');
      if (!target.includes(`id="${frag}"`) && !target.includes(`data-pane="${frag}"`)) {
        note(`guide.html: ${file} has no #${frag}`);
      }
    }
  }
}

/* The mirrored sources and the index are generated, so they can silently fall
 * behind the files they were built from. A link that still resolves but shows the
 * previous version of a file is the failure this catches: nothing else in the suite
 * notices, because every other check reads the stale copy as if it were current. */
let mirrored = 0;
let stale = 0;
const noteStale = (msg) => { stale++; note(msg); };
/* evidence.js declares two globals (SB_EVIDENCE and SB_TRACES), so the window is
 * returned whole rather than one name at a time. */
const loadGenerated = (file) => {
  if (!existsSync(`${DIR}/${file}`)) { note(`${file} missing - see the regeneration section of bookstore/README.md`); return null; }
  const ctx = { window: {} };
  createContext(ctx);
  try { runInContext(readFileSync(`${DIR}/${file}`, 'utf8'), ctx); }
  catch (e) { note(`${file} does not parse: ${e.message}`); return null; }
  return ctx.window;
};
const mirrorText = (path) => (SRC && SRC.files && SRC.files[path] ? SRC.files[path].text : undefined);

const SRCW = loadGenerated('code-source.js');
const SRC = SRCW && SRCW.SB_SOURCE;
if (SRC && SRC.files) {
  for (const key of Object.keys(SRC.files)) {
    const disk = `${DIR}/bookstore/${key}`;
    if (!existsSync(disk)) { noteStale(`code-source.js mirrors ${key}, which no longer exists`); continue; }
    mirrored++;
    if (SRC.files[key].text !== readFileSync(disk, 'utf8')) {
      noteStale(`code-source.js copy of ${key} is stale - run node tools/build-code-viewer.mjs`);
    }
  }
}
if (SRC && SRC.anchors) {
  for (const a of SRC.anchors) {
    const body = mirrorText(a.file);
    if (body === undefined) { noteStale(`anchor points at ${a.file}, which is not mirrored`); continue; }
    const window = body.split('\n').slice(a.from - 1, a.to).join('\n');
    if (!window.includes(a.pattern)) {
      noteStale(`anchor in ${a.file} lines ${a.from}-${a.to} no longer contains its pattern - run node tools/build-code-viewer.mjs`);
    }
  }
}

const EVW = loadGenerated('evidence.js');
if (EVW) {
  const EV = EVW.SB_EVIDENCE;
  const TR = EVW.SB_TRACES;
  if (!EV || !EV.meta || !EV.meta.capturedAt) note('evidence.js carries no capturedAt stamp');
  else if (!EV.nplus1 || !EV.nplus1.joinFetch || !EV.transactions) {
    note('evidence.js is missing captured responses - run node tools/capture-evidence.mjs');
  }
  if (!TR || !Object.keys(TR).length) {
    note('evidence.js has responses but no walkthrough traces - run node tools/build-traces.mjs');
  } else {
    for (const tKey of Object.keys(TR)) {
      for (const step of TR[tKey].steps || []) {
        const body = mirrorText(step.file);
        if (body === undefined) { noteStale(`trace ${tKey} step points at ${step.file}, which is not mirrored`); continue; }
        if (step.pattern && !body.includes(step.pattern)) {
          noteStale(`trace ${tKey} step no longer finds "${String(step.pattern).slice(0, 50)}" in ${step.file} - run node tools/build-traces.mjs`);
        }
      }
    }
  }
}
const GEN = loadGenerated('content-index.js');
const IDXGEN = GEN && GEN.SB_INDEX;
if (IDXGEN && JSON.stringify(IDXGEN) !== JSON.stringify(IDX)) {
  note('content-index.js differs from the index in memory - reload or rebuild');
}
for (const key of KEYS) {
  const spec = IDX.diagrams[key];
  if (!spec.code) continue;
  for (const c of spec.code) {
    const body = mirrorText(c.path);
    if (c.note && body !== undefined && !body.split('\n').some((l) => l.includes(c.note))) {
      noteStale(`${key}: explained-line note "${String(c.note).slice(0, 40)}" no longer appears in ${c.path}`);
    }
  }
}

console.log(`diagrams audited : ${KEYS.length}`);
console.log(`nodes / edges    : ${nodes} / ${edges}`);
console.log(`views            : ${KEYS.reduce((n, k) => n + IDX.diagrams[k].views.length, 0)}`);
console.log(`code links       : ${links} (all files verified on disk)`);
console.log(`concept refs     : ${refs}`);
console.log(`mirrored sources : ${mirrored} (compared byte-for-byte with bookstore/)` + (stale ? ` - ${stale} STALE` : ' - none stale'));
console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n  ` + problems.join('\n  ') : '\nLINK ASSET AUDIT: clean');
process.exitCode = problems.length ? 1 : 0;
