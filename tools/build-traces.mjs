import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const OUT = join(ROOT, 'site', 'evidence.js');
const existing = readFileSync(OUT, 'utf8');

const TRACES = {
  nplus1: {
    title: 'N+1: one query becomes eighteen',
    diagram: 'Spring_Boot_Nplus1',
    intro: 'Eight books, one endpoint call. The payload is byte-identical either way - the only difference is how many times the driver reaches the database. Step through and watch the count climb.',
    steps: [
      { node: 'query101', file: 'src/main/java/com/example/bookstore/support/QueryCounter.java', pattern: 'public long reset', title: 'Step 0 - arm the counter', body: 'Hibernate statistics are switched on and cleared, so every statement prepared from here on is counted. Without this the endpoint could not report its own cost.', evidence: null },
      { node: 'query101', file: 'src/main/java/com/example/bookstore/service/CatalogService.java', from: 29, to: 29, title: 'Step 1 - one query for the books', body: 'findAll() runs one SELECT. Hibernate loads the eight Book rows, but the author and bookCategories associations are not touched, so both are left as uninitialised proxies sitting in the persistence context. Count: 1.', evidence: { nplus1: 'naive' } },
      { node: 'loop', file: 'src/main/java/com/example/bookstore/service/CatalogService.java', from: 31, to: 33, title: 'Step 2 - enter the loop', body: 'One iteration per book. Nothing here forces a query, which is why the bug is invisible in the code: the loop body only looks like property access. Count: still 1.', evidence: null },
      { node: 'service', file: 'src/main/java/com/example/bookstore/service/CatalogService.java', from: 47, to: 48, title: 'Step 3 - the first lazy access', body: 'getBookCategories() needs the collection, so Hibernate leaves the persistence context and selects the join rows for this book, then each category behind them. This is the "N" - the cost scales with the number of books, not with the complexity of one row. Count: climbing.', evidence: null },
      { node: 'service', file: 'src/main/java/com/example/bookstore/service/CatalogService.java', from: 50, to: 50, title: 'Step 4 - the second lazy access', body: 'getAuthor() does it again for the author proxy. Two associations per book, so roughly 2N extra round trips. With 8 books that is 1 + 16 = 17, and the endpoint reports 18 once the final count query is included.', evidence: { nplus1: 'naive' } },
      { node: 'onequery', file: 'src/main/java/com/example/bookstore/service/CatalogFetchService.java', from: 29, to: 29, title: 'Step 5 - the fix changes only the query', body: 'findAllWithAuthorAndCategories() left-joins author, bookCategories and category into one result set. The transaction boundary, the loop and the toRow mapping are all identical.', evidence: { nplus1: 'joinFetch' } },
      { node: 'onequery', file: 'src/main/java/com/example/bookstore/service/CatalogFetchService.java', from: 31, to: 33, title: 'Step 6 - the same loop now costs nothing', body: 'Because everything was fetched up front, there is nothing left to initialise lazily. The loop is identical and free. Count: 1, total, done.', evidence: { nplus1: 'both' } },
    ],
    takeaway: 'The loop was never the bug. N+1 is a fetch-plan problem: Hibernate did exactly what it was asked, and what it was asked was "load one book at a time and then reach for its neighbours".',
  },
  transaction: {
    title: 'The transaction boundary, and the two ways advice gets skipped',
    diagram: 'Spring_Boot_Transactions',
    intro: 'One method, three propagation modes, three different outcomes. The same line of business logic - place an order, claim a copy, write an outbox row - is either atomic or it is not, depending entirely on where the boundary sits and whether the call crosses a proxy.',
    steps: [
      { node: 'outer', file: 'src/main/java/com/example/bookstore/service/OrderService.java', from: 74, to: 75, title: 'Step 1 - the boundary opens', body: '@Transactional on placeOrder. From this line to the end of the method is one unit of work. Stock reservations, the order, the payment and the outbox row commit together or not at all.', evidence: null },
      { node: 'inner', file: 'src/main/java/com/example/bookstore/service/OrderService.java', from: 86, to: 88, title: 'Step 2 - a call that does cross the proxy', body: 'reserveCopy is annotated @Transactional(REQUIRED) on a different bean. Because the call leaves the object, it re-enters the proxy, advice runs, and the inner call joins this transaction rather than starting its own. The evidence shows "reserveCopy" in advisedMethods.', evidence: { transaction: 'required' } },
      { node: 'rollback', file: 'src/main/java/com/example/bookstore/service/OrderService.java', from: 99, to: 99, title: 'Step 3 - a call that does not', body: 'applyOrderDiscount is also annotated @Transactional, but this is a self-invocation: the call never leaves the object, so no proxy is consulted and no advice runs. The annotation is present and completely inert. The evidence shows it under bypassedMethods instead.', evidence: { transaction: 'required' } },
      { node: 'commit', file: 'src/main/java/com/example/bookstore/service/OrderService.java', from: 107, to: 107, title: 'Step 4 - the outbox row joins the same commit', body: 'recordOrderPlaced is MANDATORY, so it refuses to run without the caller transaction. The order and the event become durable together, and there is no instant where one exists without the other.', evidence: { transaction: 'required' } },
      { node: 'outertx', file: 'src/main/java/com/example/bookstore/service/StockService.java', from: 27, to: 30, title: 'Step 5 - what REQUIRES_NEW changes', body: 'In the requires-new mode the same reservation runs in a suspended, independent transaction. It commits on its own schedule, so it is no longer atomic with the order that depends on it. The advice list changes to reserveCopyInNewTransaction to show the different entry point.', evidence: { transaction: 'requires-new' } },
      { node: 'poison', file: 'src/main/java/com/example/bookstore/service/OrderService.java', from: 132, to: 139, title: 'Step 6 - the poison pill', body: 'rejectCopy throws, the catch block swallows it, and the code looks recovered. But the inner transaction already marked the outer one rollback-only, and that mark cannot be removed. The commit fails after the method returned, which is why the error arrives as an UnexpectedRollbackException with no obvious line to blame.', evidence: { transaction: 'poison' } },
      { node: 'poison', file: 'src/main/java/com/example/bookstore/support/TransactionAwareEventPublisher.java', from: 28, to: 30, title: 'Step 7 - why the event survives a rollback', body: 'Publication is deferred to afterCommit, so a consumer never sees an order that was then rolled back. In the poison run no event is delivered at all, because there is no commit to publish after.', evidence: null },
    ],
    takeaway: 'Two independent lessons in one method: a transaction boundary is a property of where you put the annotation and which call crosses a proxy, and rollback-only is a sticky flag that survives a caught exception.',
  },
};

const marker = '\nwindow.SB_TRACES = ';
const cut = existing.indexOf(marker);
const head = cut === -1 ? existing.replace(/;\s*$/, '') : existing.slice(0, cut).replace(/;\s*$/, '');
writeFileSync(OUT, `${head};\nwindow.SB_TRACES = ${JSON.stringify(TRACES, null, 2)};\n`);

const s = readFileSync(OUT, 'utf8');
console.log(`traces: ${Object.keys(TRACES).length}`);
for (const [k, t] of Object.entries(TRACES)) console.log(`  ${k}: ${t.steps.length} steps`);
console.log(`wrote  : evidence.js (${(s.length / 1024).toFixed(1)} KB)`);
