# Bookstore — runnable companion to the Spring Boot diagram study

A small but complete Spring Boot 3 application that implements every concept in the
Spring Boot diagram set, including the mistakes the diagrams teach, so each id can be
matched to a real file, endpoint, and command.

Every id below is copied verbatim from the diagram definitions: a **node id** names a box in
a diagram, and a **view id** names one of the highlighted sub-diagrams. The tables keep the
two apart so a source file can be traced to both.

## Requirements

- JDK 17 or newer (built and tested with JDK 22.0.1 using `--release 17`)
- A JDK on `PATH`. Maven itself is optional: a Maven Wrapper is committed, so
  `mvnw.cmd` (Windows) or `./mvnw` (macOS/Linux) downloads Maven 3.9.9 on first use
  and every command below works on a machine with no Maven installed
- No network access is required for the offline type-check described below

## Running the application

```bash
./mvnw spring-boot:run          # or mvnw.cmd on Windows
```

Then open `http://localhost:8080/actuator/health`.

Run the test suite with:

```bash
./mvnw test
```

Plain `mvn spring-boot:run` and `mvn test` do exactly the same thing if you have
Maven 3.9+ on `PATH`.

Run the production profile against a real database with:

```bash
SPRING_PROFILES_ACTIVE=prod SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/bookstore ./mvnw spring-boot:run
```

## Verification

The project is built and tested with Maven against the real Spring Boot dependencies.

```bash
test.cmd
```

Expected output:

```
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0 -- in com.example.bookstore.repository.BookRepositoryDataJpaTest
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0 -- in com.example.bookstore.service.OrderTotalTest
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0 -- in com.example.bookstore.service.OutboxFlowIntegrationTest
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0 -- in com.example.bookstore.web.CatalogControllerWebMvcTest
[INFO] Tests run: 15, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### Why there is no stub-based type-check any more

This project used to ship a `.stubs` tree of hand-written signatures so that `javac` alone
could type-check the sources on a machine with no Maven and no dependency cache. It reported
`VERIFY SUCCESS` and it was wrong twice over. Two of the 137 stub types never existed in the
libraries they claimed to describe:

- `org.springframework.transaction.event.TransactionAwareEventPublisher` — there is no such
  Spring class. The outbox relay referenced it as if it were real. The replacement,
  `support/TransactionAwareEventPublisher`, is a real component in this project that defers
  publication to `TransactionSynchronizationManager` until `afterCommit`.
- `org.mockito.BDDStubber` — Mockito has `BDDMockito` and `Stubber`, never this. It was dead
  weight; the test already used the real `BDDMockito.given`.

A stub that mirrors an invented signature compiles exactly as happily as a stub that mirrors
a real one, so a green type-check against stubs says nothing about whether the code runs.
Building against the real jars is the only check that means anything, and it immediately
surfaced four compile errors, five failing tests, and a `probe.reset()` call placed inside an
advised method. All of it is fixed, and `test.cmd` now runs 15 real tests green.

`run.cmd` starts the application and `test.cmd` runs the suite. Both use `mvn` when it is
on `PATH` and fall back to `mvnw.cmd` otherwise, so only a JDK is required. Neither needs
the project path to be free of spaces: the scripts `cd` to their own directory and pass the
jar as a relative path, so the project directory name is never interpolated into a command
line.

## Source file to diagram id mapping

### `Spring_Boot_Data_Model` — Book Store Data Model

| Source file | Node id | View id |
| --- | --- | --- |
| `domain/Author.java` | `author` | |
| `domain/Book.java` | `book` | |
| `domain/BookCategory.java`, `domain/BookCategoryId.java` | `bookcategory` | |
| `domain/Category.java` | `category` | |
| `domain/Cart.java`, `domain/CartItem.java` | `cart` | |
| `domain/User.java` | `user` | |
| `domain/Order.java`, `domain/OrderStatus.java` | `order` | |
| `domain/BookItem.java`, `domain/CopyStatus.java` | `bookitem` | |
| `domain/OrderItem.java`, `domain/OrderItemId.java` | `orderitem` | |
| `domain/Payment.java`, `domain/PaymentStatus.java` | `payment` | |
| `repository/BookRepository.java` | `book` | `catalog` |
| `repository/OrderRepository.java` | `order` | `orders` |
| `repository/BookItemRepository.java` | `bookitem` | `copies` |
| `web/dto/CartView.java`, `web/dto/CartLineView.java` | `cart`, `bookitem` | `copies` |
| `web/dto/OrderView.java`, `web/dto/OrderLineView.java` | `order`, `orderitem` | `orders` |
| `resources/schema.sql`, `resources/data.sql` | all ten node ids | `catalog`, `orders`, `copies` |

### `Spring_Boot_Nplus1` — N+1 selects and the fix

| Source file | Node id | View id |
| --- | --- | --- |
| `web/CatalogController.java` | `controller` | |
| `service/CatalogService.java` | `service`, `loop`, `query101` | `broken` |
| `service/CatalogFetchService.java` | `fixedservice`, `joinfetch`, `onequery` | `fixed` |
| `repository/BookRepository.java` | `onequery` | `fixed` |
| `support/QueryCounter.java` | `query101` | `broken` |
| `web/dto/CatalogReadReport.java` | `service`, `fixedservice` | `broken`, `fixed` |
| `repository/BookRepositoryDataJpaTest.java` | `query101` | `broken`, `fixed` |

### `Spring_Boot_Transactions` — propagation, self-invocation, rollback-only

| Source file | Node id | View id |
| --- | --- | --- |
| `service/OrderService.java` (`placeOrder`) | `outer`, `outertx`, `commit` | `outer` |
| `service/OrderService.java` (`applyOrderDiscount`) | `inner` | |
| `service/StockService.java` (`reserveCopy`) | `required`, `inner` | `propagation` |
| `service/StockService.java` (`reserveCopyInNewTransaction`) | `requiresnew` | `propagation` |
| `service/StockService.java` (`rejectCopy`) | `poison`, `rollback` | `rollback` |
| `service/OutboxService.java` | `required` | `propagation` |
| `config/TransactionProbeAspect.java` | `inner`, `commit` | |
| `support/TransactionProbe.java` | `outertx`, `inner` | `outer` |
| `web/dto/TransactionReport.java` | `outer`, `outertx`, `commit`, `poison` | `outer`, `rollback` |

### `Spring_Boot_Caching` — proxies, caches, eviction

| Source file | Node id | View id |
| --- | --- | --- |
| `config/CacheConfig.java` | `cachemgr`, `cache` | |
| `service/CategoryQueryService.java` | `cacheproxy`, `cache` | `miss`, `hit` |
| `service/CategoryCommandService.java` | `evictor` | `stale` |
| `web/CategoryController.java` (`GET`) | `client`, `controller`, `service` | `hit` |
| `web/CategoryController.java` (`POST`) | `evictor` | `stale` |
| `service/CategoryQueryService.java`, `repository/CategoryRepository.java` | `repo`, `db` | `miss` |

### `Spring_Boot_Async_Scheduling` — executors, decorators, schedulers

| Source file | Node id | View id |
| --- | --- | --- |
| `config/AsyncExecutorConfig.java` | `executor`, `custompool` | `pool` |
| `config/CorrelationTaskDecorator.java` | `taskdecorator`, `contextprop` | `pool` |
| `config/AsyncErrorHandlingConfig.java` | `exchandler` | `pool` |
| `service/ReceiptService.java` | `proxy`, `executor` | `async` |
| `service/OutboxRelay.java` | `scheduler`, `trigger`, `lock` | `cron` |
| `support/ExecutionContext.java` | `contextprop` | `pool` |
| `web/SystemController.java` (`/receipts`) | `caller` | `async` |
| `web/SystemController.java` (`/receipts/async-failure`) | `caller`, `exchandler` | `pool` |

### `Spring_Boot_Messaging` — transactional outbox

| Source file | Node id | View id |
| --- | --- | --- |
| `outbox/OutboxEvent.java` | `outbox` | `publish` |
| `service/OutboxService.java` | `outbox`, `service` | `publish` |
| `service/OutboxRelay.java` | `relay` | `publish`, `failure` |
| `service/OutboxPayload.java`, `outbox/OrderPlacedEvent.java` | `broker` | `publish` |
| `service/OrderPlacedEventHandler.java` | `consumer`, `handler`, `sideeffect` | `consume` |
| `config/RelayProperties.java` | `broker` | `publish` |
| `web/OutboxController.java` | `client`, `controller` | |
| `repository/OutboxEventRepository.java` | `db` | `publish` |

### `Spring_Boot_Config_Properties` — precedence, binding, validation

| Source file | Node id | View id |
| --- | --- | --- |
| `config/BookstoreProperties.java` | `configprops`, `validation` | `binding` |
| `config/RelayProperties.java` | `configprops`, `validation` | `binding` |
| `service/ConfigInspector.java` | `relaxed`, `envenv` | `precedence` |
| `resources/application.yml` | `defaults`, `appprops` | `profiles` |
| `resources/application-prod.yml` | `profileprops` | `profiles` |
| `web/SystemController.java` (`/config/{key}`) | `cmdline`, `envvars` | `precedence` |
| `web/SystemController.java` (`/precedence-layers`) | `envvars`, `cmdline` | `precedence` |
| `BookstoreApplication.java` | `imports` | `profiles` |

### `Spring_Boot_Observability` — actuator, health, probes

| Source file | Node id | View id |
| --- | --- | --- |
| `pom.xml` | `actuator`, `micrometer`, `metrics` | `metrics` |
| `resources/application.yml` (`management.endpoints`) | `actuator`, `endpoints`, `actuatorui` | |
| `resources/application.yml` (`health.group`) | `health`, `liveness`, `readiness` | `probes` |
| `config/OutboxHealthIndicator.java` | `dbhealth` | `probes` |
| `resources/application.yml` (`spring.jpa.properties`) | `logs` | `trace` |
| `config/CorrelationIdFilter.java` | `logs` | `trace` |

### `Spring_Boot_Testing_Slices` — the test pyramid

| Source file | Node id | View id |
| --- | --- | --- |
| `service/OrderTotalTest.java` | `unit` | `pyramid` |
| `web/CatalogControllerWebMvcTest.java` | `webmvc`, `mvc`, `mocks` | `slices` |
| `repository/BookRepositoryDataJpaTest.java` | `datajpa`, `jsonb` | `slices` |
| `service/OutboxFlowIntegrationTest.java` | `integration` | `real` |
| `pom.xml` (`spring-boot-starter-test`) | | `slices` |

### `Spring_Boot_AOP_Proxy` — why advice needs a proxy

| Source file | Node id | View id |
| --- | --- | --- |
| `config/TransactionProbeAspect.java` | `proxy`, `tx` | `works`, `target` |
| `service/OrderService.java` (`applyOrderDiscount`) | `caller`, `service` | `works` |
| `service/StockService.java` (`reserveCopy`) | `caller`, `proxy`, `tx`, `service` | `works`, `target` |
| `service/StockService.java` | `repo` | `target` |

### `Spring_Boot_Request_Path` — one request end to end

| Source file | Node id | View id |
| --- | --- | --- |
| `config/CorrelationIdFilter.java` | `browser`, `filter`, `dispatcher` | `receive-route` |
| `web/CatalogController.java` | `controller` | `receive-route` |
| `web/ApiExceptionHandler.java` | `controller` | `reply` |
| `service/CatalogService.java` | `service` | `business-data` |
| `repository/BookRepository.java` | `repository` | `business-data` |
| `resources/schema.sql` | `db` | `business-data` |

### `Spring_Boot_Layers` — separation of concerns

| Source file | Node id | View id |
| --- | --- | --- |
| `web/*.java` | `controller` | `request` |
| `web/dto/*.java` | `dto` | `request` |
| `web/ApiExceptionHandler.java`, `config/TransactionProbeAspect.java` | `aop` | `crosscut` |
| `config/CorrelationIdFilter.java` | `dispatcher` | `request` |
| `service/*.java` | `service` | `request` |
| `service/OrderService.java` | `tx` | `request` |
| `repository/*.java` | `repository` | `data` |
| `domain/*.java` | `jpa` | `data` |
| `resources/schema.sql`, `resources/data.sql` | `db` | `data` |

### `Spring_Boot_AntiPatterns` — the mistakes the diagrams teach

| Source file | Node id | View id | Status |
| --- | --- | --- | --- |
| `service/OrderService.java` (`applyOrderDiscount`) | `selfinv` | `container` | reproduced on purpose |
| `service/OrderService.java` (`placeOrder`) | `longtx`, `eagermany` | `data`, `web` | reproduced on purpose |
| `service/CatalogService.java` (naive read) | `nplus1` | `data` | reproduced on purpose |
| `web/ApiExceptionHandler.java` (`handleUnexpected`) | `catchall` | `web` | reproduced on purpose |
| `domain/*.java` | `mutableentity` | `data` | reproduced on purpose |
| `service/*.java` (no `@Transactional` on private helpers) | `privtx` | `container` | avoided |
| `service/*.java` (unchecked exceptions only) | `checkedtx` | `container` | avoided |
| `web/SystemController.java` | `notimeout` | `web` | fixed, contrast kept |
| every constructor | `fieldinj` | `container` | fixed, contrast kept |
| `config/BookstoreProperties.java` | `noprops` | `container` | fixed, contrast kept |

## Endpoints

### Catalog and the N+1 contrast

```bash
curl "http://localhost:8080/api/catalog/books/naive"
curl "http://localhost:8080/api/catalog/books/join-fetch"
curl "http://localhost:8080/api/catalog/books/1/categories"
curl "http://localhost:8080/api/catalog/books/1/copies"
```

`naive` walks the `book` list and touches each association inside the loop, so the report
shows the query count climbing. `join-fetch` returns the same rows with a single query. Both
responses carry a `queries` field measured with Hibernate statistics.

### Caching and eviction

```bash
curl "http://localhost:8080/api/catalog/categories"
curl -X POST "http://localhost:8080/api/catalog/categories" -H "Content-Type: application/json" -d '{"name":"Poetry"}'
curl "http://localhost:8080/api/catalog/categories"
curl -X POST "http://localhost:8080/api/catalog/categories/stale" -H "Content-Type: application/json" -d '{"name":"Epigrams"}'
curl "http://localhost:8080/api/catalog/categories"
curl -X PUT "http://localhost:8080/api/catalog/categories/1?name=Renamed"
```

`POST /categories` evicts the cache, so the following read is fresh. `POST /categories/stale`
skips eviction on purpose, so the following read is served from the stale cache. `PUT` evicts
only the single category entry, not the `all` list entry.

### Cart, orders, and stock

```bash
curl "http://localhost:8080/api/carts/1"
curl -X POST "http://localhost:8080/api/carts/1/items" -H "Content-Type: application/json" -d '{"bookId":1,"quantity":1}'

curl -X POST "http://localhost:8080/api/orders" -H "Content-Type: application/json" -d '{"userId":1,"paymentReference":"pay-1","lines":[{"bookItemId":1,"quantity":1}]}'
curl -X POST "http://localhost:8080/api/orders?mode=requires-new" -H "Content-Type: application/json" -d '{"userId":1,"paymentReference":"pay-2","lines":[{"bookItemId":2,"quantity":1}]}'
curl -X POST "http://localhost:8080/api/orders?mode=poison" -H "Content-Type: application/json" -d '{"userId":1,"paymentReference":"pay-3","lines":[{"bookItemId":9001,"quantity":1}]}'
curl "http://localhost:8080/api/orders/1"
curl "http://localhost:8080/api/orders/users/1"
```

`mode=required` uses the default `REQUIRED` propagation, `mode=requires-new` suspends the
outer transaction with `REQUIRES_NEW`, and `mode=poison` drives the inner transaction into
rollback-only so the outer commit fails with `UnexpectedRollbackException` and an RFC 7807
`unexpected-rollback` problem document. The `poison` path never reads the copy, so the copy
id in that request is arbitrary.

### Outbox relay and messaging

```bash
curl "http://localhost:8080/api/outbox"
curl "http://localhost:8080/api/outbox/pending"
curl "http://localhost:8080/api/outbox/handled"
curl -X POST "http://localhost:8080/api/outbox/relay"
```

The relay also runs on a schedule (`bookstore.orders.outbox-relay-delay-ms`, default 5000).
`relay-enabled: false` turns it off without touching the code.

### Async, scheduling, and the request context

```bash
curl -X POST "http://localhost:8080/api/system/receipts?orderId=1"
curl -X POST "http://localhost:8080/api/system/receipts/async-failure?orderId=1"
curl "http://localhost:8080/api/system/transaction-probe"
```

The first endpoint blocks on a `CompletableFuture` with an explicit 5 second timeout and
returns the caller and worker thread names plus the correlation id seen on each side, which
proves `CorrelationTaskDecorator` propagated the request context. The second endpoint
returns `202` and the failure only reaches `AsyncUncaughtExceptionHandler`.

### Configuration precedence

```bash
curl "http://localhost:8080/api/system/settings"
curl "http://localhost:8080/api/system/config/bookstore.catalog.currency"
curl "http://localhost:8080/api/system/config/bookstore.catalog.max-page-size"
curl "http://localhost:8080/api/system/precedence-layers"
```

`/config/{key}` reports the resolved value, the relaxed environment-variable form, the
camelCase form, the winning property source, and every layer that defines the key.

### Observability

```bash
curl "http://localhost:8080/actuator/health"
curl "http://localhost:8080/actuator/health/readiness"
curl "http://localhost:8080/actuator/health/liveness"
curl "http://localhost:8080/actuator/metrics"
```

Readiness includes `db` and `outbox`; liveness includes only `ping`, so a stalled outbox
never restarts the process.

## Deliberate mistakes reproduced

Each of these is intentional so the diagram id can be observed rather than only read.

- **Self-invocation bypasses advice.** `OrderService.applyOrderDiscount` is annotated
  `@Transactional` but is called from `placeOrder` on `this`, so no proxy is involved and no
  transaction is started for it. `TransactionProbe` counts the bypass and
  `GET /api/system/transaction-probe` exposes it.
- **N+1 select.** `CatalogService` reads the book list and then touches the author and
  categories per row. The endpoint reports the query count so the growth is visible, and
  `CatalogFetchService` sits next to it as the fix.
- **Rollback-only surprise.** The `mode=poison` path makes an inner `REQUIRED` transaction
  fail and swallow the exception. The outer transaction then fails at commit with
  `UnexpectedRollbackException` even though the code caught the inner failure.
- **Cache eviction forgotten.** `CategoryCommandService.createWithoutEviction` writes to the
  database but leaves the cache in place, which is what `POST /categories/stale` demonstrates.
- **Catch-all exception handler.** `ApiExceptionHandler.handleUnexpected` catches
  `Exception` and hides the real type behind a generic problem document. Validation,
  conflict, not-found, rollback, and unavailable cases each get a specific handler.
- **Mutable entities across the boundary.** The domain classes are mutable JavaBeans that
  are loaded, modified, and persisted inside the transaction, and the DTO records are the
  only thing that leaves the web layer.
- **Eager loading inside a long transaction.** `placeOrder` opens one transaction that
  loads the user, claims copies, loads books and copies again, recalculates totals, saves,
  records payment, and writes the outbox row before committing.
- **Mutable configuration properties.** `BookstoreProperties` and `RelayProperties` are
  plain setters on a validated `@ConfigurationProperties` bean rather than immutable
  constructor-bound records.

## Deliberate fixes kept beside the mistakes

- `CatalogFetchService` uses `join fetch`, so the same endpoint shape returns one query.
- `StockService.reserveCopyInNewTransaction` is called across a bean boundary, so the proxy
  applies `REQUIRES_NEW` correctly — the direct contrast with the self-invocation flaw.
- `OutboxService.recordOrderPlaced` uses `Propagation.MANDATORY`, so publishing an order
  event is impossible outside a transaction, and the row commits atomically with the order.
- `TransactionAwareEventPublisher` defers delivery until commit, so a rolled-back order never
  emits a message.
- `CorrelationTaskDecorator` copies the correlation id into the MDC of the worker thread, and
  `CorrelationIdFilter` seeds it per request and echoes it in the `X-Correlation-Id` response
  header.
- `ReceiptService.issueReceipt` declares `CompletableFuture<AsyncReceiptView>`, and
  `SystemController` waits with a 5 second timeout, mapping expiry to a 503 problem document.
- `BookstoreProperties` is `@Validated`, so a bad value fails at startup rather than at the
  first request.
- Every error response is an RFC 7807 `ProblemDetail` carrying the correlation id, and the
  `unexpected-rollback` document also carries the transaction-probe counters.
- `OutboxRelay.relayNow` is annotated `@Transactional` itself, so the REST entry point gets
  the same advice the scheduled entry point gets.

## Simplifications and deliberate omissions

- **No stub-based type-check.** `.stubs` and the `verify.*` scripts have been removed. They
  compiled the project against invented signatures and reported success for a class that does
  not exist in Spring. Everything is compiled and tested against the real dependencies.
- **No Lombok, no MapStruct, no generated code.** Entities expose hand-written accessors and
  mappers are plain static methods in `OrderViewMapper`.
- **The outbox has no real broker.** `TransactionAwareEventPublisher` stands in for the
  broker so the atomicity lesson survives without a message dependency; `RelayProperties.topic`
  names the topic that a real relay would publish to.
- **Outbox payloads are semicolon-delimited strings** rather than JSON, to keep the
  encode/decode path readable without a serialization dependency.
- **`BookCategory` is the only mapping of `book_categories`.** The join table is modelled as
  an entity with a composite `BookCategoryId`, matching the composite primary key in
  `schema.sql`. `Book.bookCategories` and `Category.bookCategories` are the two `@OneToMany`
  sides of that single mapping, and the fetch-plan query walks the path
  `b.bookCategories.category` in one round trip. A `@ManyToMany` with `@JoinTable` over the
  same table is deliberately *not* used: two mappings of one table is a startup hazard, and
  the diagram's "model the join table as an entity" node is better shown by one honest
  mapping than by two competing ones.
- **`CartItem` is a support entity.** The diagram models Cart as a single `user_id, book_id`
  table; a real cart needs a line identifier and a quantity, so a header/line pair is used
  while the `user` `1..1` `cart` cardinality is preserved.
- **No security starter.** `show-details: when-authorized` is configured, but without a
  security dependency the details are always visible; the health detail flag is present to
  document the production intent.
- **Outbox health reports backlog and relay state, not publish freshness.**
  `OutboxHealthIndicator` exposes the pending count against a backlog limit and the real
  `bookstore.outbox.relay-enabled` flag, and reports `DOWN` when the backlog is exceeded or
  the relay is switched off, because a disabled relay will eventually back the table up. It
  does not track when a publish last succeeded.
- **`QueryCounter` relies on Hibernate statistics**, which `application.yml` enables via
  `generate_statistics: true`. It is a teaching instrument and is not used in production code.
- **Tracing and metrics exporters are configured but not instrumented.** The
  `micrometer-registry-prometheus` and OpenTelemetry dependencies are not added, so
  `prometheus`, `tracing`, and `otel` map to configuration surface only.
- **The `@SpringBootTest` integration test is type-checked offline but was not executed**,
  because running it needs the real Spring context and a resolved dependency tree.

## Diagram nodes deliberately not implemented

The 13 mapped diagrams contain 123 node ids and 37 view ids. All 37 view ids and 113 node
ids are mapped above. The remaining 10 node ids are out of scope for a JDBC/Spring MVC
bookstore, and each is listed here so the gap is explicit rather than silent.

| Node id | Diagram | Why it is not implemented |
| --- | --- | --- |
| `nested` | `Spring_Boot_Transactions` | JPA has no real nested transaction manager. `NESTED` needs a `PlatformTransactionManager` that supports savepoints, and mapping it here would imply behaviour the stack does not provide. `REQUIRED` and `REQUIRES_NEW` are demonstrated instead. |
| `prometheus` | `Spring_Boot_Observability` | Needs `micrometer-registry-prometheus` plus a scrape endpoint. The `metrics` node is mapped instead. |
| `tracing` | `Spring_Boot_Observability` | Needs the OpenTelemetry agent and an exporter backend. |
| `otel` | `Spring_Boot_Observability` | Same as `tracing`; the correlation id in `CorrelationIdFilter` is the lightweight stand-in. |
| `restclient` | `Spring_Boot_Testing_Slices` | There is no outbound HTTP client in this service to test. |
| `testcontainers` | `Spring_Boot_Testing_Slices` | The project uses H2 so the whole suite can run offline; Testcontainers would need a Docker daemon. |
| `e2e` | `Spring_Boot_Testing_Slices` | An end-to-end test would need a running server and a resolved dependency tree. |
| `browser` | `Spring_Boot_Layers` | The caller side of the diagram is the browser, which is not a Java source file. `CorrelationIdFilter` is the first server-side layer. |
| `security` | `Spring_Boot_Layers` | No Spring Security dependency is included, so there is no security layer to show. |
| `blockingr2dbc` | `Spring_Boot_AntiPatterns` | The project is blocking JDBC on purpose, so the reactive-blocking trap has no reactive code to warn about. |


## Verification result

```
[INFO] Tests run: 15, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

## Layout

```
bookstore
├── Dockerfile
├── README.md
├── pom.xml
├── run.cmd
├── test.cmd
├── mvnw
├── mvnw.cmd
└── src
    ├── main
    │   ├── java
    │   │   └── com/example/bookstore
    │   │       ├── BookstoreApplication.java
    │   │       ├── config
    │   │       ├── domain
    │   │       ├── error
    │   │       ├── outbox
    │   │       ├── repository
    │   │       ├── service
    │   │       ├── support
    │   │       └── web
    │   └── resources
    │       ├── application-prod.yml
    │       ├── application.yml
    │       ├── data.sql
    │       └── schema.sql
    └── test
        └── java
            └── com/example/bookstore
                ├── repository
                ├── service
                └── web
```



## Regenerating the study assets

The diagrams do not fetch anything at runtime - `file://` blocks fetch and XHR -
so they read generated JavaScript files that live beside them in the notes folder.
Everything below is rebuilt by scripts in `../tools`, which resolve paths relative
to their own location and can be run from any working directory.

| Generated file | Holds | Built by |
| --- | --- | --- |
| `content-index.js` | node, edge, concept and code-link index for all 21 diagrams | `build-content-index.mjs` |
| `code-source.js` | every file any diagram links to, with line anchors and a structure outline | `build-code-viewer.mjs` |
| `evidence.js` | captured API responses, then the walkthrough steps | `capture-evidence.mjs` then `build-traces.mjs` |

### Order matters

`capture-evidence.mjs` writes `evidence.js` from scratch and `build-traces.mjs`
appends the walkthroughs to it. Run them in that order - running traces first
loses them on the next capture.

### Full rebuild

```bash
# 1. build the app (the wrapper brings its own Maven; only a JDK is required)
cd bookstore
./mvnw -B -q package -DskipTests
cd ..

# 2. capture real responses, then add the walkthroughs
node tools/capture-evidence.mjs
node tools/build-traces.mjs

# 3. mirror whatever the diagrams now point at
node tools/build-code-viewer.mjs

# 4. rebuild the index and re-tag the diagrams (idempotent)
node tools/build-content-index.mjs
node tools/enhance-hover.mjs
```

### What each script refuses to get wrong

**`capture-evidence.mjs`** clears whatever is already listening on port 8080 and
starts a fresh instance, so the numbers come from a newly seeded database instead
of a leftover process. When it finishes it confirms the app has really stopped and
force-kills it by pid if the ordinary kill does not take, so runs do not pile up.
It then refuses to overwrite `evidence.js` if the responses
disagree with what the diagrams teach: join-fetch must cost 1 query and be
byte-identical to the naive path, `mode=required` and `mode=requires-new` must
answer 201 with a transaction advice report, and `mode=poison` must answer 409.

**`build-code-viewer.mjs`** fails without writing anything when a hand-written
line anchor no longer matches the code, or when a file referenced by
`content-index.js` is not mirrored. That second rule is what keeps every diagram
code link opening in the in-page viewer rather than dumping a raw text file.

**`audit-links.mjs`** compares every mirrored file byte-for-byte with the file on
disk, so an edited source that was never re-mirrored fails the audit instead of
showing readers the previous version. It also re-checks each line anchor, each
trace step pattern and each explained-line note against the mirror, and requires
`evidence.js` to carry both its captured responses and its walkthrough traces.

**`enhance-hover.mjs`** skips pages it has already tagged, so re-running it is safe.

### Validation

```bash
node tools/audit-links.mjs          # links resolve AND generated files are not stale
node tools/probe-code-viewer.mjs    # 34 checks on the source viewer
node tools/probe-code-lab.mjs       # 30 checks on code, traces and quizzes
node tools/probe-hover.mjs          # hover passports on all 21 diagrams
node tools/probe-kit.mjs            # study kit regression
node tools/probe-hub.mjs            # hub and deep links
```

`run.cmd` and `test.cmd` start and test the app. Both prefer `mvn` when it is on
`PATH` and fall back to the committed Maven Wrapper, so a clean machine needs only
a JDK. Neither needs the project path to be free of spaces: the scripts `cd` to
their own directory and pass the jar as a relative path, so the project directory
name is never interpolated into a command line.