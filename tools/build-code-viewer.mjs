import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BOOK = join(ROOT, 'bookstore');
const INDEX = join(ROOT, 'content-index.js');
const OUT = join(ROOT, 'code-source.js');

/*
 * Every file any diagram can link to gets mirrored here, because the reader must
 * never be dumped into a browser's plain-text view. content-index.js is the
 * authority on what those links are, so this build reads it and refuses to finish
 * if any referenced file cannot be mirrored.
 *
 * Each anchor additionally pins a file to a line range and a pattern. The pattern
 * keeps the hand-written explanations honest: if the code moves, the pattern stops
 * matching and the build fails instead of quietly pointing at the wrong lines.
 */
const B = join(BOOK, 'src/main/java/com/example/bookstore').replace(/\\/g, '/');
const ANCHORS = [
  { file: `${B}/service/CatalogService.java`, marks: [
    { lines: [26, 29], pattern: '@Transactional(readOnly = true)', note: 'One read-only transaction wraps the whole method. That matters: the persistence context is now alive for the entire loop, so every lazy access below reuses it instead of opening its own short transaction.' },
    { lines: [29, 29], pattern: 'List<Book> books = bookRepository.findAll();', note: 'Query 1. Eight books, and only the book columns. author and bookCategories are not touched, so both stay uninitialised proxies.' },
    { lines: [31, 33], pattern: 'for (Book book : books) {', note: 'The loop is the whole problem. One iteration per book, and each iteration is allowed to talk to the database.' },
    { lines: [46, 48], pattern: 'book.getBookCategories()', note: 'First lazy access. Leaving the persistence context to fetch a proxy issues a query for this book, and again for each category behind it.' },
    { lines: [50, 50], pattern: 'book.getAuthor().getName()', note: 'Second lazy access, same story for the author. Two extra round trips per book, so the total is 1 + (8 books x 2) = 17, plus the final count query.' },
  ] },
  { file: `${B}/service/CatalogFetchService.java`, marks: [
    { lines: [26, 29], pattern: '@Transactional(readOnly = true)', note: 'Identical transaction boundary. The only difference is the query, which is the entire point of the comparison.' },
    { lines: [29, 29], pattern: 'findAllWithAuthorAndCategories()', note: 'The one query. left join fetch pulls author, bookCategories and category in the same result set, so by the time the loop runs there is nothing left to load lazily.' },
    { lines: [31, 33], pattern: 'for (Book book : books) {', note: 'The same loop as the naive path, and it costs zero extra queries here. That is the whole lesson: the loop is not the bug, the fetch plan is.' },
    { lines: [45, 51], pattern: 'private CatalogRow toRow', note: 'This toRow is character-for-character the naive one. Same accessors, same loops, same output - which is why the two payloads compare equal in the evidence panel.' },
  ] },
  { file: `${B}/support/QueryCounter.java`, marks: [
    { lines: [15, 15], pattern: 'setStatisticsEnabled(true)', note: 'The endpoint measures its own database cost. Hibernate statistics count every prepared statement, so the number in the response is measured, not asserted.' },
    { lines: [18, 22], pattern: 'public long reset', note: 'Clears the counter at the start of the read. Both catalog paths reset and count the same way, which is why the comparison is fair.' },
    { lines: [24, 26], pattern: 'public long count', note: 'Reads the count back at the end. Everything prepared in between - the findAll, each lazy proxy load, each category - shows up here.' },
  ] },
  { file: `${B}/repository/BookRepository.java`, marks: [
    { lines: null, pattern: 'findAllWithAuthorAndCategories', note: 'The fetch-plan query. left join fetch b.author and b.bookCategories.category walks the whole graph in one statement. Note it is a JPQL query, not a derived one - a derived method cannot express two fetch joins.' },
  ] },
  { file: `${B}/service/OrderService.java`, marks: [
    { lines: [74, 75], pattern: 'public TransactionReport placeOrder', note: 'The transaction boundary. Everything from here to the end of the method is one unit of work: stock, order, payment and outbox row all commit together or not at all.' },
    { lines: [86, 88], pattern: 'stockService.reserveCopy', note: 'The cross-bean call. reserveCopy runs on StockService, a different object, so the call genuinely re-enters the proxy and REQUIRED advice is applied. The evidence panel shows "reserveCopy" in advisedMethods.' },
    { lines: [99, 99], pattern: 'applyOrderDiscount(order);', note: 'The self-invocation. applyOrderDiscount is annotated @Transactional, but this call never leaves the object, so the proxy is bypassed and no advice runs. The evidence panel shows it in bypassedMethods, not advisedMethods.' },
    { lines: [101, 101], pattern: 'orderRepository.saveAndFlush(order);', note: 'saveAndFlush pushes the insert down immediately instead of waiting for the end of the method. Deliberate: it makes the ordering of the SQL statements visible in the log.' },
    { lines: [107, 107], pattern: 'outboxService.recordOrderPlaced', note: 'The outbox row is written in this same transaction, which is the entire point of the transactional outbox. There is no window where the order exists but the event does not.' },
    { lines: [111, 115], pattern: 'public BigDecimal applyOrderDiscount', note: 'Annotated @Transactional, and still bypassed. Annotation presence is not advice application; the call has to cross a proxy boundary for the advice to run.' },
    { lines: [132, 139], pattern: 'triggerInnerRollbackOnly', note: 'The poison pill. rejectCopy throws, the catch swallows it, so the code looks recovered - but the inner transaction already marked the outer one rollback-only, and it cannot be un-marked. The commit fails.' },
  ] },
  { file: `${B}/service/StockService.java`, marks: [
    { lines: [22, 25], pattern: 'Propagation.REQUIRED', note: 'The default. Joins whatever transaction is already running, or starts one if there is none. This is why reserveCopy participates in the order transaction instead of committing on its own.' },
    { lines: [27, 30], pattern: 'Propagation.REQUIRES_NEW', note: 'Always a separate transaction, suspended or not. The evidence panel shows the difference: reserveCopyInNewTransaction appears in advisedMethods, and its commit is independent of the order.' },
    { lines: [37, 46], pattern: 'private ClaimedCopy claim', note: 'The real work both entry points share. Because it is private and called from inside the same object, the @Transactional on the callers is what matters, not anything on this method.' },
  ] },
  { file: `${B}/service/OutboxService.java`, marks: [
    { lines: [26, 27], pattern: 'Propagation.MANDATORY', note: 'MANDATORY refuses to run without an existing transaction, instead of quietly creating one. If the caller ever loses its @Transactional, this throws rather than silently committing the event on its own.' },
    { lines: [41, 41], pattern: 'outboxEventRepository.save', note: 'The insert happens in the caller transaction. The event is now durable and atomic with the order, but nobody has been told yet.' },
  ] },
  { file: `${B}/support/TransactionAwareEventPublisher.java`, marks: [
    { lines: [22, 22], pattern: 'isSynchronizationActive()', note: 'Outside a transaction there is nothing to defer, so the event goes out immediately. Inside one, publication is postponed.' },
    { lines: [28, 30], pattern: 'afterCommit', note: 'The real work. The event is published only once the commit has succeeded, which is what stops a consumer from reacting to an order that was then rolled back.' },
    { lines: [32, 36], pattern: 'afterCompletion', note: 'And if the transaction rolled back instead, the event is dropped rather than published. This class replaced a class that did not exist in Spring - see the README.' },
  ] },
  { file: `${B}/config/TransactionProbeAspect.java`, marks: [
    { lines: [19, 19], pattern: '@annotation(org.springframework.transaction.annotation.Transactional)', note: 'The pointcut matches the annotation on the method. It fires when the proxy intercepts a call, which is exactly why self-invocation does not trigger it.' },
  ] },
  { file: `${B}/domain/BookCategory.java`, marks: [
    { lines: null, pattern: '@MapsId', note: 'The join table modelled as a real entity. @MapsId derives the composite key from the two associations, so Hibernate fills in book_id and category_id itself at flush time and there is nothing to set by hand.' },
  ] },
  { file: `${B}/domain/Book.java`, marks: [
    { lines: null, pattern: 'addCategory', note: 'Returns the new link so the caller can persist it. The collection is the inverse side, so adding to it alone would never write a row - the test seed is what shows that.' },
  ] },
];

/* ------------------------------------------------------------------ language */

function langOf(p) {
  if (/\.java$/.test(p)) return 'java';
  if (/\.(ya?ml)$/.test(p)) return 'yaml';
  if (/\.sql$/.test(p)) return 'sql';
  if (/\.md$/.test(p)) return 'md';
  if (/\.properties$/.test(p)) return 'properties';
  return 'text';
}

function roleOf(p) {
  if (/\.md$/.test(p)) return 'Docs';
  if (/\.(ya?ml)$/.test(p)) return 'Config';
  if (/\.sql$/.test(p)) return 'Schema';
  if (/\.properties$/.test(p)) return 'Config';
  if (/\/src\/test\//.test(p)) return 'Test';
  if (/\/config\//.test(p)) return 'Config';
  if (/\/domain\//.test(p)) return 'Entity';
  if (/\/repository\//.test(p)) return 'Repository';
  if (/\/web\/dto\//.test(p)) return 'DTO';
  if (/\/service\//.test(p)) return 'Service';
  if (/\/web\//.test(p)) return 'Web';
  if (/\/outbox\//.test(p)) return 'Outbox';
  if (/\/support\//.test(p)) return 'Support';
  if (/\/error\//.test(p)) return 'Error';
  if (/Application\.java$/.test(p)) return 'Boot';
  return 'Java';
}

/* ------------------------------------------------------------------ outline */
/* A file is much easier to understand when its shape is visible before the code:
 * what is declared here, and at which line. Built by scanning structure only, so
 * it stays correct when lines move (only the hand-written anchors can go stale). */

const CONTROL = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'new', 'super', 'this', 'throw', 'try', 'else', 'do', 'synchronized']);

function shortArgs(a) {
  const parts = a.split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length > 3) return `${parts.length} args`;
  return parts.map((s) => {
    const toks = s.replace(/=.*/, '').trim().split(/\s+/);
    return toks[toks.length - 1];
  }).join(', ');
}

function javaOutline(lines) {
  const out = [];
  let depth = 0;
  let inBlock = false;
  let pending = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (inBlock) {
      const end = line.indexOf('*/');
      if (end < 0) continue;
      line = line.slice(end + 2);
      inBlock = false;
    }
    const bs = line.indexOf('/*');
    if (bs >= 0) {
      const be = line.indexOf('*/', bs + 2);
      if (be < 0) { line = line.slice(0, bs); inBlock = true; }
      else line = line.slice(0, bs) + line.slice(be + 2);
    }
    line = line.replace(/\/\/.*$/, '');
    line = line.replace(/"(?:\\.|[^"\\])*"/g, '""');
    line = line.replace(/'(?:\\.|[^'\\])*'/g, "''");

    const open = (line.match(/\{/g) || []).length;
    const close = (line.match(/\}/g) || []).length;
    const d = depth;
    const t = line.trim();

    if (t && d <= 1) {
      let m;
      if (/^@\w/.test(t)) {
        const a = t.match(/^@\w+/);
        if (a) pending.push(a[0]);
      } else if ((m = line.match(/^\s*(?:public|protected|private)?\s*(?:static\s+|final\s+|abstract\s+|sealed\s+|strictfp\s+)*(?:class|interface|enum|record)\s+(\w+)/))) {
        out.push({ line: i + 1, kind: 'type', name: m[1], ann: pending });
        pending = [];
      } else if (d === 1 && (m = line.match(/^\s*(?:public|protected|private)\s+(?:static\s+|final\s+|abstract\s+|synchronized\s+|native\s+|default\s+)*[\w<>\[\],.?\s]+?\s+(\w+)\s*\(([^)]*)\)\s*(?:throws [\w,.\s]+)?\s*[{;]?/))) {
        if (!CONTROL.has(m[1])) {
          out.push({ line: i + 1, kind: 'method', name: `${m[1]}(${shortArgs(m[2])})`, ann: pending });
          pending = [];
        }
      } else if (d === 1 && (m = line.match(/^\s*private\s+(?:static\s+|final\s+)*[\w<>\[\]]+\s+(\w+)\s*[;=]/))) {
        out.push({ line: i + 1, kind: 'field', name: m[1], ann: pending });
        pending = [];
      } else if (t === '}' || t === '};') {
        pending = [];
      }
    } else if (t) {
      pending = [];
    }

    depth += open - close;
    if (depth < 0) depth = 0;
  }
  return out;
}

function yamlOutline(lines) {
  const out = [];
  lines.forEach((raw, i) => {
    if (!raw.trim() || raw.trim().startsWith('#')) return;
    const indent = raw.match(/^ */)[0].length;
    const m = raw.match(/^ *(-\s+)?([A-Za-z0-9_.-]+):/);
    if (m && indent <= 2) out.push({ line: i + 1, kind: indent === 0 ? 'type' : 'method', name: m[2] });
  });
  return out;
}

function sqlOutline(lines) {
  const out = [];
  lines.forEach((raw, i) => {
    const m = raw.match(/^\s*(CREATE\s+(?:TABLE|INDEX|SEQUENCE|UNIQUE\s+INDEX)(?:\s+(?:IF\s+(?:NOT\s+)?EXISTS))?|ALTER\s+TABLE|INSERT\s+INTO|DROP\s+TABLE|UPDATE|DELETE\s+FROM)\s+(?:TABLE\s+)?([\w"]+)/i);
    if (m) out.push({ line: i + 1, kind: 'type', name: `${m[1].toUpperCase().replace(/\s+/g, ' ')} ${m[2]}` });
  });
  return out;
}

function mdOutline(lines) {
  const out = [];
  let inFence = false;
  lines.forEach((raw, i) => {
    if (/^\s*```/.test(raw)) { inFence = !inFence; return; }
    if (inFence) return;
    const m = raw.match(/^(#{1,4})\s+(.*)$/);
    if (m) out.push({ line: i + 1, kind: m[1].length <= 2 ? 'type' : 'method', name: m[2].replace(/\s*#+\s*$/, '') });
  });
  return out;
}

function outlineOf(lang, lines) {
  if (lang === 'java') return javaOutline(lines);
  if (lang === 'yaml') return yamlOutline(lines);
  if (lang === 'sql') return sqlOutline(lines);
  if (lang === 'md') return mdOutline(lines);
  return [];
}

/* One sentence describing the file, for the header card. */
function summaryOf(p, lang, lines, outline) {
  if (lang === 'md') return `${basename(p)} · ${lines.length} lines of documentation`;
  const pkgLine = lines.find((l) => /^\s*package\s+[\w.]+;/.test(l));
  const pkg = pkgLine ? pkgLine.match(/package\s+([\w.]+);/)[1] : null;
  const type = outline.find((o) => o.kind === 'type');
  const methods = outline.filter((o) => o.kind === 'method').length;
  if (lang === 'yaml') return `Configuration · ${outline.length} keys`;
  if (lang === 'sql') return `Database schema · ${outline.length} statements`;
  const bits = [];
  if (type) bits.push(type.name);
  if (pkg) bits.push(pkg);
  if (methods) bits.push(`${methods} method${methods === 1 ? '' : 's'}`);
  return bits.join(' · ') || lines.length + ' lines';
}

/* ------------------------------------------------------------------- collect */

const indexText = readFileSync(INDEX, 'utf8');
let indexObj = null;
try {
  indexObj = JSON.parse(indexText.replace(/^[^=]*=\s*/, '').replace(/;\s*$/, ''));
} catch {
  console.error('could not parse content-index.js');
  process.exit(1);
}

const wanted = new Set();
Object.values(indexObj.diagrams || {}).forEach((d) => (d.code || []).forEach((c) => c.path && wanted.add(c.path)));
(indexObj.code || []).forEach((c) => c.path && wanted.add(c.path));
/* Belt and braces: any other link field the index grows later also has to be mirrored. */
for (const m of indexText.matchAll(/"path":\s*"([^"]+)"/g)) wanted.add(m[1]);

if (!wanted.size) {
  console.error('content-index.js referenced no code paths at all - refusing to write an empty mirror');
  process.exit(1);
}

/* --------------------------------------------------------------------- build */

const files = {};
const anchors = [];
const byFile = new Map(ANCHORS.map((a) => [a.file, a]));
let problems = 0;
let totalLines = 0;

for (const rawPath of [...wanted].sort()) {
  const abs = join(ROOT, ...rawPath.split('/'));
  if (!existsSync(abs)) {
    console.log(`  MISSING FILE  ${rawPath}`);
    problems++;
    continue;
  }
  const src = readFileSync(abs, 'utf8');
  const lines = src.split(/\r?\n/);
  const lang = langOf(rawPath);
  const outline = outlineOf(lang, lines);
  /* Keys are bookstore-relative, because that is how every consumer looks them up
   * (sbkit strips "bookstore/" from index links, traces and quiz citations). */
  const key = rawPath.replace(/^bookstore\//, '');
  const entry = {
    path: key,
    full: rawPath,
    lang,
    role: roleOf(rawPath),
    lines: lines.length,
    summary: summaryOf(rawPath, lang, lines, outline),
    outline,
    text: src,
  };
  files[key] = entry;
  totalLines += lines.length;

  const hand = byFile.get(abs.replace(/\\/g, '/')) || byFile.get(rawPath);
  if (!hand) continue;

  for (const mark of hand.marks) {
    if (!mark.pattern || !src.includes(mark.pattern)) {
      console.log(`  STALE ANCHOR  ${rawPath}  "${mark.pattern}" not found - the code moved`);
      problems++;
      continue;
    }
    let from = mark.lines ? mark.lines[0] : null;
    let to = mark.lines ? mark.lines[1] : null;
    if (from == null) {
      const hit = lines.findIndex((l) => l.includes(mark.pattern));
      from = hit + 1;
      to = hit + 1;
    }
    const snippet = lines.slice(from - 1, to).join('\n');
    if (!snippet.includes(mark.pattern)) {
      console.log(`  DRIFTED RANGE ${rawPath} ${from}-${to} does not contain "${mark.pattern}"`);
      problems++;
      continue;
    }
    anchors.push({ file: key, from, to, pattern: mark.pattern, note: mark.note });
  }
}

/* Every diagram link must resolve to a mirrored file, otherwise the reader is
 * dropped into a raw-text dump - which is exactly what this feature exists to stop. */
for (const p of wanted) if (!files[p.replace(/^bookstore\//, '')]) {
  console.log(`  NOT MIRRORED  ${p}`);
  problems++;
}

if (problems) {
  console.log(`\n${problems} problem(s). Nothing was written.`);
  process.exit(1);
}

const banner = `/* GENERATED by tools/build-code-viewer.mjs - do not edit by hand.
 * Real source from bookstore/, mirrored as a JS global so it can be read on file://
 * where fetch and XHR are blocked. ${Object.keys(files).length} files, ${totalLines} lines, ${anchors.length} hand-checked anchors.
 * Every file referenced by content-index.js is present, so no diagram link can fall
 * back to a raw text dump.
 * Regenerate: node tools/build-code-viewer.mjs
 */`;
writeFileSync(OUT, `${banner}\nwindow.SB_SOURCE = ${JSON.stringify({ files, anchors }, null, 2)};\n`);


console.log(`files  : ${Object.keys(files).length} (all ${wanted.size} referenced paths mirrored)`);
console.log(`lines  : ${totalLines}`);
console.log(`anchors: ${anchors.length}`);
console.log(`outline: ${Object.values(files).reduce((a, f) => a + f.outline.length, 0)} structure entries`);
console.log(`wrote  : code-source.js (${(statSync(OUT).size / 1024).toFixed(1)} KB)`);
