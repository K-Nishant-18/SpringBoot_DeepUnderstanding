import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
﻿// Build content-index.js: the searchable content model behind the hub and the
// in-diagram study tools. Reads every delivered diagram plus its embedded rich-hover
// data and guided views, and emits a plain script (no fetch, so file:// works).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const DIR = join(ROOT, 'site');
const OUT = join(ROOT, 'site', 'content-index.js');

const META = {
  Spring_Boot_Roadmap:              { track: 'Foundations',            type: 'workflow',    order: 1, icon: 'map' },
  Spring_Boot_Startup:              { track: 'Foundations',            type: 'sequence',    order: 2, icon: 'play' },
  Spring_Boot_Bean_Lifecycle:       { track: 'Foundations',            type: 'lifecycle',   order: 3, icon: 'cycle' },
  Spring_Boot_Layers:               { track: 'How it works',           type: 'architecture', order: 1, icon: 'layers' },
  Spring_Boot_Request_Path:         { track: 'How it works',           type: 'sequence',    order: 2, icon: 'route' },
  Spring_Boot_AOP_Proxy:            { track: 'How it works',           type: 'sequence',    order: 3, icon: 'split' },
  Spring_Boot_AutoConfiguration:    { track: 'How it works',           type: 'architecture', order: 4, icon: 'spark' },
  Spring_Boot_Config_Properties:    { track: 'How it works',           type: 'architecture', order: 5, icon: 'sliders' },
  Spring_Boot_Data_Model:           { track: 'Data and persistence',   type: 'architecture', order: 1, icon: 'table' },
  Spring_Boot_Nplus1:               { track: 'Data and persistence',   type: 'dataflow',    order: 2, icon: 'loop' },
  Spring_Boot_Transactions:         { track: 'Data and persistence',   type: 'sequence',    order: 3, icon: 'shield' },
  Spring_Boot_Caching:              { track: 'Data and persistence',   type: 'sequence',    order: 4, icon: 'bolt' },
  Spring_Boot_Security_JWT:         { track: 'Security',               type: 'sequence',    order: 1, icon: 'lock' },
  Spring_Boot_Observability:        { track: 'Running it',             type: 'architecture', order: 1, icon: 'pulse' },
  Spring_Boot_Async_Scheduling:     { track: 'Running it',             type: 'architecture', order: 2, icon: 'clock' },
  Spring_Boot_Messaging:            { track: 'Running it',             type: 'sequence',    order: 3, icon: 'queue' },
  Spring_Boot_Deployment:           { track: 'Running it',             type: 'architecture', order: 4, icon: 'box' },
  Spring_Boot_Testing_Slices:       { track: 'Hardening',              type: 'architecture', order: 1, icon: 'check' },
  Spring_Boot_AntiPatterns:         { track: 'Hardening',              type: 'architecture', order: 2, icon: 'alert' },
  Spring_Boot_WebFlux:              { track: 'Hardening',              type: 'architecture', order: 3, icon: 'wave' },
  Spring_Boot_Migration_3:          { track: 'Hardening',              type: 'lifecycle',   order: 4, icon: 'arrow' },
};

const B = 'bookstore/src/main/java/com/example/bookstore';
const BS = 'bookstore/src/main/resources';
const BT = 'bookstore/src/test/java/com/example/bookstore';
const R = 'bookstore/README.md';
const CODE = {
  Spring_Boot_Data_Model: [
    { node: 'author', path: `${B}/domain/Author.java` },
    { node: 'book', path: `${B}/domain/Book.java` },
    { node: 'bookcategory', path: `${B}/domain/BookCategory.java`, note: 'the join table modelled as an entity' },
    { node: 'category', path: `${B}/domain/Category.java` },
    { node: 'bookitem', path: `${B}/domain/BookItem.java` },
    { node: 'orderitem', path: `${B}/domain/OrderItem.java` },
    { node: 'order', path: `${B}/domain/Order.java` },
    { node: 'payment', path: `${B}/domain/Payment.java` },
    { node: 'user', path: `${B}/domain/User.java` },
    { node: 'cart', path: `${B}/domain/Cart.java` },
    { node: 'bookcategory', path: `${BS}/schema.sql`, note: 'the composite primary key the entity matches' },
  ],
  Spring_Boot_Nplus1: [
    { node: 'controller', path: `${B}/web/CatalogController.java`, note: 'naive and join-fetch side by side' },
    { node: 'service', path: `${B}/service/CatalogService.java` },
    { node: 'loop', path: `${B}/service/CatalogService.java`, note: 'the loop that triggers the extra queries' },
    { node: 'query101', path: `${B}/support/QueryCounter.java` },
    { node: 'fixedservice', path: `${B}/service/CatalogFetchService.java` },
    { node: 'joinfetch', path: `${B}/repository/BookRepository.java` },
    { node: 'onequery', path: `${B}/service/CatalogFetchService.java` },
    { node: 'onequery', path: `${BT}/repository/BookRepositoryDataJpaTest.java` },
  ],
  Spring_Boot_Transactions: [
    { node: 'outer', path: `${B}/service/OrderService.java` },
    { node: 'inner', path: `${B}/service/OrderService.java` },
    { node: 'rollback', path: `${B}/error/ConflictException.java` },
    { node: 'commit', path: `${B}/service/OutboxService.java`, note: 'one transaction spans both writes' },
    { node: 'poison', path: `${B}/web/ApiExceptionHandler.java` },
  ],
  Spring_Boot_AntiPatterns: [
    { node: 'selfinv', path: `${B}/service/OrderService.java`, note: 'the deliberate self-invocation' },
    { node: 'privtx', path: `${B}/service/OrderService.java` },
    { node: 'nplus1', path: `${B}/service/CatalogService.java` },
    { node: 'eagermany', path: `${B}/service/CategoryQueryService.java` },
    { node: 'longtx', path: `${B}/service/StockService.java` },
    { node: 'catchall', path: `${B}/web/ApiExceptionHandler.java` },
    { node: 'notimeout', path: `${BS}/application.yml` },
    { node: 'mutableentity', path: `${B}/web/OrderViewMapper.java` },
  ],
  Spring_Boot_Config_Properties: [
    { node: 'configprops', path: `${B}/config/BookstoreProperties.java` },
    { node: 'validation', path: `${B}/config/BookstoreProperties.java` },
    { node: 'relaxed', path: `${BS}/application.yml` },
    { node: 'profileprops', path: `${BS}/application-prod.yml` },
    { node: 'cmdline', path: `${R}` },
  ],
  Spring_Boot_Observability: [
    { node: 'actuator', path: `${BS}/application.yml` },
    { node: 'health', path: `${BS}/application.yml` },
    { node: 'liveness', path: `${BS}/application.yml` },
    { node: 'readiness', path: `${BS}/application.yml` },
    { node: 'metrics', path: `${BS}/application.yml` },
    { node: 'endpoints', path: `${BS}/application.yml` },
    { node: 'logs', path: `${B}/config/CorrelationIdFilter.java` },
    { node: 'health', path: `${B}/config/OutboxHealthIndicator.java`, note: 'a custom indicator' },
  ],
  Spring_Boot_Caching: [
    { node: 'cache', path: `${B}/config/CacheConfig.java` },
    { node: 'evictor', path: `${B}/service/CategoryCommandService.java` },
    { node: 'service', path: `${B}/service/CategoryQueryService.java` },
    { node: 'cacheproxy', path: `${B}/config/TransactionProbeAspect.java`, note: 'the other proxy-based advice in the app' },
  ],
  Spring_Boot_Async_Scheduling: [
    { node: 'executor', path: `${B}/config/AsyncExecutorConfig.java` },
    { node: 'custompool', path: `${B}/config/AsyncExecutorConfig.java` },
    { node: 'taskdecorator', path: `${B}/config/CorrelationTaskDecorator.java` },
    { node: 'contextprop', path: `${B}/support/ExecutionContext.java` },
    { node: 'scheduler', path: `${B}/service/OutboxRelay.java` },
    { node: 'proxy', path: `${B}/service/ReceiptService.java` },
  ],
  Spring_Boot_Messaging: [
    { node: 'outbox', path: `${B}/service/OutboxService.java` },
    { node: 'relay', path: `${B}/service/OutboxRelay.java` },
    { node: 'broker', path: `${B}/service/OutboxRelay.java`, note: 'a Spring event stands in for the broker' },
    { node: 'consumer', path: `${B}/service/OrderPlacedEventHandler.java` },
    { node: 'sideeffect', path: `${B}/service/OrderPlacedEventHandler.java` },
    { node: 'db', path: `${B}/outbox/OutboxEvent.java` },
    { node: 'relay', path: `${B}/support/TransactionAwareEventPublisher.java`, note: 'publishes only after the commit succeeds' },
  ],
  Spring_Boot_Testing_Slices: [
    { node: 'datajpa', path: `${BT}/repository/BookRepositoryDataJpaTest.java` },
    { node: 'webmvc', path: `${BT}/web/CatalogControllerWebMvcTest.java` },
    { node: 'unit', path: `${BT}/service/OrderTotalTest.java` },
    { node: 'integration', path: `${BT}/service/OutboxFlowIntegrationTest.java` },
  ],
  Spring_Boot_Deployment: [
    { node: 'pod', path: `${R}`, note: 'how to run the built image' },
    { node: 'configsource', path: `${BS}/application-prod.yml` },
    { node: 'jvm', path: `${BS}/application.yml` },
    { node: 'graceful', path: `${BS}/application.yml` },
  ],
  Spring_Boot_Layers: [
    { node: 'browser', path: `${R}` },
    { node: 'dispatcher', path: `${B}/web/CatalogController.java` },
    { node: 'controller', path: `${B}/web/CatalogController.java` },
    { node: 'dto', path: `${B}/web/dto/CatalogRow.java` },
    { node: 'service', path: `${B}/service/CatalogService.java` },
    { node: 'repository', path: `${B}/repository/BookRepository.java` },
    { node: 'jpa', path: `${B}/domain/Book.java` },
    { node: 'tx', path: `${B}/service/OrderService.java` },
  ],
  Spring_Boot_Request_Path: [
    { node: 'browser', path: `${R}` },
    { node: 'filter', path: `${B}/config/CorrelationIdFilter.java` },
    { node: 'controller', path: `${B}/web/OrderController.java` },
    { node: 'service', path: `${B}/service/OrderService.java` },
    { node: 'repository', path: `${B}/repository/OrderRepository.java` },
  ],
  Spring_Boot_AOP_Proxy: [
    { node: 'proxy', path: `${B}/config/TransactionProbeAspect.java`, note: 'an aspect that logs which calls went through a proxy' },
    { node: 'caller', path: `${B}/web/OrderController.java` },
    { node: 'service', path: `${B}/service/OrderService.java` },
    { node: 'repo', path: `${B}/repository/OrderRepository.java` },
  ],
  Spring_Boot_AutoConfiguration: [
    { node: 'beancond', path: `${BS}/application.yml` },
    { node: 'register', path: `${B}/BookstoreApplication.java` },
  ],
  Spring_Boot_Bean_Lifecycle: [
    { node: 'postconstruct', path: `${B}/config/CacheConfig.java` },
    { node: 'defined', path: `${BS}/application.yml` },
  ],
  Spring_Boot_Security_JWT: [{ node: 'filter', path: `${R}`, note: 'why the project deliberately has no security starter' }],
  Spring_Boot_Migration_3: [
    { node: 'namespace', path: `${R}` },
    { node: 'props', path: `${BS}/application.yml` },
    { node: 'test', path: `${BT}/repository/BookRepositoryDataJpaTest.java` },
  ],
  Spring_Boot_WebFlux: [{ node: 'webmvc', path: `${R}`, note: 'this project is blocking JDBC on purpose' }],
  Spring_Boot_Roadmap: [{ node: 'partA', path: `${R}` }],
};

const TRACK_BLURB = {
  'Foundations': 'the mental model - what the container is and how it starts',
  'How it works': 'the request path, the proxy, and how configuration is resolved',
  'Data and persistence': 'where data goes wrong - queries, transactions, caches',
  'Security': 'authentication, authorization, and the filter chain',
  'Running it': 'observability, background work, messaging, and deployment',
  'Hardening': 'testing, the traps that reach production, and the upgrade path',
};

const decode = (s) => String(s || '')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const grab = (chunk, name) => {
  const m = chunk.match(new RegExp('\\b' + name + '="([^"]*)"'));
  return m ? decode(m[1]) : '';
};

const scriptJson = (html, id) => {
  const re = new RegExp('<script[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)</script>');
  const m = html.match(re);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
};

const index = { tracks: [], diagrams: {} };
let totalNodes = 0, totalEdges = 0, totalViews = 0;

for (const key of Object.keys(META)) {
  const meta = META[key];
  const html = readFileSync(`${DIR}/${key}.html`, 'utf8');
  const svgAt = html.indexOf('<svg');
  const svg = html.slice(svgAt, html.lastIndexOf('</svg>') + 6);

  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || key).replace(/\s*Diagram$/, '');
  const detail = scriptJson(html, 'archify-hover-detail-data') || { nodes: {}, edges: [] };
  const views = scriptJson(html, 'archify-guided-views-data') || [];

  const nodes = [];
  const nodeRe = /<\w+\b[^>]*\bdata-node-id="([^"]+)"[^>]*>/g;
  let m;
  while ((m = nodeRe.exec(svg))) {
    const id = m[1];
    if (nodes.some((n) => n.id === id)) continue;
    const d = detail.nodes[id] || {};
    nodes.push({
      id,
      label: grab(m[0], 'data-node-label') || id,
      sublabel: grab(m[0], 'data-node-sublabel'),
      tag: grab(m[0], 'data-node-tag'),
      kind: grab(m[0], 'data-node-kind'),
      t: d.t || '',
      s: d.s || '',
      b: d.b || [],
    });
  }

  const edges = [];
  const edgeRe = /<\w+\b[^>]*\bdata-edge-from="([^"]*)"[^>]*\bdata-edge-to="([^"]*)"[^>]*>/g;
  const seen = new Set();
  while ((m = edgeRe.exec(svg))) {
    const from = m[1], to = m[2], label = grab(m[0], 'data-edge-label');
    const sig = from + '>' + to + '|' + label;
    if (seen.has(sig)) continue;
    seen.add(sig);
    edges.push({ i: edges.length, from, to, label, s: (detail.edges[edges.length] || {}).s || '' });
  }

  totalNodes += nodes.length; totalEdges += edges.length; totalViews += views.length;
  index.diagrams[key] = {
    key, title, file: key + '.html',
    track: meta.track, type: meta.type, order: meta.order, icon: meta.icon,
    nodes, edges,
    code: (CODE[key] || []).map((c) => ({ node: c.node, path: c.path, note: c.note || '' })),
    views: views.map((v) => ({ id: v.id, label: v.label, focus: v.focus || [], note: v.note || '' })),
  };
}

const byTrack = {};
for (const d of Object.values(index.diagrams)) (byTrack[d.track] ||= []).push(d);
index.tracks = Object.keys(byTrack).map((t) => ({
  name: t,
  blurb: TRACK_BLURB[t] || '',
  diagrams: byTrack[t].sort((a, b) => a.order - b.order).map((d) => d.key),
}));
index.stats = {
  diagrams: Object.keys(index.diagrams).length,
  tracks: index.tracks.length,
  nodes: totalNodes,
  edges: totalEdges,
  views: totalViews,
};

const banner = `// Generated by build-content-index.mjs. Edit that script, not this file.\n`;
writeFileSync(OUT, banner + 'window.SB_INDEX = ' + JSON.stringify(index, null, 1) + ';\n', 'utf8');

console.log(`diagrams=${index.stats.diagrams} tracks=${index.stats.tracks} nodes=${totalNodes} edges=${totalEdges} views=${totalViews}`);
for (const t of index.tracks) console.log(`  ${t.name.padEnd(24)} ${t.diagrams.length}  ${t.diagrams.join(', ')}`);

// integrity report: content gaps and id mismatches
console.log('\nintegrity:');
let problems = 0;
for (const d of Object.values(index.diagrams)) {
  const missing = d.nodes.filter((n) => !n.s || !n.b.length);
  const missingEdge = d.edges.filter((e) => !e.s);
  const orphans = Object.keys((scriptJson(readFileSync(`${DIR}/${d.file}`, 'utf8'), 'archify-hover-detail-data') || { nodes: {} }).nodes)
    .filter((id) => !d.nodes.some((n) => n.id === id));
  if (missing.length || missingEdge.length || orphans.length) {
    problems++;
    console.log(`  ${d.key}: ${missing.length} nodes without content, ${missingEdge.length} edges without content, ${orphans.length} orphan keys${orphans.length ? ' [' + orphans.join(',') + ']' : ''}`);
  }
}
console.log(problems ? `  ${problems} diagram(s) with gaps` : '  all diagrams fully described');

console.log('\ncode links:');
let codeLinks = 0;
const missingFiles = new Set();
for (const d of Object.values(index.diagrams)) {
  for (const c of d.code) {
    codeLinks++;
    if (!d.nodes.some((n) => n.id === c.node)) err_missing(`  ${d.key}: code link targets unknown node "${c.node}"`);
    if (!existsSync(`${ROOT}/${c.path.replace(/\//g, '\\')}`)) missingFiles.add(c.path);
  }
}
function err_missing(m) { console.log('  MISS ' + m.trim()); problems++; }
console.log(`  ${codeLinks} node->file links across ${Object.values(index.diagrams).filter((d) => d.code.length).length} diagrams`);
if (missingFiles.size) { console.log('  MISSING FILES: ' + [...missingFiles].join(', ')); problems++; }
else console.log('  every referenced file exists');

