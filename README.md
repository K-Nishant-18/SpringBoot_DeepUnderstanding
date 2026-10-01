<div align="center">

# Spring Boot Study Kit

**21 interactive diagrams, a mirrored Spring Boot codebase, and measured evidence —
a complete learning loop you open in a browser.**

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3.5-6DB33F?style=flat&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-17-ED8B00?style=flat&logo=openjdk&logoColor=white)](https://www.oracle.com/java/)
[![Diagrams](https://img.shields.io/badge/diagrams-21-0ea5e9?style=flat)](#tracks)
[![Tests](https://img.shields.io/badge/tests-15%2F15-brightgreen?style=flat)](#validation)
[![Checks](https://img.shields.io/badge/checks-7%2F7-brightgreen?style=flat)](#validation)
[![No build step](https://img.shields.io/badge/run-HTML%20%E2%80%93%20no%20install-6366f1?style=flat)](#quick-start)

[Open the hub](index.html) · [Hinglish guide](guide.html) · [Notes (docx)](Spring_Boot_Complete_Notes.docx) · [Book Store](bookstore/README.md)

</div>

---

## Contents

| | | |
|---|---|---|
| [Quick start](#quick-start) | [At a glance](#glance) | [Six tracks, 21 diagrams](#tracks) |
| [What you get](#features) | [Keyboard](#shortcuts) | [The Book Store](#bookstore) |
| [Regeneration pipeline](#regeneration) | [Validation](#validation) | [Repository map](#layout) |
| [Documentation](#docs) | | |

---

<a id="quick-start"></a>
## Quick start

No install, no build, no server. Everything runs from `file://`.

```text
1. Open index.html          ← the hub: 6 tabs, search, progress
2. Pick a track → a diagram
3. Hover any node           ← the "passport": what it is, why it exists, gotchas
4. Press ?                  ← shortcuts
```

> GitHub will only show you the **source** of these pages. Clone the repo and open
> `index.html` locally to get the interactive experience.

```text
git clone <your-repo-url>
start index.html            # Windows — opens the hub in your browser
```

---

<a id="glance"></a>
## At a glance

| | |
|---|---|
| Interactive diagrams | **21** across **6** learning tracks |
| Nodes · edges · animated views | **196** · **209** · **61** |
| Quiz questions | **128** |
| Symptom-first debug entries | **47** |
| Interview questions with model answers | **74** |
| Glossary terms | **96** |
| Shared concept cards | **30** |
| Mirrored source files in the code viewer | **48** files · **3,732** lines |
| Book Store tests | **15 / 15** |

---

<a id="tracks"></a>
## Six tracks, 21 diagrams

| Track | What it covers | Diagrams |
|---|---|---|
| **Foundations** | the mental model — what the container is and how it starts | Roadmap · Startup · Bean Lifecycle |
| **How it works** | the request path, the proxy, and how configuration is resolved | Layers · Request Path · AOP Proxy · Auto-Configuration · Config Properties |
| **Data and persistence** | where data goes wrong — queries, transactions, caches | Data Model · N+1 · Transactions · Caching |
| **Security** | authentication, authorization, and the filter chain | Security JWT |
| **Running it** | observability, background work, messaging, and deployment | Observability · Async & Scheduling · Messaging · Deployment |
| **Hardening** | testing, the traps that reach production, and the upgrade path | Testing Slices · Anti-Patterns · WebFlux · Migration 2→3 |

Every diagram is a self-contained `.html` file: **zero network requests**, dark and light
theme, keyboard navigation, and a `#view=` deep link for any of the 61 animated views.

---

<a id="features"></a>
## What you get

**The hub** — `index.html` with six tabs: *Home*, *Tracks*, *Library*, *Practice*,
*Concepts*, *Progress*. Fuzzy search over everything with `Ctrl+K`, streaks and scores
stored in `localStorage`.

**Anatomy of a diagram page**
- **Hover passport** on every node — definition, why it exists, the gotcha that bites in production.
- **Concept chips** — click to open the shared card, reused across diagrams.
- **Present mode** (`P`) — guided view, unrelated nodes dim out.
- **Deep links** — `Spring_Boot_Layers.html#view=n` lands on a named view.

**The code lab** (`C`) — this is where the study kit stops being a slide deck.
- **Mirrored source**: all 48 Book Store files, byte-for-byte, with outlines and line anchors.
- **Walkthroughs**: step-by-step traces through real code with explanations.
- **Measured evidence**: responses captured from the *running* app, so the diagrams show
  real numbers (query counts, timings) instead of invented ones.

**Practice** — quiz per diagram with scoring, personal notes, 47 debug entries, 74
interview questions, 96 glossary terms.

**[Hinglish guide](guide.html)** — `guide.html`, 14 sections, linked from the hub home
card, the hub footer, and the `?` help panel on every diagram.

---

<a id="shortcuts"></a>
## Keyboard

| Key | What it opens |
|---|---|
| `Ctrl` / `Cmd` + `K` | Search — diagrams, nodes, concepts, glossary, debug, interview |
| `Q` | Quiz for the current diagram, with score |
| `N` | Notes — note on the last hovered node, plus all saved notes |
| `P` | Present mode |
| `C` | Code lab — concepts, mirrored source, walkthroughs |
| `G` | Glossary (96 terms) |
| `T` | Debug / troubleshooting (47 entries) |
| `I` | Interview bank (74 questions) |
| `?` | Help — shortcuts and code lab explanation |
| `Esc` | Close any panel |
| `→` `Space` `←` | Step forward / back inside present mode |
| `Tab` | Move node to node — the passport follows the keyboard |
| `1` – `6` | Hub tabs: Home, Tracks, Library, Practice, Concepts, Progress |

---

<a id="bookstore"></a>
## The companion project: Book Store

`bookstore/` is a real **Spring Boot 3.3.5 / Java 17** application whose code is mirrored
into the code lab. It runs on in-memory H2 (`jdbc:h2:mem:bookstore`) and deliberately
ships both the **naive** and the **fixed** version of every mistake the diagrams teach.

```text
GET  /api/catalog/books/naive          ← the N+1, on purpose
GET  /api/catalog/books/join-fetch     ← the fix
POST /api/catalog/categories/stale     ← lazy-loading across a transaction boundary
POST /api/orders                       ← order placement inside one transaction
GET  /api/outbox/pending|handled       ← transactional outbox state
POST /api/outbox/relay                 ← at-least-once relay
GET  /api/system/transaction-probe     ← what @Transactional actually did
GET  /api/system/precedence-layers     ← config property precedence, measured
```

```bash
cd bookstore
.\run.cmd          # start on :8080  (kills any stale listener first)
.\test.cmd         # 15 tests: WebMvc, DataJPA, transaction, outbox
```

`run.cmd` and `test.cmd` use `mvn` when it is on your `PATH` and fall back to the
committed Maven Wrapper (`mvnw.cmd`), so a clean checkout builds with no toolchain setup.

---

<a id="regeneration"></a>
## Regeneration pipeline

The generated assets are **derived** — never hand-edit them. Order matters:

```bash
node tools/capture-evidence.mjs     # 1. self-healing: kill :8080, boot app, record real responses  → evidence.js
node tools/build-traces.mjs         # 2. evidence → walkthrough traces                              → (folded into evidence.js)
node tools/build-code-viewer.mjs    # 3. mirror bookstore/** → source model, outlines, line anchors → code-source.js
node tools/build-content-index.mjs  # 4. all content → the searchable index                          → content-index.js
node tools/enhance-hover.mjs        # 5. stamp the 21 base diagrams with hover passports             → Spring_Boot_*.html
```

Do not hand-edit: `evidence.js`, `code-source.js`, `content-index.js`, or the 21 base
diagram files (step 5 rewrites them).

| Script | Role |
|---|---|
| `capture-evidence.mjs` | Boots the Book Store, drives its endpoints, writes measured responses. Self-healing: kills whatever owns `:8080`, asserts the port is free afterwards. |
| `build-traces.mjs` | Turns captured responses into ordered walkthrough steps. |
| `build-code-viewer.mjs` | Mirrors `bookstore/` into `code-source.js` (bookstore-relative paths, byte-exact `text`). |
| `build-content-index.mjs` | Single source of truth for search, tracks, and hub stats. |
| `enhance-hover.mjs` | Adds rich hover passports to the 21 base diagrams. |

---

<a id="validation"></a>
## Validation

Run these from the repo root. All must pass before you consider the kit healthy.

| Command | Verifies | Expected |
|---|---|---|
| `node tools/audit-links.mjs` | every mirrored file matches `bookstore/` byte-for-byte, 31 anchors resolve, trace steps exist, `SB_EVIDENCE` + `SB_TRACES` present, every `guide.html` href and fragment resolves | 48 mirrored · **0 stale** |
| `node tools/build-content-index.mjs` | every file the index references exists | clean |
| `node tools/probe-code-viewer.mjs` | deep links, outlines, source rendering | **34 / 34** |
| `node tools/probe-code-lab.mjs` | code lab, walkthroughs, evidence injection | **30 / 30** |
| `node tools/probe-hover.mjs` | hover passport on all 21 diagrams | **21 / 21** |
| `node tools/probe-kit.mjs` | shared kit, `#view=` deep links, panels | **5 / 5** |
| `node tools/probe-hub.mjs` | hub tabs, practice flows, guide page | **4 / 4** |
| `bookstore\test.cmd` | Maven test suite | **15 / 15** |

The probes drive a real Chrome over CDP — no assertions-by-string-matching, no
self-fulfilling tests.

---

<a id="layout"></a>
## Repository map

```text
.
├── index.html                  the hub (6 tabs, search, progress)
├── guide.html                  Hinglish usage guide (14 sections)
├── hub.js  sbkit.js  sbkit.css hub logic + the shared study kit
├── Spring_Boot_*.html          21 diagrams (self-contained, no build step)
│
├── content-index.js            generated · search + tracks + stats
├── code-source.js              generated · 48 mirrored files, 3,732 lines
├── evidence.js                 generated · captured responses + traces
├── concepts.js  study-data.js  30 concept cards · 128 quiz, 47 debug, 74 interview, 96 glossary
│
├── bookstore/                  Spring Boot 3.3.5 companion app (105 tracked files)
│   ├── src/main/java/...       domain · repository · service · web · config · outbox
│   ├── src/test/java/...       15 tests
│   ├── schema.sql  data.sql    H2 schema and seed data
│   ├── run.cmd  test.cmd       one-command run / test
│   ├── mvnw  mvnw.cmd          committed Maven Wrapper
│   └── README.md               node-id mapping and regeneration notes
│
├── tools/                      5 builders · 5 probes · 1 audit
│   ├── capture-evidence.mjs  build-traces.mjs  build-code-viewer.mjs
│   ├── build-content-index.mjs  enhance-hover.mjs
│   ├── probe-hub.mjs  probe-kit.mjs  probe-hover.mjs
│   ├── probe-code-viewer.mjs  probe-code-lab.mjs
│   └── audit-links.mjs
│
├── Spring_Boot_Complete_Notes.docx   full notes export
└── .gitignore                  build output, tool logs, editor noise
```

---

<a id="docs"></a>
## Documentation

- **[guide.html](guide.html)** — how to use every feature, in Hinglish. Start here.
- **[bookstore/README.md](bookstore/README.md)** — how the companion app maps to diagram
  node-ids, and how to regenerate the assets.
- **[Spring_Boot_Complete_Notes.docx](Spring_Boot_Complete_Notes.docx)** — the same
  material as a printable document.

---

<div align="center">

Built as a study kit: read the diagram → hover the node → open the real source →
run the real code → get asked about it.

</div>
