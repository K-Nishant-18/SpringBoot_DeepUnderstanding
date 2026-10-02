window.SB_CONCEPTS = {
  "self-invocation": {
    t: "Self-invocation bypasses the proxy",
    s: "Spring AOP is proxy-based: the advice lives in a generated subclass around the target bean, not inside the target itself. When a method calls another method of the same object through this, the call never leaves the target, so no proxy is consulted and no advice runs. This silently disables @Transactional, @Cacheable, @Async and @Retryable on the inner call.",
    refs: [
      ["Spring_Boot_AOP_Proxy", "service", "the OrderService target is where an internal call to a second method would stay inside the object and never re-enter the AOP proxy"],
      ["Spring_Boot_AntiPatterns", "selfinv", "the node that names the antipattern itself, caused by internal self-calls that skip the proxy"],
      ["Spring_Boot_Caching", "cacheproxy", "@Cacheable only works because the injected reference is the caching proxy, so a self-invoked method reads the repository and never consults the cache"],
      ["Spring_Boot_Async_Scheduling", "proxy", "@Async likewise needs a proxy, so a self-invoked annotated method runs synchronously on the caller thread"]
    ]
  },
  "proxy-bypass": {
    t: "How references bypass advice",
    s: "Every AOP-driven annotation in Spring is applied by an advice chain hung off a proxy that wraps the bean. Only calls that arrive through the proxy hit the interceptors, so how a reference is obtained decides whether the behaviour applies at all. Constructor injection of the proxy, not the target, is what keeps the behaviour reliable.",
    refs: [
      ["Spring_Boot_AOP_Proxy", "proxy", "the generated proxy is the only place where interceptors are invoked, so it is the single gate for tx, cache, async and retry advice"],
      ["Spring_Boot_AOP_Proxy", "caller", "the caller holds a reference to the proxy, which is why an external call is advised while an internal one is not"],
      ["Spring_Boot_Transactions", "outer", "OrderService is invoked through the transactional proxy, so the transaction advice on it is genuinely applied"],
      ["Spring_Boot_Bean_Lifecycle", "aware", "injected Aware dependencies are themselves proxy-aware, another way advice is reached without touching the target"],
      ["Spring_Boot_Layers", "aop", "shows the AOP proxy sitting as its own layer, wrapping whichever beans carry advice between the service and the repository"]
    ]
  },
  "transaction-boundary": {
    t: "Where a transaction starts and ends",
    s: "A transaction boundary is the public method annotated @Transactional on a proxied bean, and it is created by the transaction interceptor, not by your code. The boundary decides the connection acquisition, the commit point and which failures roll back, so placing it too low loses atomicity and placing it too high holds the connection and locks for far too long.",
    refs: [
      ["Spring_Boot_Transactions", "outer", "the outer public method is the annotated entry point that the transaction interceptor wraps"],
      ["Spring_Boot_Transactions", "outertx", "the outer TX node is the physical transaction the interceptor opened around that method"],
      ["Spring_Boot_Transactions", "inner", "StockService is a second proxied bean; calling it from outside re-enters the proxy and joins the existing transaction"],
      ["Spring_Boot_AntiPatterns", "privtx", "a private or final method is not proxied, so the annotation on it creates no boundary whatsoever"],
      ["Spring_Boot_Layers", "tx", "the @Transactional layer in the stack, where the boundary is normally drawn between the service and the repository"]
    ]
  },
  "propagation": {
    t: "Transaction propagation",
    s: "Propagation decides what happens when transactional code runs inside an existing transaction. REQUIRED joins the current one, REQUIRES_NEW suspends it and runs on a separate connection with its own commit, and NESTED opens a savepoint inside the same physical transaction. Choosing wrongly is how unexpected rollbacks and connection-pool exhaustion appear.",
    refs: [
      ["Spring_Boot_Transactions", "required", "REQUIRED joins the caller's transaction if one exists, so both methods share a single commit point"],
      ["Spring_Boot_Transactions", "requiresnew", "REQUIRES_NEW suspends the outer transaction and needs a second JDBC connection from the pool"],
      ["Spring_Boot_Transactions", "nested", "NESTED uses a savepoint, which requires a JDBC driver that supports savepoints and cannot span a JPA/JTA boundary"],
      ["Spring_Boot_Async_Scheduling", "proxy", "an @Async method starts on another thread with no surrounding transaction, so it always begins a fresh one"],
      ["Spring_Boot_AntiPatterns", "privtx", "an unproxied private method cannot propagate anything, so the caller's transaction silently covers it instead"]
    ]
  },
  "rollback-rules": {
    t: "What rolls back, and what does not",
    s: "By default Spring rolls back on unchecked RuntimeException and Error only; a checked exception commits unless rollbackFor is specified. A nested participating transaction that fails can also mark the whole outer transaction rollback-only, which then throws UnexpectedRollbackException at the outer commit, even though the outer code swallowed the inner failure.",
    refs: [
      ["Spring_Boot_Transactions", "rollback", "the rollback-only marker set on the shared transaction when a participating inner call fails"],
      ["Spring_Boot_Transactions", "poison", "UnexpectedRollbackException, raised at the outer commit because the transaction was already marked rollback-only"],
      ["Spring_Boot_AntiPatterns", "checkedtx", "assuming a checked exception triggers rollback, when the default rule only rolls back on unchecked exceptions"],
      ["Spring_Boot_AntiPatterns", "longtx", "a transaction held open across slow I/O keeps locks and the connection far longer than the work requires"],
      ["Spring_Boot_Transactions", "commit", "the commit point, where a poisoned transaction finally surfaces as an exception"]
    ]
  },
  "n-plus-one": {
    t: "N+1 queries",
    s: "An N+1 problem is one query for a collection plus one query per element, usually because a lazy association is touched inside a loop. It looks like a simple service method and can turn 200 rows into 201 database round trips, so latency grows linearly with page size and the connection pool is the first thing to saturate.",
    refs: [
      ["Spring_Boot_Nplus1", "loop", "the for-each loop over books is where each iteration triggers another round trip"],
      ["Spring_Boot_Nplus1", "query101", "the 101 queries for a page of 100 books plus one for the page itself"],
      ["Spring_Boot_AntiPatterns", "nplus1", "the antipattern entry, with the fix being fetch joins, entity graphs or projections instead"],
      ["Spring_Boot_Data_Model", "book", "Book is the root entity whose to-one or to-many association back to the author is what gets resolved lazily per row"]
    ]
  },
  "fetch-plan": {
    t: "Fetch plans and join fetching",
    s: "A fetch plan tells the persistence provider which associations to load together with the root query, so the object graph is materialised in one pass. @EntityGraph or a JPQL join fetch both push the join into the SQL, and a projection or a DTO constructor expression is better still when the data is only being read.",
    refs: [
      ["Spring_Boot_Nplus1", "joinfetch", "@EntityGraph or join fetch pulls the association into the single root query"],
      ["Spring_Boot_Nplus1", "onequery", "the single combined statement, one row set for books and authors together"],
      ["Spring_Boot_Nplus1", "controller", "the request that triggers the loading, and therefore the fetch plan that matters for its latency"],
      ["Spring_Boot_Data_Model", "bookcategory", "book_category is the explicit join table that a join fetch can traverse for a many-to-many"],
      ["Spring_Boot_Data_Model", "category", "Category is the collection side whose members are loaded by the plan instead of lazily per row"]
    ]
  },
  "lazy-loading": {
    t: "Lazy loading and the persistence context",
    s: "A lazy association is a proxy resolved against the open persistence context, so touching it outside a transaction or after the session closes throws LazyInitializationException. Lazy is the right default for collections, but it moves the cost to the worst possible place unless the session and the transaction are scoped together.",
    refs: [
      ["Spring_Boot_Data_Model", "book", "Book's association back to its author is proxied until first dereferenced"],
      ["Spring_Boot_Nplus1", "service", "the service method that iterates the books, where each dereference becomes a separate query"],
      ["Spring_Boot_AntiPatterns", "eagermany", "EAGER on a to-many association, the opposite mistake, which joins huge collections into every query and paginates incorrectly"],
      ["Spring_Boot_Nplus1", "query101", "the resulting query storm, the observable cost of lazy loading inside a loop"]
    ]
  },
  "dto-mapping": {
    t: "DTOs at the API boundary",
    s: "A DTO is a purpose-built request and response type that keeps the persistence model out of the API contract. It prevents lazy-loading failures during serialization, blocks mass assignment, controls exactly which fields are exposed, and lets the API evolve without a schema migration. Mapping happens explicitly in the service or via a mapper, never by handing entities to Jackson.",
    refs: [
      ["Spring_Boot_Layers", "dto", "the DTO plus validation layer between the controller and the service, annotated with JSR-380 constraints"],
      ["Spring_Boot_Data_Model", "payment", "Payment is a sensitive aggregate that should be projected into a response type rather than serialized directly"],
      ["Spring_Boot_AntiPatterns", "mutableentity", "the antipattern of returning entities straight from the API and coupling the contract to the schema"],
      ["Spring_Boot_Request_Path", "controller", "the controller that converts between the HTTP payload and the DTO before touching the service"],
      ["Spring_Boot_Layers", "controller", "the controller layer that owns the mapping responsibility"]
    ]
  },
  "constructor-injection": {
    t: "Constructor injection",
    s: "Constructor injection makes dependencies explicit, is required for immutable final fields, and fails fast at startup instead of at first use. A final field also means the bean cannot be subclassed after construction, so CGLIB can still proxy it for @Transactional and @Cacheable; field or setter injection breaks both guarantees.",
    refs: [
      ["Spring_Boot_Startup", "wire", "the dependency injection step of the refresh, where constructor arguments are resolved for every bean"],
      ["Spring_Boot_Bean_Lifecycle", "populate", "population happens before initialization callbacks, and constructor injection resolves at instantiation time"],
      ["Spring_Boot_AntiPatterns", "fieldinj", "field injection hides dependencies, leaves fields mutable and breaks CGLIB proxying of the bean"],
      ["Spring_Boot_AOP_Proxy", "proxy", "the CGLIB proxy can only be created when the target's fields are final, which requires constructor injection"]
    ]
  },
  "conditional-beans": {
    t: "Conditional beans",
    s: "A conditional bean exists only when a predicate matches, which lets the context adapt to the classpath, the web application type and the user's own configuration. This is how an auto-configuration stays out of the way of an application, and how an application swaps one implementation for another without profiles.",
    refs: [
      ["Spring_Boot_Startup", "conditional", "the conditional evaluation during refresh that decides whether a definition is registered at all"],
      ["Spring_Boot_AutoConfiguration", "beancond", "@ConditionalOnMissingBean backs off when the application already declares its own bean"],
      ["Spring_Boot_AutoConfiguration", "backoff", "the user bean wins because the auto-configuration's condition is now false"],
      ["Spring_Boot_Startup", "nobean", "the outcome when the condition fails and the bean is simply absent"],
      ["Spring_Boot_AutoConfiguration", "webcond", "@ConditionalOnWebApplication gates a bean to servlet or reactive web applications"]
    ]
  },
  "bean-lifecycle": {
    t: "Bean lifecycle callbacks",
    s: "A bean's life runs definition, instantiation, population, initialization, ready and destruction, with callbacks firing in a fixed order. @PostConstruct and InitializingBean run before the bean is exposed to others, and @PreDestroy plus DisposableBean run only on a clean context or JVM shutdown, not on a kill -9.",
    refs: [
      ["Spring_Boot_Bean_Lifecycle", "postconstruct", "@PostConstruct, the first callback after the bean is fully populated and dependencies are injected"],
      ["Spring_Boot_Bean_Lifecycle", "beforeinit", "before initialization, where the population has happened but the bean is not yet usable by others"],
      ["Spring_Boot_Bean_Lifecycle", "afterinit", "afterPropertiesSet, the second half of initialization before the singleton is published"],
      ["Spring_Boot_Bean_Lifecycle", "destroyed", "destruction, driven by @PreDestroy, DisposableBean or a destroy method on a graceful shutdown"],
      ["Spring_Boot_Startup", "bean", "bean creation during context refresh, the phase the whole lifecycle runs inside"]
    ]
  },
  "configuration-precedence": {
    t: "Configuration precedence order",
    s: "Spring Boot merges configuration sources into one Environment and later sources win. The rough order is defaults in code, then packaged application.properties, then profile-specific files and imports, then environment variables, then OS environment, then system properties, then command line arguments, then JNDI and servlet parameters. Knowing the order is what makes a surprising value explainable.",
    refs: [
      ["Spring_Boot_Config_Properties", "defaults", "default values declared in code, the lowest-precedence source"],
      ["Spring_Boot_Config_Properties", "appprops", "the packaged application.properties, which overrides the in-code defaults"],
      ["Spring_Boot_Config_Properties", "profileprops", "application-<profile>.properties, which beats the base file and is selected by the active profile"],
      ["Spring_Boot_Config_Properties", "cmdline", "command line arguments, near the top of the precedence order"],
      ["Spring_Boot_Deployment", "configsource", "in a cluster the config source is externalised, so the operator-supplied source outranks the image's baked-in file"]
    ]
  },
  "type-safe-configuration": {
    t: "Type-safe configuration properties",
    s: "A @ConfigurationProperties record or class binds a whole group of related keys to one typed object, validated at startup with JSR-380 annotations. Binding uses relaxed rules, so server.port, SERVER_PORT and server.port in a YAML list all resolve to the same field. It replaces scattered @Value injections, which cannot be validated and fail only when the bean is first used.",
    refs: [
      ["Spring_Boot_Config_Properties", "relaxed", "relaxed binding, which normalises kebab-case, camelCase, underscore and uppercase env-var forms onto the same field"],
      ["Spring_Boot_Config_Properties", "configprops", "the @ConfigurationProperties record that gives the whole group a type"],
      ["Spring_Boot_Config_Properties", "validation", "@Validated plus JSR-380 constraints, so a missing or malformed key fails the context at startup"],
      ["Spring_Boot_AntiPatterns", "noprops", "the antipattern of scattering @Value across a config group with no validation and no cohesion"],
      ["Spring_Boot_Deployment", "configsource", "a grouped properties object is what lets an external config source override the group coherently per environment"]
    ]
  },
  "bean-conflict": {
    t: "Bean conflicts and ordering",
    s: "A conflict is several auto-configurations, or an auto-configuration and your own class, defining the same bean type. Auto-configurations are sorted with @AutoConfigureBefore and @AutoConfigureAfter, and the recommended pattern is for library code to use @ConditionalOnMissingBean so it always defers to a user-defined bean of the same type.",
    refs: [
      ["Spring_Boot_Startup", "conflict", "the conflict at startup, where a definition is overridden or the context fails with a non-unique type"],
      ["Spring_Boot_AutoConfiguration", "ordering", "ordering annotations that make auto-configuration dependencies explicit and deterministic"],
      ["Spring_Boot_AutoConfiguration", "candidates", "the candidate set that ordering and conditions are then applied to"],
      ["Spring_Boot_AutoConfiguration", "backoff", "the resolution: the auto-configuration condition becomes false and your bean is used"]
    ]
  },
  "actuator-probes": {
    t: "Actuator and health probes",
    s: "spring-boot-starter-actuator exposes management endpoints over HTTP or JMX, most importantly /actuator/health. Liveness and readiness are separate health groups with configurable include lists: liveness answers should the process be restarted, readiness should it receive traffic, and pulling the DataSource check out of readiness avoids a brief database blip cycling the whole fleet.",
    refs: [
      ["Spring_Boot_Observability", "liveness", "the liveness probe, which should only fail on a state restart cannot fix"],
      ["Spring_Boot_Observability", "readiness", "the readiness probe, which decides whether the instance is added to the load balancer"],
      ["Spring_Boot_Observability", "health", "the composite /actuator/health result contributed to by each HealthIndicator"],
      ["Spring_Boot_Observability", "dbhealth", "the DataSource health indicator, commonly moved out of the readiness group"],
      ["Spring_Boot_Deployment", "probes", "the orchestrator's liveness and readiness probes wired to those endpoints"]
    ]
  },
  "metrics": {
    t: "Micrometer metrics and Prometheus",
    s: "Micrometer is the instrumentation facade in the Spring ecosystem, and the actuator publishes its registry at /actuator/prometheus in the OpenMetrics text format for Prometheus to scrape. It also auto-instruments the HTTP server, the data source, the cache and the task executors, so a thread-pool saturation problem shows up as a metric rather than as a mystery.",
    refs: [
      ["Spring_Boot_Observability", "metrics", "the /actuator/metrics endpoint that exposes the individual meters of the registry"],
      ["Spring_Boot_Observability", "micrometer", "the Micrometer facade and its in-memory registry, the common core of every observation"],
      ["Spring_Boot_Observability", "prometheus", "the scrape endpoint in Prometheus exposition format"],
      ["Spring_Boot_Observability", "actuator", "the starter that activates all the management endpoints"],
      ["Spring_Boot_Async_Scheduling", "custompool", "a bounded TaskExecutor is auto-instrumented, so queue depth and active count are visible as meters"]
    ]
  },
  "tracing": {
    t: "Distributed tracing",
    s: "OpenTelemetry instruments the framework to create a span per request, per repository call and per message, and injects or extracts the trace context across every boundary, including thread pools and brokers. The correlation identifier also belongs in structured log output, so a log line can be pivoted back to the trace and the trace back to the logs.",
    refs: [
      ["Spring_Boot_Observability", "tracing", "the tracing observation, which nests spans around the auto-instrumented framework calls"],
      ["Spring_Boot_Observability", "otel", "the OpenTelemetry SDK, with a bridge plus a collector as the usual production setup"],
      ["Spring_Boot_Observability", "logs", "structured logs, where the trace and span ids are fields so a log line can be pivoted to the trace"],
      ["Spring_Boot_Messaging", "consumer", "a consumer that continues the producer's trace, with context carried in the message headers"],
      ["Spring_Boot_Request_Path", "filter", "the servlet filter layer, where the incoming traceparent header is extracted into the current context"]
    ]
  },
  "thread-pool": {
    t: "Thread pools and their bounds",
    s: "Every @Async and @Scheduled call lands on a TaskExecutor, and the default is a small auto-configured pool, so unrelated tasks queue behind each other. A dedicated pool per workload class with explicit core, max, queue capacity and rejection policy is what makes the system predictable, and it must be sized against the real database connection pool, not against core count alone.",
    refs: [
      ["Spring_Boot_Async_Scheduling", "custompool", "a dedicated executor with explicit core size, queue capacity and rejection policy"],
      ["Spring_Boot_Async_Scheduling", "executor", "the auto-configured TaskExecutor that @Async calls are routed to by default"],
      ["Spring_Boot_Deployment", "jvm", "the JVM limits that bound how many threads can be created, and the heap they all share"],
      ["Spring_Boot_WebFlux", "scheduler", "the Reactor schedulers, bounded separately and consumed by blocking offload operators"]
    ]
  },
  "context-propagation": {
    t: "Context propagation across threads",
    s: "A security context, MDC trace ids and request-scoped beans live in a ThreadLocal, so a task handed to another thread silently loses them. Spring's TaskDecorator and the context-propagation library copy the ExecutionContext into the worker and clear it afterwards, which is what makes logs traceable and authorization decisions correct inside async work.",
    refs: [
      ["Spring_Boot_Async_Scheduling", "taskdecorator", "TaskDecorator, the hook that captures context at submit time and installs it on the worker thread"],
      ["Spring_Boot_Async_Scheduling", "contextprop", "the explicit context-propagation step that copies and restores around the callable"],
      ["Spring_Boot_Security_JWT", "ctx", "the SecurityContextHolder, a ThreadLocal that would otherwise be empty on the worker thread"],
      ["Spring_Boot_Messaging", "consumer", "a listener thread, another place the context must be restored explicitly before the handler runs"]
    ]
  },
  "at-least-once-delivery": {
    t: "At-least-once delivery and idempotency",
    s: "A broker guarantees redelivery, not exactly-once: a consumer can crash after doing the work but before committing its offset, so the message arrives again. Handlers must therefore be idempotent, keyed on a message id or a natural business key, and must never swallow an exception, because a swallowed failure re-queues or drops the message depending on the ack mode.",
    refs: [
      ["Spring_Boot_Messaging", "broker", "the topic, whose redelivery behaviour is what makes the guarantee at-least-once rather than exactly-once"],
      ["Spring_Boot_Messaging", "consumer", "the @KafkaListener whose offset commit must follow, not precede, the work"],
      ["Spring_Boot_Messaging", "handler", "the handler that has to be idempotent because the same event can arrive twice"],
      ["Spring_Boot_Messaging", "sideeffect", "the side effect, typically the call or charge that must not happen twice on a redelivery"],
      ["Spring_Boot_AntiPatterns", "catchall", "swallowing the exception breaks the retry loop and hides the real failure from both the broker and the operator"]
    ]
  },
  "transactional-outbox": {
    t: "Transactional outbox pattern",
    s: "Publishing to a broker and writing to the database are two separate systems, so a direct publish either loses the message on a crash after commit or sends it for a transaction that rolled back. Writing the event to an outbox table inside the same transaction makes both atomic, and a relay then reads the committed rows and publishes them, with consumers deduplicating for the small at-least-once window.",
    refs: [
      ["Spring_Boot_Messaging", "outbox", "the outbox table written in the same transaction as the business data"],
      ["Spring_Boot_Messaging", "relay", "the relay that polls committed outbox rows and publishes them to the broker"],
      ["Spring_Boot_Messaging", "db", "the database, whose transaction gives the outbox row and the business row atomic commit"],
      ["Spring_Boot_Transactions", "outertx", "the transaction the outbox insert joins, which is what makes the write atomic with the order"],
      ["Spring_Boot_Messaging", "service", "the service that writes the outbox row rather than publishing directly"]
    ]
  },
  "cache-coherence": {
    t: "Cache coherence and eviction",
    s: "A cache is a second copy of the data, so every write path has to invalidate or update the right entry. @CacheEvict runs through the same proxy caveat as every other advice, and a cached value loaded inside a transaction can outlive a rollback, because eviction is not automatically rolled back. Versioned keys, short TTLs and evicting after commit are the usual defences.",
    refs: [
      ["Spring_Boot_Caching", "cache", "the cache itself, the second copy that can drift from the row it was loaded from"],
      ["Spring_Boot_Caching", "cacheproxy", "the caching proxy that applies @Cacheable and @CacheEvict, and the reason self-invocation breaks eviction"],
      ["Spring_Boot_Caching", "evictor", "@CacheEvict, which must be reached through the proxy and timed correctly relative to the commit"],
      ["Spring_Boot_Caching", "cachemgr", "the CacheManager, where key generation, TTLs and per-cache configuration are set"],
      ["Spring_Boot_Messaging", "handler", "a message-driven change reaches the database without passing through the caching proxy, so it must evict explicitly"]
    ]
  },
  "test-slice": {
    t: "Test slices",
    s: "Spring Boot test slices load a deliberately partial auto-configuration, so a test runs in milliseconds without booting the whole context. @WebMvcTest brings up the web layer with mocked collaborators, @DataJpaTest an embedded database with a real JPA layer, and @JsonTest only the Jackson infrastructure. Each slice fails fast when a layer under test quietly starts depending on one it should not.",
    refs: [
      ["Spring_Boot_Testing_Slices", "mvc", "the plain MVC slice, the baseline that the specialised slices refine"],
      ["Spring_Boot_Testing_Slices", "webmvc", "@WebMvcTest, which auto-configures the web layer and mocks the service and repository"],
      ["Spring_Boot_Testing_Slices", "datajpa", "@DataJpaTest, which wires a real JPA layer against an embedded database"],
      ["Spring_Boot_Testing_Slices", "jsonb", "@JsonTest, which boots only the Jackson serialization support"],
      ["Spring_Boot_Layers", "dto", "the DTO layer, whose serialization and validation are what @JsonTest and @WebMvcTest actually cover"]
    ]
  },
  "test-doubles": {
    t: "Test doubles and test containers",
    s: "Fakes at the edges, real infrastructure inside, is the rule that keeps tests both fast and trustworthy. @MockBean replaces a collaborator whose implementation is not under test, while Testcontainers or an embedded database gives a genuinely real dependency when behaviour, dialect or transactions are what matter. An end-to-end test covers only the critical path, because it is the slowest and the most brittle.",
    refs: [
      ["Spring_Boot_Testing_Slices", "mocks", "mocking the edges, the collaborators that are not what the test is asserting on"],
      ["Spring_Boot_Testing_Slices", "integration", "@SpringBootTest, the full context, the slowest but most faithful option"],
      ["Spring_Boot_Testing_Slices", "testcontainers", "a disposable real database in a container, so dialect and transaction behaviour are genuine"],
      ["Spring_Boot_Testing_Slices", "e2e", "the end-to-end test, reserved for the critical path"],
      ["Spring_Boot_Deployment", "db", "the production database, whose real dialect makes a container-backed test worth its cost"]
    ]
  },
  "container-startup": {
    t: "Container startup and shutdown",
    s: "In a container the JVM starts cold and the readiness probe is the only gate on traffic, so slow context refresh becomes visible as a rollout stall. The JVM heap and GC settings must be sized for the container memory limit rather than host memory, and graceful shutdown plus termination grace is what lets in-flight requests drain instead of being severed mid-transaction.",
    refs: [
      ["Spring_Boot_Deployment", "pod", "the pod, whose readiness gate controls when the load balancer starts sending traffic"],
      ["Spring_Boot_Deployment", "jvm", "the JVM, whose heap must be sized against the container memory limit, not the host"],
      ["Spring_Boot_Deployment", "graceful", "graceful shutdown, which stops accepting new work and drains in-flight requests"],
      ["Spring_Boot_Startup", "run", "the run phase of the JVM entry point, where the context refresh begins"],
      ["Spring_Boot_Startup", "ready", "the ready state, which corresponds to the readiness probe the orchestrator polls"]
    ]
  },
  "jakarta-migration": {
    t: "Jakarta EE migration in Boot 3",
    s: "Spring Boot 3 requires Java 17 and moved every EE API from the javax namespace to jakarta, so the packages, imports and artifact coordinates all change at once. Auto-configuration registration moved from the legacy spring.factories file to the new AutoConfiguration.imports file, and some properties were renamed. The safe path is to bump the BOM, fix the namespace, then let the compiler find the rest.",
    refs: [
      ["Spring_Boot_Migration_3", "namespace", "javax to jakarta, the defining change of the Boot 2 to Boot 3 upgrade"],
      ["Spring_Boot_Migration_3", "deps", "the dependency change, driven by the Spring Boot 3 BOM and the Jakarta-based starters"],
      ["Spring_Boot_Migration_3", "config", "spring.factories replaced by the AutoConfiguration.imports file for third-party starters"],
      ["Spring_Boot_Migration_3", "props", "the property renames and removed keys that surface at runtime rather than compile time"],
      ["Spring_Boot_Config_Properties", "appprops", "the application.properties file where the renamed keys must be updated"]
    ]
  },
  "blocking-in-reactive": {
    t: "Blocking inside a reactive pipeline",
    s: "WebFlux and R2DBC are non-blocking end to end, and the event loop threads must never block. A blocking JPA call, JDBC query or RestTemplate on an event loop starves every other stream assigned to that thread, so symptoms are random latency spikes and thread dumps full of BLOCKED event loops. Either stay reactive throughout or offload to boundedElastic with a timeout.",
    refs: [
      ["Spring_Boot_AntiPatterns", "blockingr2dbc", "the antipattern, a blocking call executed on an event loop thread"],
      ["Spring_Boot_WebFlux", "bridge", "the bridge, the JPA or blocking client mixed into a reactive chain"],
      ["Spring_Boot_WebFlux", "jpa", "JPA and Hibernate, inherently blocking and therefore not usable on an event loop"],
      ["Spring_Boot_WebFlux", "r2dbc", "R2DBC, the non-blocking driver that keeps the whole path reactive"],
      ["Spring_Boot_WebFlux", "scheduler", "the bounded schedulers used to offload blocking work off the event loop"]
    ]
  },
  "timeout-budget": {
    t: "Timeout budget",
    s: "Without timeouts a request waits for the slowest dependency for as long as the connection pool and the client allow, so one slow database turns into unbounded thread growth and a cascading outage. Every outbound call needs an explicit connect and read timeout, a reactive call needs a Mono.timeout, and the values should compose into a total budget per request rather than each being generous on its own.",
    refs: [
      ["Spring_Boot_AntiPatterns", "notimeout", "the antipattern, an outbound call with no timeout at all"],
      ["Spring_Boot_WebFlux", "mono", "Mono.timeout and Flux.timeout, the reactive way to bound a stage of the chain"],
      ["Spring_Boot_Deployment", "probes", "probe timeouts and failure thresholds, which must be tighter than the load balancer's own"],
      ["Spring_Boot_Observability", "metrics", "latency histograms, which is how a timeout budget gets tuned from real percentiles"]
    ]
  },
  "filter-chain": {
    t: "Servlet filter chain and security entry point",
    s: "Every HTTP request enters through the servlet filter chain before the DispatcherServlet, and that chain is where Spring Security lives. The JWT filter validates the token and populates the SecurityContext, the security filter chain authorises the route, and the AuthenticationEntryPoint is what produces the 401 when authorisation fails. Filters run in declared order and a mistake there is invisible in the controller layer.",
    refs: [
      ["Spring_Boot_Security_JWT", "filter", "the JwtFilter, the OncePerRequestFilter that validates the token and populates the context"],
      ["Spring_Boot_Security_JWT", "chain", "the SecurityFilterChain, whose matchers and order decide what is public and what is authenticated"],
      ["Spring_Boot_Security_JWT", "entrypoint", "the entry point, which returns the 401 instead of letting the request reach the dispatcher"],
      ["Spring_Boot_Request_Path", "filter", "the filter stage of the request path, before the dispatcher is ever reached"],
      ["Spring_Boot_Layers", "security", "the security layer in the stack, drawn as the first hop after the client"]
    ]
  }
};
