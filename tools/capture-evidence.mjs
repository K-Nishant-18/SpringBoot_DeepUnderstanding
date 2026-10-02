/*
 * Capture real responses from the running Book Store app into evidence.js,
 * which the diagrams read so they can show measured numbers instead of claims.
 *
 *   node tools/capture-evidence.mjs
 *
 * Requires target/bookstore-0.0.1-SNAPSHOT.jar to exist:
 *   bookstore\run.cmd build     (or: mvn -B package -DskipTests)
 */
import { spawn, execSync } from 'node:child_process';
import { writeFileSync, existsSync, statSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const BOOK = join(ROOT, 'bookstore');
const OUT = join(ROOT, 'site', 'evidence.js');
const JAR = join(BOOK, 'target', 'bookstore-0.0.1-SNAPSHOT.jar');
const PORT = Number(process.env.PORT || 8080);
const BASE = `http://localhost:${PORT}`;
const LOG = join(ROOT, 'tools', 'evidence-run.log');

function javaBin() {
  if (process.env.JAVA_HOME) return join(process.env.JAVA_HOME, 'bin', 'java.exe');
  return 'java';
}

if (!existsSync(JAR)) {
  console.error(`jar not built: ${JAR}`);
  console.error('build it first:  mvn -B package -DskipTests   (from bookstore/)');
  process.exit(1);
}

/* Evidence must come from a fresh app of our own. A leftover instance on the same
 * port would answer these calls with a database that has already moved on, and we
 * would quietly freeze a wrong answer into the diagrams. So clear the port first. */
function listeners() {
  try {
    const out = execSync(`netstat -ano -p tcp | findstr :${PORT} `, { encoding: 'utf8' });
    const pids = new Set();
    out.split(/\r?\n/).forEach((line) => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid) && line.includes('LISTENING')) pids.add(Number(pid));
    });
    return [...pids];
  } catch {
    return [];
  }
}

const stale = listeners();
if (stale.length) {
  console.log(`port ${PORT} is held by pid ${stale.join(', ')} - stopping it so the capture starts clean`);
  for (const pid of stale) {
    try { process.kill(pid, 'SIGKILL'); } catch (e) { console.log(`  could not stop ${pid}: ${e.message}`); }
  }
  for (let i = 0; i < 20 && listeners().length; i++) await sleep(500);
  if (listeners().length) {
    console.error(`port ${PORT} is still in use; stop it manually and re-run`);
    process.exit(1);
  }
  console.log('  port is free');
}

const app = spawn(javaBin(), ['-jar', 'target/bookstore-0.0.1-SNAPSHOT.jar'], {
  cwd: BOOK,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logText = '';
app.stdout.on('data', (d) => { logText += d; });
app.stderr.on('data', (d) => { logText += d; });

const shutdown = () => {
  if (!app || app.exitCode !== null || app.killed) return;
  try { app.kill('SIGKILL'); } catch (e) { /* already gone */ }
};

/* Killing must be confirmed, not assumed: a capture that leaves the app behind
 * makes the next run fight for the port, which is the failure this script exists
 * to prevent. */
async function ensureStopped() {
  shutdown();
  for (let i = 0; i < 24; i++) {
    if (!listeners().length) return true;
    await sleep(500);
  }
  for (const pid of listeners()) {
    console.log(`  the app did not exit on its own - stopping pid ${pid} directly`);
    try { process.kill(pid, 'SIGKILL'); } catch (e) { console.log('    ' + e.message); }
  }
  await sleep(1500);
  return !listeners().length;
}

process.on('exit', shutdown);
process.on('SIGINT', () => { shutdown(); process.exit(1); });

async function call(path, method = 'GET', payload) {
  const opts = { method, headers: {} };
  if (payload) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(payload);
  }
  const res = await fetch(BASE + path, opts);
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, body, text };
}
const get = (p) => call(p);
const post = (p, b) => call(p, 'POST', b);

async function waitUp(timeoutMs = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const h = await get('/actuator/health');
      if (h.status === 200 && h.body && h.body.status === 'UP') return true;
    } catch { /* not up yet */ }
    await sleep(1500);
  }
  return false;
}

if (!(await waitUp())) {
  console.error('the application never became healthy');
  console.error(logText.split('\n').slice(-30).join('\n'));
  await ensureStopped();
  process.exit(1);
}
if (app.exitCode !== null) {
  console.error(`the application exited with code ${app.exitCode} during startup`);
  console.error(logText.split('\n').slice(-30).join('\n'));
  process.exit(1);
}
console.log(`application is up on ${BASE}`);

const evidence = {};

const naive = await get('/api/catalog/books/naive');
const joined = await get('/api/catalog/books/join-fetch');
evidence.nplus1 = {
  naive: {
    status: naive.status, strategy: naive.body.strategy,
    bookCount: naive.body.bookCount, sqlQueries: naive.body.sqlQueries,
    queriesPerBook: naive.body.queriesPerBook,
    firstTwoBooks: (naive.body.books || []).slice(0, 2),
  },
  joinFetch: {
    status: joined.status, strategy: joined.body.strategy,
    bookCount: joined.body.bookCount, sqlQueries: joined.body.sqlQueries,
    queriesPerBook: joined.body.queriesPerBook,
    firstTwoBooks: (joined.body.books || []).slice(0, 2),
  },
  identicalPayload: JSON.stringify(naive.body.books) === JSON.stringify(joined.body.books),
  saved: naive.body.sqlQueries - joined.body.sqlQueries,
};
console.log(`  n+1        ${naive.body.sqlQueries} queries vs ${joined.body.sqlQueries}, identical payload: ${evidence.nplus1.identicalPayload}`);

const order = (bookItemId, ref) => ({ userId: 1, lines: [{ bookItemId, quantity: 1 }], paymentReference: ref });

const required = await post('/api/orders?mode=required', order(2, 'ev-required'));
const requiresNew = await post('/api/orders?mode=requires-new', order(3, 'ev-requires-new'));
const poison = await post('/api/orders?mode=poison', order(4, 'ev-poison'));
evidence.transactions = {
  required: required.body,
  'requires-new': requiresNew.body,
  poison: { status: poison.status, body: poison.body },
};
console.log(`  tx modes   required=${required.status} requires-new=${requiresNew.status} poison=${poison.status}`);

/* A capture that disagrees with the expected shape is a broken capture, not new
 * evidence. Refuse to write it rather than teaching the diagrams a lie. */
const problems = [];
if (required.status !== 201) problems.push(`mode=required answered ${required.status}, expected 201`);
if (requiresNew.status !== 201) problems.push(`mode=requires-new answered ${requiresNew.status}, expected 201`);
if (poison.status !== 409) problems.push(`mode=poison answered ${poison.status}, expected 409`);
if (!Array.isArray(required.body && required.body.advisedMethods) || !required.body.advisedMethods.length) {
  problems.push('mode=required carried no advisedMethods report');
}
if (!Array.isArray(required.body && required.body.bypassedMethods) || !required.body.bypassedMethods.length) {
  problems.push('mode=required carried no bypassedMethods report');
}
if (joined.body.sqlQueries !== 1) problems.push(`join-fetch reported ${joined.body.sqlQueries} queries, expected 1`);
if (!(naive.body.sqlQueries > joined.body.sqlQueries)) {
  problems.push(`naive path (${naive.body.sqlQueries}) is not worse than join fetch (${joined.body.sqlQueries})`);
}
if (problems.length) {
  console.error('\ncapture looks wrong, refusing to overwrite evidence.js:');
  problems.forEach((p) => console.error('  - ' + p));
  await ensureStopped();
  process.exit(1);
}

await sleep(8000);
const outbox = await get('/api/outbox');
const handled = await get('/api/outbox/handled');
const orders = await get('/api/orders/users/1');
evidence.outbox = {
  events: outbox.body,
  handled: handled.body,
  orderIds: (orders.body || []).map((o) => o.orderId),
  publishedCount: (outbox.body || []).filter((e) => e.published).length,
  totalCount: (outbox.body || []).length,
};
console.log(`  outbox     ${evidence.outbox.publishedCount}/${evidence.outbox.totalCount} published, ${(handled.body || []).length} handled`);

evidence.errors = {
  notFound: await get('/api/catalog/categories/9999'),
  validation: await post('/api/catalog/categories', { name: '' }),
  conflict: await post('/api/catalog/categories', { name: 'Technical' }),
};
console.log(`  errors     ${evidence.errors.notFound.status}/${evidence.errors.validation.status}/${evidence.errors.conflict.status}`);

evidence.config = await get('/api/system/config/bookstore.orders.outbox-batch-size');
evidence.health = await get('/actuator/health');

evidence.meta = {
  capturedAt: new Date().toISOString(),
  springBoot: '3.3.5',
  command: 'node tools/capture-evidence.mjs  (starts the app, calls it, freezes the answers)',
};

writeFileSync(LOG, logText);
const stopped = await ensureStopped();

const banner = `/* GENERATED by tools/capture-evidence.mjs - do not edit by hand.
 * Real responses from the Book Store API, captured ${evidence.meta.capturedAt}.
 * Regenerate: node tools/capture-evidence.mjs
 */`;
writeFileSync(OUT, `${banner}\nwindow.SB_EVIDENCE = ${JSON.stringify(evidence, null, 2)};\n`);

console.log(`\nwrote evidence.js (${(statSync(OUT).size / 1024).toFixed(1)} KB)`);
console.log(stopped ? `app stopped, port ${PORT} is free`
                    : `WARNING: something is still listening on port ${PORT}`);
if (!stopped) process.exitCode = 1;
