import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// Archify rich-hover enhancer.
// Injects a beautiful floating detail card into each delivered diagram.
// Adds nothing to the SVG geometry: it reads existing data-node-* / data-edge-*
// attributes, adds transparent hit strokes for edges, and renders an HTML card.

import { readFileSync, writeFileSync } from 'node:fs';
import NEW from './hover-data-new.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const DIR = join(ROOT, 'site');

const ACCENT = {
  frontend: '#22d3ee', backend: '#34d399', database: '#a78bfa', cloud: '#fbbf24',
  security: '#fb7185', messagebus: '#fb923c', external: '#94a3b8',
  // lifecycle state kinds
  start: '#22d3ee', active: '#34d399', decision: '#fbbf24', success: '#34d399', failure: '#fb7185',
};
const VARIANT = { emphasis: '#34d399', security: '#fb7185', dashed: '#fb923c', default: '#22d3ee' };

// ---------------------------------------------------------------- content
const DATA = {

Spring_Boot_Startup: {
nodes: {
main: { t: 'Your code', s: 'The class annotated @SpringBootApp. Everything in its package and below is scanned.', b: ['@SpringBootApplication = @Configuration + @ComponentScan + @EnableAutoConfiguration', 'Component scanning starts here and walks down the package tree', 'Keep it in the root package, or scanning silently misses your beans'] },
run: { t: 'Framework', s: 'SpringApplication.run() is the single entry point that drives the whole boot sequence.', b: ['Infers the web application type from what is on the classpath', 'Publishes lifecycle events other components listen to', 'Returns the ApplicationContext so you can look things up'] },
context: { t: 'Container', s: 'The ApplicationContext - an empty bean factory that is about to be filled.', b: ['Holds every bean definition, then every singleton instance', 'Refresh is the phase that actually instantiates anything', 'Refreshed once per context; a second refresh reuses cached singletons'] },
autoconfig: { t: 'Auto-configuration', s: 'Third-party configuration classes that fill in beans you never wrote.', b: ['Each contributes @Bean methods guarded by @Conditional checks', 'Contributions are ordinary config classes, so you can override them', 'This is why you get a DataSource without writing one'] },
conditional: { t: '@Conditional', s: 'The gate that every auto-configured bean sits behind.', b: ['Class present, property set, web app type - evaluated before the bean is defined', 'A false condition means the class is skipped entirely', 'The ConditionEvaluationReport tells you why something did not appear'] },
bean: { t: 'Bean definition', s: 'Beans are created here, in definition order, by the container.', b: ['@Bean methods and @Component classes both become bean definitions', '@ConfigurationProperties binding also happens at this point', 'Dependency resolution decides the real creation order'] },
wire: { t: 'Dependency injection', s: 'Constructor injection satisfies each dependency with already-created beans.', b: ['Constructor injection means final fields and no half-initialized object', 'Circular dependencies are a design smell that surfaces here', 'A missing dependency fails the context, not the request'] },
server: { t: 'Servlet container', s: 'The embedded Tomcat is started and bound to the configured port.', b: ['Embedded server: no WAR, no external servlet container', 'Port and context path come from properties or the environment', 'Started late, once everything is already registered'] },
ready: { t: 'Ready', s: 'The context is refreshed and the application is accepting requests.', b: ['ApplicationReadyEvent fires after the web server is listening', 'Readiness probes and the banner report on this state', 'From here every request goes through the full filter chain'] },
conflict: { t: 'Failure mode', s: 'The condition evaluated false - usually a bad profile or a missing property.', b: ['Nothing is registered, so injection later fails with NoSuchBeanDefinition', 'Check the auto-configuration report rather than guessing', 'A typo in a profile name is the usual culprit'] },
nobean: { t: 'Failure mode', s: 'Autowiring failed: no bean of the required type exists.', b: ['Read the error bottom-up - the top is just the dependency chain', 'Usually a missing @Service, or an unsatisfied @Conditional', 'Fails fast at startup instead of on the first request'] },
portbusy: { t: 'Failure mode', s: 'The port is already taken, so binding fails and startup aborts.', b: ['Fix with server.port=0 for a random port, or free the port', 'Often the only failure you hit after the context is otherwise healthy', 'Tomcat is the usual culprit, not Spring itself'] },
},
edges: [
{ s: 'main() calls run() - the only line you actually write.' },
{ s: 'run() creates the context and triggers component scanning.' },
{ s: 'With the context created, auto-configuration is evaluated.' },
{ s: 'Each candidate is tested against its conditions.' },
{ s: 'A true condition means the @Bean methods get defined.' },
{ s: 'A false condition means those beans are never created - the silent path.' },
{ s: 'Bean definitions are instantiated, then wired together.' },
{ s: 'Injection failed: no bean of the required type.' },
{ s: 'The context is fully refreshed, so the web server can start.' },
{ s: 'Listening - the application now serves requests.' },
{ s: 'Binding failed because something already owns the port.' },
] },

Spring_Boot_Bean_Lifecycle: {
nodes: {
defined: { t: 'Metadata', s: 'A BeanDefinition exists - a name and property values, but no object yet.', b: ['Created by component scanning or an @Bean method', 'Nothing is instantiated; the definition is only a record', 'getBean() later walks these definitions'] },
instantiate: { t: 'Constructor', s: 'The object is constructed - but its dependencies are still null.', b: ['Constructor selection happens here', 'Field injection has not run yet', 'An exception here stops the whole refresh'] },
populate: { t: '@Autowired', s: 'Dependencies are injected into fields or constructor arguments.', b: ['Field injection runs after construction, so the object was briefly invalid', 'Constructor injection is better: final fields, no null window', 'Circular dependencies are detected here'] },
aware: { t: 'Callback', s: 'Aware interfaces hand the container itself to the bean.', b: ['ApplicationContextAware gives access to other beans', 'Useful for legacy code, often an escape hatch', 'Prefer injecting what you actually need'] },
beforeinit: { t: 'BPP hook', s: 'BeanPostProcessors get a chance to change the bean before initialisation.', b: ['Runs after injection, before @PostConstruct', 'AOP proxy creation happens in after-init instead', 'Third-party libraries hook in here'] },
postconstruct: { t: '@PostConstruct', s: '@PostConstruct runs once the bean is fully wired and ready.', b: ['The right place for validation and derived state', 'Should not need other beans - use @DependsOn for that', 'Only runs for managed beans, not objects you construct yourself'] },
afterinit: { t: 'BPP hook', s: 'BeanPostProcessors wrap the bean - this is where the AOP proxy is born.', b: ['postProcessAfterInit returns the proxy, not the target', 'From here on, every injected reference is the proxy', 'Anything doing this forces the object to be non-final'] },
ready: { t: 'Published', s: 'The singleton is published and cached for the rest of the context\'s life.', b: ['getBean returns the cached proxy, not a new object', 'Published before the context finishes refreshing', 'Destroyed only when the context closes'] },
destroyed: { t: '@PreDestroy', s: 'On context close, @PreDestroy and DisposableBean run in reverse.', b: ['Only for beans the container created', 'Closes connections, stops schedulers, flushes buffers', 'Order is not guaranteed between dependent beans'] },
},
edges: [
{ s: 'Refresh instantiates the definition.' },
{ s: 'Injection fills in the dependencies.' },
{ s: 'The bean receives a handle to the container.' },
{ s: 'Before-init callbacks run.' },
{ s: 'The bean initialises itself.' },
{ s: 'After-init callbacks run - the proxy is created here.' },
{ s: 'The proxy is published into the singleton cache.' },
{ s: 'Context close runs destruction callbacks in reverse order.' },
] },

Spring_Boot_AOP_Proxy: {
nodes: {
caller: { t: 'Consumer', s: 'Holds a reference to the proxy, never to the raw target object.', b: ['Injected by type, so the proxy satisfies the interface', 'This is exactly why self-invocation fails: the call never leaves the proxy', 'A field or constructor parameter is always the proxy'] },
proxy: { t: 'Infrastructure', s: 'A generated subclass that decides when the real target is invoked.', b: ['CGLIB subclasses the class; JDK proxies implement the interface', 'Interceptors run here, in a defined order', 'Only external calls pass through it'] },
tx: { t: 'Interceptor', s: 'The @Transactional advisor: opens, commits or rolls back the transaction.', b: ['Reads the propagation attribute to decide join, suspend or create', 'Marks the transaction rollback-only when the method throws', 'Ordering against other advisors matters when annotations stack'] },
service: { t: 'Your code', s: 'The real OrderService - the object the proxy wraps.', b: ['Holds the business logic and knows nothing about the proxy', 'Private and final methods cannot be advised', 'Calling an @Transactional method internally bypasses the advice entirely'] },
repo: { t: 'Data access', s: 'The JDBC or JPA call that actually writes the row.', b: ['Participates in whatever transaction is bound to the thread', 'Participates by default - it never starts its own', 'The write and its transaction commit together'] },
},
edges: [
{ s: 'placeOrder() - the call goes to the proxy, not to the target.' },
{ s: 'The proxy dispatches to its interceptors; the transaction starts here.' },
{ s: 'The real target method finally executes.' },
{ s: 'BEGIN is issued on the thread-bound connection.' },
{ s: 'The repository writes inside that same connection.' },
{ s: 'The write returns; nothing is committed yet.' },
{ s: 'Returning normally means no exception, so nothing is marked rollback-only.' },
{ s: 'COMMIT is issued - the write becomes visible.' },
{ s: 'The proxy returns the result.' },
{ s: 'The caller receives a DTO, never a managed entity.' },
] },

Spring_Boot_Nplus1: {
nodes: {
controller: { t: 'Naive', s: 'GET /books returns a list of books - and looks completely innocent.', b: ['One HTTP request in, one response out', 'The cost is hidden inside the serialization step', 'Nothing here looks wrong when you read the code'] },
service: { t: 'Naive', s: 'findAll() loads the books, then a getter is called per book while rendering.', b: ['repository.findAll() is a single query - that part is fine', 'The problem is the lazy author access that follows', 'The transaction closes before rendering, so lazy loading throws'] },
loop: { t: 'The loop', s: 'For each book, the serializer calls getAuthor() - once per row.', b: ['100 books means 100 lazy proxy initialisations', 'Each one is a separate round trip to the database', 'Hibernate fires them one at a time, not batched'] },
query101: { t: '101 queries', s: 'One query for the books, then 100 more for the authors.', b: ['The classic N+1: N+1 queries for N rows', 'Latency compounds: 100 sequential round trips', 'Total time grows linearly with result size'] },
fixedservice: { t: 'Fixed', s: 'The same endpoint with the fetch plan declared up front.', b: ['Same controller, same endpoint, same response shape', 'The fix is in the fetch plan, not in the loop', 'No per-entity access during serialization'] },
joinfetch: { t: 'Fetch plan', s: '@EntityGraph or a join fetch tells Hibernate what to load eagerly.', b: ['join fetch in JPQL, or @EntityGraph on the repository method', 'ToMany fetches need distinct=true and duplicated rows removed', 'Fetching a collection with pagination loads everything, then paginates in memory'] },
onequery: { t: '1 query', s: 'A single SELECT with a JOIN returns books and authors together.', b: ['One round trip instead of 101', 'Still vulnerable to N+1 further down the object graph', 'Verify with hibernate.generate_statistics'] },
},
edges: [
{ s: 'findAll() returns a list of books.' },
{ s: 'One query runs, then the per-book loop begins.' },
{ s: 'Each getAuthor() fires its own SELECT - 100 round trips.' },
{ s: 'The same request, now with a declared fetch plan.' },
{ s: 'The fetch plan is applied when the query executes.' },
{ s: 'One JOIN returns books and authors in a single round trip.' },
] },

Spring_Boot_Security_JWT: {
nodes: {
client: { t: 'Client', s: 'Sends GET /api/orders with an Authorization: Bearer header.', b: ['The token is a signed, self-contained credential', 'Stateless - no session, so it scales horizontally', 'Keep it out of query strings; headers only'] },
chain: { t: 'Framework', s: 'The security filter chain is an ordered list of filters.', b: ['Order is explicit and matters', 'Every request passes the whole chain unless a filter short-circuits', 'Configured with SecurityFilterChain beans'] },
filter: { t: 'Your code', s: 'JwtFilter is a OncePerRequestFilter - it runs exactly once per request.', b: ['Extracts the token, then verifies signature and expiry', 'Never trust claims before verifying the signature', 'Sets the SecurityContext and continues the chain'] },
ctx: { t: 'SecurityContext', s: 'Holds the Authentication for the current request and thread.', b: ['The filter populates it; @PreAuthorize reads it', 'Bound to the thread, so clearing it matters in a pool', 'The source of truth for who the caller is'] },
controller: { t: 'Layer 1', s: 'The controller runs with an identity present in the SecurityContext.', b: ['@PreAuthorize and @Secured read that context', 'Method security requires @EnableMethodSecurity', 'A missing annotation means no check - allow-by-default is a real risk'] },
entrypoint: { t: 'Failure', s: 'The entry point writes 401; the denied handler writes 403.', b: ['401 = no or invalid credentials; 403 = valid but not allowed', 'The distinction matters - do not return 403 for a bad token', 'Both should write JSON, not redirect to a login page'] },
},
edges: [
{ s: 'The request enters the chain.' },
{ s: 'The chain dispatches to each filter in order.' },
{ s: 'The filter checks whether a token is present at all.' },
{ s: 'Signature and expiry are verified before anything else happens.' },
{ s: 'A verified token becomes an Authentication in the context.' },
{ s: 'With identity set, the chain continues.' },
{ s: 'The controller runs with the identity available.' },
{ s: 'The response travels back out through the chain.' },
{ s: 'No token, or an invalid one, short-circuits with 401.' },
{ s: 'Valid identity but insufficient authority gives 403.' },
] },

Spring_Boot_AutoConfiguration: {
nodes: {
classpath: { t: 'Discovery', s: 'Spring Boot reads every jar on the classpath looking for configuration.', b: ['This is what makes starters work with zero code', 'The jar list determines what can be auto-configured', 'An extra dependency can silently enable a whole subsystem'] },
imports: { t: 'Boot 3+', s: 'Each jar lists candidate auto-configuration classes in AutoConfiguration.imports.', b: ['In Boot 3 this replaced spring.factories for auto-configuration', 'It lists candidates, not guarantees - conditions still apply', 'One file per jar, easy to inspect'] },
candidates: { t: 'Candidates', s: 'Each candidate is a configuration class that may define beans.', b: ['Nothing is applied yet - every one is conditional', 'A candidate can back off entirely or partially', 'The report shows the outcome for each'] },
ordering: { t: 'Ordering', s: 'Matching candidates are applied in a defined order.', b: ['@AutoConfigureOrder controls the sequence', 'Later candidates can rely on beans from earlier ones', 'Ordering mistakes surface as bean definition errors'] },
beancond: { t: '@ConditionalOnMissingBean', s: 'Applies only if you have not already defined a bean of that type.', b: ['This is the back-off that makes overriding easy', 'A user-defined bean always wins', 'The pattern is: your bean, else theirs'] },
backoff: { t: 'Result', s: 'Your own definition is used and the auto-configured bean is skipped.', b: ['How you customise without excluding auto-configuration', 'No @ConditionalOnMissingBean means no customisation', 'Check the report to confirm the back-off happened'] },
propcond: { t: '@ConditionalOnProperty', s: 'Applies only when the matching spring.* property is set.', b: ['matchIfMissing controls the default', 'Lets a subsystem exist but stay dormant until configured', 'The most common reason an expected bean is missing'] },
webcond: { t: '@ConditionalOnWebApplication', s: 'Applies only for a SERVLET or REACTIVE application type.', b: ['Guards MVC-only config in a reactive app, and vice versa', 'The application type is inferred from the classpath', 'Fixes confusing missing-DispatcherServlet errors'] },
register: { t: 'Result', s: 'The surviving candidates define their beans into the context.', b: ['DataSource, JPA, MVC, Jackson - all decided by conditions', 'The generated auto-configuration report shows what happened', 'A missing bean is almost always a failed condition'] },
},
edges: [
{ s: 'You already defined a bean, so Boot backs off.' },
{ s: 'No user bean yet, so the candidate proceeds.' },
{ s: '@ConditionalOnMissingBean - do you already have one?' },
{ s: '@ConditionalOnProperty - are the properties set?' },
{ s: '@ConditionalOnWebApplication - is this the right application type?' },
{ s: 'Boot reads the imports file out of each jar.' },
{ s: 'Candidate classes are loaded, but not yet applied.' },
{ s: 'Ordered candidates define their beans.' },
{ s: 'The property condition passed.' },
{ s: 'The web application type matched.' },
] },

Spring_Boot_Transactions: {
nodes: {
outer: { t: '@Transactional', s: 'OrderService.placeOrder() is annotated, so the call opens a transaction.', b: ['REQUIRED is the default propagation', 'The proxy starts the transaction before the method body runs', 'The commit happens when the outermost annotated method returns'] },
outertx: { t: 'Transaction', s: 'The outer, real transaction bound to the current thread.', b: ['Bound to the thread by TransactionSynchronizationManager', 'Inner calls join it because propagation is REQUIRED', 'One physical commit for everything that joined'] },
commit: { t: 'COMMIT', s: 'A normal return commits the transaction and the order becomes durable.', b: ['Flush happens before commit, so constraint violations surface here', 'After this point nothing can roll back', 'Flush mode changes when SQL is sent, not whether it is correct'] },
inner: { t: '@Transactional', s: 'StockService.decreaseStock() is called from inside the outer transaction.', b: ['Also a proxied call, so its annotation is honoured', 'Its propagation attribute decides everything that follows', 'Self-invocation here would silently skip the transaction'] },
required: { t: 'REQUIRED', s: 'Joins the existing transaction - same connection, no new boundary.', b: ['The default, and usually what you want', 'An inner failure marks the whole thing rollback-only', 'No savepoint is used'] },
requiresnew: { t: 'REQUIRES_NEW', s: 'Suspends the outer transaction and starts a genuinely separate one.', b: ['Needs a second connection from the pool - watch for exhaustion', 'Commits independently, even if the outer transaction rolls back', 'The suspended transaction resumes afterwards'] },
nested: { t: 'NESTED', s: 'Uses a savepoint inside the same physical transaction.', b: ['One connection, one commit', 'Rolling back to the savepoint undoes only the inner work', 'Unsupported on some databases and in some JPA setups'] },
rollback: { t: 'Rollback-only', s: 'The inner failure marks the shared transaction as doomed.', b: ['The inner method did not roll back - it marked the transaction', 'Nothing is lost yet; the outer can still see the mark', 'The outer has no way to undo it'] },
poison: { t: 'UnexpectedRollbackException', s: 'The outer commit is rejected and an exception surfaces at commit time.', b: ['Thrown at the outer boundary, far from the real cause', 'The classic surprise: the inner save failed, the outer looks fine', 'A business failure surfaces as an infrastructure exception'] },
},
edges: [
{ s: 'placeOrder() enters through the proxy and opens the transaction.' },
{ s: 'A normal return commits the outer transaction.' },
{ s: 'The outer service calls the inner service.' },
{ s: 'REQUIRED - no new transaction, join the existing one.' },
{ s: 'REQUIRES_NEW - suspend the outer transaction and start a new one.' },
{ s: 'NESTED - create a savepoint inside the same transaction.' },
{ s: 'An inner failure rolls back to the savepoint only.' },
{ s: 'The shared transaction is now marked rollback-only.' },
] },

Spring_Boot_Layers: {
nodes: {
browser: { t: 'Client', s: 'Sends an HTTP request with JSON and consumes the response.', b: ['Everything crosses a network boundary, so types must be explicit', 'Errors come back as status codes, not exceptions', 'Thin clients push logic to the server'] },
security: { t: 'Cross-cutting', s: 'The filter chain runs before your code and applies to every request.', b: ['Filters wrap the whole request: JWT, CORS, CSRF, logging', 'They run outside the DispatcherServlet, so no controller is involved yet', 'Order matters enormously here'] },
dispatcher: { t: 'Framework', s: 'The front controller that turns a URL into a controller method.', b: ['HandlerMapping finds the method, HandlerAdapter invokes it', 'One dispatcher serves every endpoint in the app', 'Exception handling is centralised here too'] },
controller: { t: 'Layer 1', s: '@RestController receives the request, validates it, and shapes the response.', b: ['Stays thin: no business rules, no repository calls', 'DTOs in, DTOs out - never expose entities directly', '@Valid triggers bean validation before the method runs'] },
dto: { t: 'Shape', s: 'Request and response objects containing the fields you actually publish.', b: ['Decouples your API from your database schema', 'Validation annotations live here', 'A DTO change is a contract change - version deliberately'] },
service: { t: 'Layer 2', s: '@Service - the business logic and the transaction boundary.', b: ['This is where the rules live, and where @Transactional belongs', 'Should not know about HTTP or persistence details', 'One public method, one transaction, one job'] },
tx: { t: 'Cross-cutting', s: '@Transactional turns a method into an all-or-nothing database unit.', b: ['Applied through a proxy, so self-invocation breaks it', 'Rollback is automatic for unchecked exceptions only', 'Checked exceptions commit unless you say otherwise'] },
aop: { t: 'Cross-cutting', s: 'Proxies add logging, timing, security or transactions around method calls.', b: ['One proxy, many advisors, applied in a defined order', 'Every annotation-driven feature you use is really AOP', 'final and private methods cannot be advised'] },
repository: { t: 'Layer 3', s: 'Spring Data JPA turns an interface into a working data-access object.', b: ['No implementation needed - a proxy generates it at startup', 'Method names become queries: findByAuthorNameContaining', 'Returns entities, which is why the service maps to DTOs'] },
jpa: { t: 'ORM', s: 'Hibernate maps entities to tables and manages the persistence context.', b: ['The persistence context is why lazy loading can bite you', 'Dirty checking flushes your changes for you at commit', 'Flushing is automatic; the SQL is not always what you expect'] },
db: { t: 'Storage', s: 'The actual database - H2 in tests, MySQL or Postgres in production.', b: ['You should never write raw SQL for simple CRUD', 'Schema comes from the entities unless you use migrations', 'The dialect differs between environments - H2 is not Postgres'] },
},
edges: [
{ s: 'Every request enters through the filter chain.' },
{ s: 'Only authenticated and allowed requests continue.' },
{ s: 'The dispatcher routes to a controller method.' },
{ s: 'Validation runs before the controller body.' },
{ s: 'The controller delegates business logic to the service.' },
{ s: '@Transactional wraps the service method, not the controller.' },
{ s: 'AOP advice wraps the same call from the other direction.' },
{ s: 'The service asks the repository for data - and only the service should.' },
{ s: 'The repository turns method calls into JPA queries.' },
{ s: 'Hibernate translates those into SQL and talks to the connection pool.' },
] },

Spring_Boot_Roadmap: {
nodes: {
partA: { t: 'Chapters 1-4', s: 'Foundations: the vocabulary you need before anything else.', b: ['Annotations, IoC, dependency injection, and what a bean actually is', 'Read chapter 3 twice - DI is the concept the whole book leans on', 'Nothing here needs Spring Boot specifically'] },
partB: { t: 'Chapters 5-9', s: 'Boot Basics: your first running application and the auto-configuration magic.', b: ['start.spring.io, @SpringBootApp, application.properties', 'Learn what auto-configuration does for you before you learn to replace it', 'The first app you can actually curl'] },
partC: { t: 'Chapters 10-15', s: 'Web and REST: exposing HTTP and shaping request and response bodies.', b: ['@RestController, @RequestMapping, DTOs, @Valid', 'The filter chain and DispatcherServlet finally make sense here', 'Status codes and error handling belong to this part'] },
partD: { t: 'Chapters 16-21', s: 'Data: persistence, JPA, and the transaction model.', b: ['Entities, repositories, and the N+1 trap this part exists to prevent', '@Transactional, propagation and rollback - the most bug-prone area', 'Where the real performance wins live'] },
partE: { t: 'Chapters 22-28', s: 'Advanced: what changes when other people depend on your code.', b: ['AOP, security, auto-configuration, caching', 'Configuration profiles, and how to be a good citizen in someone else\'s app', 'Performance and profiling'] },
partF: { t: 'Chapters 29-34', s: 'Practice: build it, test it, ship it.', b: ['Unit tests, slices, integration tests', 'Docker packaging and deployment', 'The point where you read source instead of docs'] },
},
edges: [
{ s: 'Hands-on starts here: concepts become a runnable app.' },
{ s: 'You need HTTP before persistence is meaningful.' },
{ s: 'Data is where most real bugs live.' },
{ s: 'Hardening only matters once the happy path works.' },
{ s: 'Everything above is untested theory until you build it.' },
] },

Spring_Boot_Request_Path: {
nodes: {
browser: { t: 'Client', s: 'Issues GET /api/books and waits for the response.', b: ['One request in, one response out', 'Stateless - the server remembers nothing between calls', 'All the interesting work happens server-side'] },
filter: { t: 'Cross-cutting', s: 'The filter chain authenticates, authorises and shapes the request.', b: ['JWT verification happens here, before any controller', 'A failure here short-circuits with 401 or 403', 'The right home for anything cross-cutting'] },
dispatcher: { t: 'Framework', s: 'DispatcherServlet routes the request to a handler method.', b: ['HandlerMapping resolves the URL to a controller method', 'HandlerAdapter invokes it with the right arguments', 'The response is written back through here too'] },
controller: { t: 'Layer 1', s: '@RestController receives the request and returns a DTO.', b: ['Deserialises JSON into a DTO before your code runs', 'Validates, delegates, then maps the result back to a DTO', 'Keeps zero business logic'] },
service: { t: 'Layer 2', s: '@Service holds the business logic and the transaction boundary.', b: ['findAll() is trivial - real services enforce rules here', '@Transactional usually belongs on this layer', 'Returns entities; mapping to DTOs happens above'] },
repository: { t: 'Layer 3', s: 'A Spring Data JPA interface backed by a generated proxy.', b: ['findAll() becomes a SELECT at first call', 'Works because of the proxy, not inheritance', 'A naming mistake becomes a derived query - check the SQL'] },
db: { t: 'Storage', s: 'The database returns rows; Hibernate maps them to entities.', b: ['One round trip for a simple findAll()', 'Connection pool and dialect differences are the usual surprises', 'The transaction commits after the service returns'] },
},
edges: [
{ s: 'The request enters the filter chain.' },
{ s: 'JWT verified; the request continues to the dispatcher.' },
{ s: 'HandlerMapping resolves GET /api/books to a method.' },
{ s: 'The controller calls the service.' },
{ s: 'The service calls the repository.' },
{ s: 'A SELECT is executed over the connection pool.' },
{ s: 'Rows come back and Hibernate maps them to managed entities.' },
{ s: 'A List of managed entities is returned.' },
{ s: 'The business result travels back up.' },
{ s: 'The controller maps entities to DTOs.' },
{ s: 'The response goes back out through the dispatcher.' },
{ s: 'The client receives 200 and a JSON body.' },
] },

Spring_Boot_Data_Model: {
nodes: {
author: { t: 'Entity', s: 'Author: id, name, bio. One author writes many books.', b: ['@Entity with @Id and a generated key', 'Books reference the author with @ManyToOne', 'The owning side of a one-to-many is always the many side'] },
book: { t: 'Entity', s: 'Book: id, title, price - the centre of the catalog.', b: ['@Entity, referenced by everything else', '@ManyToOne to Author, @ManyToMany to Category via a join table', '@OneToMany to BookItem for physical copies'] },
bookcategory: { t: 'Join table', s: 'book_category links books to categories - many-to-many on both sides.', b: ['Created by @JoinTable on the owning side, or modelled as its own entity', 'Never declare @ManyToMany on both sides - inserts break', 'A composite key is the usual mapping'] },
category: { t: 'Entity', s: 'Category: id, name - a genre.', b: ['Many-to-many with Book through the join table', 'A book can sit in several categories', 'Declare the owning side on one entity only'] },
cart: { t: 'Entity', s: 'Cart: user_id, book_id - the many-to-many between users and books.', b: ['Quantity lives here, not on Book', 'One row per user/book pair', 'Often session-scoped, but still modelled as an entity'] },
user: { t: 'Entity', s: 'User: email, password - the identity.', b: ['Passwords are BCrypt hashes, never plaintext', '@ManyToOne to Role, often a separate authorities table', 'Lazy roles can surprise you during serialization'] },
order: { t: 'Entity', s: 'Order: date, status, total - the transaction header.', b: ['@Transactional on the service that creates it', 'Totals are derived, never trusted from the client', 'One-to-many with OrderItem, one-to-one with Payment'] },
bookitem: { t: 'Entity', s: 'BookItem: a physical copy with its own status and availability.', b: ['@Version for optimistic locking, so two checkouts cannot sell one copy', 'Availability is decremented with an atomic UPDATE', 'Modelled per copy, so a book can be partly available'] },
orderitem: { t: 'Entity', s: 'OrderItem: order_id, book_id - a line on the order.', b: ['Composite primary key via @IdClass or @EmbeddedId', 'Points at the exact copy that was sold', 'Price is copied onto the line - a line must not change when the book does'] },
payment: { t: 'Entity', s: 'Payment: amount, status - one per order.', b: ['One-to-one with Order, owning side on Payment', 'Kept separate so payment concerns do not pollute Order', 'A failed payment must roll back the whole order'] },
},
edges: [
{ s: 'One author writes many books; the foreign key is on Book.' },
{ s: 'A book maps to categories through the join table.' },
{ s: 'A category appears in many books through the same join table.' },
{ s: 'A book appears in many carts.' },
{ s: 'A user has one cart entry per book.' },
{ s: 'One user places many orders.' },
{ s: 'One book has many physical copies.' },
{ s: 'An order item references the copy that was sold.' },
{ s: 'An order is paid by one payment record.' },
{ s: 'One order has many line items.' },
{ s: 'One order has one payment.' },
] },

Spring_Boot_Testing_Slices: {
nodes: {
unit: { t: 'Fastest', s: 'Plain JUnit with Mockito - no Spring context at all.', b: ['Milliseconds per test', 'No application context, so no wiring mistakes are caught', 'The default choice for business logic'] },
mvc: { t: 'Fast', s: 'MockMvc standalone sets up a controller without a context.', b: ['Real Spring MVC classes, no container', 'Faster than a slice because nothing else is loaded', 'Cannot catch filter chain, security or context problems'] },
webmvc: { t: 'Slice', s: '@WebMvcTest loads only the web layer.', b: ['@ControllerAdvice, message converters and validation are real', 'Service and repository beans are replaced with mocks', 'Catches broken JSON contracts and validation'] },
datajpa: { t: 'Slice', s: '@DataJpaTest loads JPA and Hibernate against an embedded database.', b: ['Real queries, real constraints, real mappings', 'H2 by default - a different dialect from production', 'Use Testcontainers when SQL dialect matters'] },
jsonb: { t: 'Slice', s: '@JsonTest verifies DTO serialisation in isolation.', b: ['Catches the contract drift unit tests miss', 'Catches the @JsonIgnore recursion problem', 'Very fast, because nothing else is loaded'] },
restclient: { t: 'Slice', s: '@RestClientTest verifies an outbound HTTP client.', b: ['MockRestServiceServer asserts the exact wire format', 'Catches renamed fields in the remote contract', 'Only the client side is real'] },
integration: { t: 'Slow', s: '@SpringBootTest starts the full application context.', b: ['The only layer that finds wiring and bean-conflict bugs', 'Seconds per test, so use it sparingly', 'With MockMvc it can stay in-process without a real port'] },
testcontainers: { t: 'Real deps', s: 'Testcontainers runs a real database in Docker for the test.', b: ['Same dialect as production, so H2 drift disappears', 'Reuse one container per JVM instead of one per class', 'The first run pays for the image pull'] },
e2e: { t: 'Slowest', s: 'Playwright drives a real browser against a running app.', b: ['Minutes per suite - keep it tiny', 'Catches what unit and slice tests structurally cannot', 'Stub external HTTP to keep it deterministic'] },
mocks: { t: 'Principle', s: 'Mock only the edges you own; never the logic you are testing.', b: ['Over-mocking just asserts that your mocks work', 'A slice automatically replaces everything outside its boundary', 'A mock that returns a mock proves nothing'] },
},
edges: [
{ s: 'Unit tests are faster but prove less about wiring.' },
{ s: 'A slice boots part of the framework - more proof for a little time.' },
{ s: 'Moving deeper trades speed for coverage of the data layer.' },
{ s: 'Narrower slices are fast again, and catch contract drift.' },
{ s: 'Outbound clients have their own slice for the wire format.' },
{ s: 'The full context is the fallback for real wiring bugs.' },
{ s: 'Real dependencies remove the H2-versus-Postgres drift.' },
{ s: 'A browser test is the last resort, not the default.' },
{ s: 'External HTTP is stubbed to keep end-to-end deterministic.' },
{ s: 'Mockito is the unit-level version of the same idea.' },
] },
};

Object.assign(DATA, NEW);

// ---------------------------------------------------------------- runtime
const CSS = `
.arch-hc{position:fixed;z-index:2147483000;max-width:342px;pointer-events:none;opacity:0;transform:translateY(5px) scale(.985);transform-origin:top left;transition:opacity .14s ease,transform .14s cubic-bezier(.2,.8,.2,1);
background:color-mix(in srgb,var(--toolbar-bg,#0f172a) 92%,transparent);border:1px solid var(--toolbar-border,#334155);border-radius:13px;color:var(--text,#fff);
box-shadow:0 1px 0 rgba(255,255,255,.05) inset,0 20px 48px -14px rgba(0,0,0,.65),0 6px 16px -8px rgba(0,0,0,.5);
-webkit-backdrop-filter:blur(20px) saturate(150%);backdrop-filter:blur(20px) saturate(150%);overflow:hidden;contain:layout style}
.arch-hc[data-show="1"]{opacity:1;transform:translateY(0) scale(1)}
.arch-hc-hd{display:flex;align-items:flex-start;gap:9px;padding:12px 14px 9px;position:relative}
.arch-hc-hd::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:var(--hc-accent,#22d3ee);opacity:.95}
.arch-hc-ic{flex:none;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:color-mix(in srgb,var(--hc-accent,#22d3ee) 16%,transparent);border:1px solid color-mix(in srgb,var(--hc-accent,#22d3ee) 34%,transparent);color:var(--hc-accent,#22d3ee)}
.arch-hc-ic svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.arch-hc-tt{min-width:0;flex:1}
.arch-hc-t{font:650 13.5px/1.3 inherit;letter-spacing:-.012em;word-break:break-word}
.arch-hc-k{display:inline-block;margin-top:4px;font-size:9.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--hc-accent,#22d3ee);border:1px solid color-mix(in srgb,var(--hc-accent,#22d3ee) 34%,transparent);background:color-mix(in srgb,var(--hc-accent,#22d3ee) 11%,transparent);padding:2px 6px;border-radius:5px}
.arch-hc-m{padding:0 14px 9px;font:500 11.5px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--text-dim,#94a3b8);word-break:break-word}
.arch-hc-s{padding:0 14px 10px;font-size:12.6px;line-height:1.55;color:var(--text-muted,#94a3b8)}
.arch-hc-ul{list-style:none;margin:0;padding:0 14px 11px;display:flex;flex-direction:column;gap:6px}
.arch-hc-ul li{display:grid;grid-template-columns:auto 1fr;gap:8px;font-size:12.2px;line-height:1.5;color:var(--text-muted,#94a3b8)}
.arch-hc-ul li::before{content:"";width:4px;height:4px;margin-top:7px;border-radius:50%;background:var(--hc-accent,#22d3ee);opacity:.9}
.arch-hc-ft{padding:7px 14px;border-top:1px solid var(--toolbar-border,#334155);font-size:10.5px;color:var(--text-dim,#94a3b8);display:flex;align-items:center;gap:7px}
.arch-hc-ftd{flex:none;width:5px;height:5px;border-radius:50%;background:var(--hc-accent,#22d3ee);box-shadow:0 0 0 3px color-mix(in srgb,var(--hc-accent,#22d3ee) 20%,transparent)}
.arch-hc-hit{fill:none;stroke:transparent;stroke-width:16;pointer-events:stroke;cursor:help}
.arch-hc-cursor{cursor:help}
@media (prefers-reduced-motion:reduce){.arch-hc{transition:none}}
`;

const RUNTIME = `
(function(){
"use strict";
var ROOT=document.getElementById("archify-hover-detail-data");
if(!ROOT)return;
var D;
try{D=JSON.parse(ROOT.textContent||"{}");}catch(e){return;}
var ACCENT=ACCENT_,VARIANT=VARIANT_;
var card=document.createElement("div");
card.className="arch-hc";card.id="archify-hover-card";
card.setAttribute("role","tooltip");card.setAttribute("aria-hidden","true");
var SVGNS="http://www.w3.org/2000/svg";
var showT=0,hideT=0,cur=null,anchorEl=null;
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function ico(p){var s=document.createElementNS(SVGNS,"svg");s.setAttribute("viewBox","0 0 24 24");s.setAttribute("aria-hidden","true");for(var i=0;i<p.length;i++){var n=document.createElementNS(SVGNS,p[i][0]);n.setAttribute("d",p[i][1]);s.appendChild(n);}return s;}
var ICONS={
 node:[['circle','M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 1 0 0-6.8'],['path','M12 3v3.2'],['path','M12 17.8V21'],['path','M3 12h3.2'],['path','M17.8 12H21']],
 edge:[['path','M4 12h13'],['path','m12.5 6.5 5.5 5.5-5.5 5.5']]
};
function build(html,accent,kind){
 card.innerHTML=html;
 card.style.setProperty("--hc-accent",accent||"#22d3ee");
 var slot=card.querySelector(".arch-hc-ic");
 if(slot)slot.appendChild(ico(ICONS[kind]||ICONS.node));
}
function nodePayload(id){
 var n=D.nodes&&D.nodes[id];if(!n)return null;
 return {t:n.t||"",s:n.s||"",b:n.b||[],label:id};
}
function edgePayload(i){
 var arr=D.edges||[];var e=arr[i];if(!e)return null;
 return {t:e.t||"Relationship",s:e.s||"",b:e.b||[],label:e.label||""};
}
function renderNode(id,el){
 var p=nodePayload(id);if(!p)return false;
 var acc=ACCENT[el.getAttribute("data-node-kind")]||"#22d3ee";
 var label=el.getAttribute("data-node-label")||id;
 var sub=el.getAttribute("data-node-sublabel")||"";
 var tag=el.getAttribute("data-node-tag")||"";
 var b=p.b.length?'<ul class="arch-hc-ul">'+p.b.map(function(x){return"<li><span>"+esc(x)+"</span></li>";}).join("")+"</ul>":"";
  build('<div class="arch-hc-hd"><span class="arch-hc-ic"></span><div class="arch-hc-tt"><div class="arch-hc-t">'+esc(label)+'</div>'+(p.t?'<span class="arch-hc-k">'+esc(p.t)+'</span>':"")+'</div></div>'+
   (sub?'<div class="arch-hc-m">'+esc(sub)+'</div>':"")+
   (tag?'<div class="arch-hc-m">'+esc(tag)+'</div>':"")+
   (p.s?'<div class="arch-hc-s">'+esc(p.s)+'</div>':"")+b+
   '<div class="arch-hc-ft"><span class="arch-hc-ftd"></span>Click for the full Semantic Passport</div>',acc,"node");
  return true;
 }
function renderEdge(i,el){
 var p=edgePayload(i);if(!p)return false;
 var cls=el.getAttribute("class")||"";
 var acc=VARIANT.default;
 ["emphasis","security","dashed","default"].forEach(function(v){if(cls.indexOf(v)>=0)acc=VARIANT[v];});
 var from=el.getAttribute("data-edge-from")||"",to=el.getAttribute("data-edge-to")||"";
 var lbl=el.getAttribute("data-edge-label")||"";
 var b=p.b.length?'<ul class="arch-hc-ul">'+p.b.map(function(x){return"<li><span>"+esc(x)+"</span></li>";}).join("")+"</ul>":"";
  build('<div class="arch-hc-hd"><span class="arch-hc-ic"></span><div class="arch-hc-tt"><div class="arch-hc-t">'+esc(from)+' &rarr; '+esc(to)+'</div>'+(lbl?'<span class="arch-hc-k">'+esc(lbl)+'</span>':"")+'</div></div>'+
   (p.s?'<div class="arch-hc-s">'+esc(p.s)+'</div>':"")+b+
   '<div class="arch-hc-ft"><span class="arch-hc-ftd"></span>Connection between two components</div>',acc,"edge");
  return true;
 }
function place(x,y,rect){
 var vw=document.documentElement.clientWidth,vh=document.documentElement.clientHeight;
 var w=card.offsetWidth,h=card.offsetHeight,pad=12,off=16;
 var left=x+off,top=y+off;
 if(rect){left=rect.left+rect.width/2-w/2;top=rect.bottom+10;}
 if(left+w+pad>vw)left=Math.max(pad,x-off-w);
 if(top+h+pad>vh)top=Math.max(pad,(rect?rect.top: y)-h-off);
 if(left<pad)left=pad;if(top<pad)top=pad;
 card.style.left=left+"px";card.style.top=top+"px";
}
function openAt(kind,key,el,ev){
 var prev=cur;cur=kind+":"+key;
 var ok=kind==="n"?renderNode(key,el):renderEdge(key,el);
 if(!ok){cur=prev;return;}
 anchorEl=el;
 card.setAttribute("data-sb-kind",kind);
 card.setAttribute("data-sb-key",String(key));
 card.setAttribute("aria-hidden","false");card.setAttribute("data-show","1");
 place(ev.clientX,ev.clientY,null);
 try{card.dispatchEvent(new CustomEvent("sb:hover",{bubbles:true,detail:{kind:kind,key:String(key),element:el}}));}catch(e){}
}
function close(){
 cur=null;anchorEl=null;
 card.setAttribute("data-show","0");card.setAttribute("aria-hidden","true");
 try{card.dispatchEvent(new CustomEvent("sb:hover",{bubbles:true,detail:{kind:null,key:null}}));}catch(e){}
}
function enter(kind,key,el,ev){
 clearTimeout(hideT);
 showT=setTimeout(function(){openAt(kind,key,el,ev);},90);
}
function leave(){
 clearTimeout(showT);
 hideT=setTimeout(function(){if(cur)close();},70);
}
function move(ev){
 if(!cur||!anchorEl)return;
 if(anchorEl._kind==="n"&&!anchorEl._rect){
  try{anchorEl._rect=anchorEl.getBoundingClientRect();}catch(e){}
 }
 var useRect=!!(anchorEl&&anchorEl._rect);
 place(ev.clientX,ev.clientY,useRect?anchorEl._rect:null);
}
/* ---- node wiring ---- */
Array.prototype.forEach.call(document.querySelectorAll("[data-node-id]"),function(el){
 var id=el.getAttribute("data-node-id");
 if(!(D.nodes&&D.nodes[id]))return;
 var t=el.querySelector(":scope > title");
 if(t&&t.parentNode)t.parentNode.removeChild(t);
 el.classList.add("arch-hc-cursor");
 el.addEventListener("mouseenter",function(ev){enter("n",id,el,ev);});
 el.addEventListener("mouseleave",leave);
 el.addEventListener("focus",function(ev){
  clearTimeout(hideT);
  var r=el.getBoundingClientRect();
  showT=setTimeout(function(){openAt("n",id,el,{clientX:r.left+r.width/2,clientY:r.bottom});},10);
 });
 el.addEventListener("blur",leave);
});
/* ---- edge wiring: outermost only, in document order ---- */
var edges=Array.prototype.filter.call(document.querySelectorAll("[data-edge-from][data-edge-to]"),function(el){
 return !el.parentNode||!el.parentNode.closest||!el.parentNode.closest("[data-edge-from][data-edge-to]");
});
edges.forEach(function(el,i){
 if(!(D.edges&&D.edges[i]))return;
 el.classList.add("arch-hc-cursor");
 el.addEventListener("mouseenter",function(ev){enter("e",i,el,ev);});
 el.addEventListener("mouseleave",leave);
 var path=el.tagName.toLowerCase()==="path"?el:el.querySelector("path");
 if(path){
  var hit=document.createElementNS(SVGNS,"path");
  hit.setAttribute("d",path.getAttribute("d")||"");
  hit.setAttribute("class","arch-hc-hit");
  path.parentNode.insertBefore(hit,path.nextSibling);
  hit.addEventListener("mouseenter",function(ev){enter("e",i,el,ev);});
  hit.addEventListener("mouseleave",leave);
 }
});
/* ---- global ---- */
document.addEventListener("mousemove",move,true);
window.addEventListener("scroll",function(){if(cur)close();},{passive:true});
window.addEventListener("resize",function(){if(cur)close();});
document.addEventListener("keydown",function(e){if(e.key==="Escape")close();});
document.body.appendChild(card);
})();
`;

const KIT_CSS = '<link rel="stylesheet" href="sbkit.css">';
const KIT_JS = [
  '<script src="content-index.js"></script>',
  '<script src="concepts.js"></script>',
  '<script src="study-data.js"></script>',
  '<script src="code-source.js"></script>',
  '<script src="evidence.js"></script>',
  '<script src="sbkit.js"></script>',
].join('');

const HOVER_RE = /\n?<style id="archify-hover-style">[\s\S]*?<\/style>\n?<script id="archify-hover-detail-data" type="application\/json">[\s\S]*?<\/script>\n?<script id="archify-hover-detail-runtime">[\s\S]*?<\/script>\n?/;
const KIT_CSS_RE = /\n? *<link rel="stylesheet" href="sbkit\.css">\n?/;
const KIT_JS_RE = /\n?<script src="(content-index|concepts|study-data|code-source|evidence|sbkit)\.js"><\/script>/g;

function stripAll(html) {
  return html.replace(HOVER_RE, '\n').replace(KIT_CSS_RE, '\n').replace(KIT_JS_RE, '');
}

const FORCE = process.argv.includes('--force');

function inject(file) {
  const path = `${DIR}/${file}.html`;
  let html = readFileSync(path, 'utf8');
  if (FORCE) {
    if (!html.includes('id="archify-hover-detail-data"') && !html.includes('sbkit.js')) {
      console.log(`${file.padEnd(32)} nothing to rebuild`);
      return false;
    }
    html = stripAll(html);
  } else if (html.includes('id="archify-hover-detail-data"')) {
    console.log(`${file.padEnd(32)} already enhanced`);
    return false;
  }
  const data = DATA[file];
  if (!data) { console.log(`${file.padEnd(32)} NO CONTENT`); return false; }

  const json = JSON.stringify(data)
    .replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');

  const block = [
    '',
    `<style id="archify-hover-style">${CSS}</style>`,
    `<script id="archify-hover-detail-data" type="application/json">${json}</script>`,
    `<script id="archify-hover-detail-runtime">`,
    `var ACCENT_=${JSON.stringify(ACCENT)};var VARIANT_=${JSON.stringify(VARIANT)};`,
    RUNTIME,
    `</script>`,
    KIT_JS,
    '',
  ].join('\n');

  const marker = '</body>';
  const at = html.lastIndexOf(marker);
  if (at < 0) { console.log(`${file.padEnd(32)} no </body>`); return false; }
  html = html.slice(0, at) + block + html.slice(at);

  const head = html.lastIndexOf('</head>');
  if (head >= 0) html = html.slice(0, head) + KIT_CSS + '\n' + html.slice(head);
  if (html.includes('sbkit.css') === false) { console.log(`${file.padEnd(32)} no </head>`); return false; }

  writeFileSync(path, html, 'utf8');
  const nodes = Object.keys(data.nodes || {}).length;
  const edges = (data.edges || []).length;
  console.log(`${file.padEnd(32)} +${nodes} nodes, +${edges} edges, kit wired, ${(html.length / 1024).toFixed(0)} KB`);
  return true;
}

const files = [
  'Spring_Boot_Roadmap', 'Spring_Boot_Startup', 'Spring_Boot_Layers', 'Spring_Boot_Request_Path',
  'Spring_Boot_Bean_Lifecycle', 'Spring_Boot_AOP_Proxy', 'Spring_Boot_Nplus1', 'Spring_Boot_Security_JWT',
  'Spring_Boot_AutoConfiguration', 'Spring_Boot_Transactions', 'Spring_Boot_Data_Model', 'Spring_Boot_Testing_Slices',
  'Spring_Boot_Config_Properties', 'Spring_Boot_Observability', 'Spring_Boot_Caching',
  'Spring_Boot_Messaging', 'Spring_Boot_Async_Scheduling', 'Spring_Boot_Deployment',
  'Spring_Boot_Migration_3', 'Spring_Boot_WebFlux', 'Spring_Boot_AntiPatterns',
];
let n = 0;
for (const f of files) if (inject(f)) n++;
console.log('-'.repeat(60));
console.log(`${FORCE ? 'rebuilt' : 'enhanced'} ${n} files`);
