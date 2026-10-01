# Brag Plan: Spring Boot Diagram Atlas

## What is this app?

A folder of 21 interactive diagrams that trace what Spring Boot actually does at
runtime — with a real Spring Boot application mirrored underneath every concept,
so you can go from "why did my transaction silently do nothing" to the exact Java
line that caused it.

## The angle

Documentation describes Spring Boot. This thing **shows the receipts**.

Every claim on screen is either a line of real copy from a diagram or a number
counted from the running app. The video is built on one contrast: a line of code
that *looks completely innocent* versus the 101 queries it actually fires, followed
by the jump into the real source file. No stock visuals, no abstract gradients —
the product's own diagram, its own passport card, its own code viewer.

## Hook (first 2-3 seconds)

`GET /books` appears as a mono chip — then the passport's own opening line types
in: **"returns a list of books — and looks completely innocent."**

That sentence is the hook because it is what every developer has written a
hundred times, and the video is about to prove it is a lie.

## Key moments (the middle)

- **The counter slams 1 → 101.** `query101` lights up on the diagram and the
  count ticks: one query for the books, then one per row.
- **The passport card slides in over the live diagram** — `BookService`, the
  `NAIVE` tag, and "findAll() loads the books, then a getter is called per book
  while rendering", with `code: CatalogFetchService.java` as a chip at its foot.
- **The code viewer opens the real file** — `CatalogFetchService.java`, 53 lines,
  the STRUCTURE outline popping in, and "4 explained lines in this file" with the
  explained line lit.

## Outro / punchline

The stat row lands (21 diagrams · 196 nodes · 61 guided views · 128 quiz items),
then the title and the lowest-friction claim in software:

**"Open index.html. Nothing to install."**

## User flow worth showing

1. **Entry** — the hub: six tracks, 21 diagrams, one folder.
2. **Key action** — hover a node on the N+1 diagram; the semantic passport
   explains it and offers the code.
3. **Result** — the mirrored `CatalogFetchService.java` opens with its structure
   and explained lines.

## Tone

- Preset: `polished`
- Creative direction: *near-black developer-tool product film — emerald accent,
  monospaced labels, precise small motion, no theatrics*
- Interpretation: fewer scenes, longer holds, confidence through restraint. Type
  is technical (mono for labels, system sans for headlines). Motion is short and
  exact (0.3–0.5s) with generous settled time on every line. No flashes, no
  parallax, no decoration that is not the product.

## Format: landscape — 1920x1080
## Duration: 21.5 seconds

## Visual identity (from the project)

- Background: `#020617` (hub `--bg`), panels `rgba(15,23,42,.5)` with `#1e293b` borders
- Accent: `#34d399` (hub `--arrow-emphasis`), light-theme `#059669`
- Text: `#ffffff`, muted `#94a3b8`, dim `#64748b`
- Secondary accents seen in the guide hero gradient: sky and violet over the
  emerald accent (`linear-gradient(100deg, accent, sky, violet)`)
- Display font: system sans (`ui-sans-serif, system-ui, "Segoe UI", Roboto, …`)
- Body font: system sans, same stack
- Label / technical font: monospace (`ui-monospace, Menlo, Consolas`) — used for
  node tags, line numbers, structure chips and endpoint paths
- Strongest visual element: **the N+1 diagram with the passport card open** —
  emerald nodes on near-black, dashed stage columns, glowing arrow edges

## Share copy (draft)

21 diagrams, 196 nodes, one real Spring Boot app — and every number in them was
measured, not made up.

## Audio direction

- Role: sparse professional accents over a warm bed — a developer-tool piece
  should feel precise, not hyped
- Music: `happy-beats-business-moves-vol-11-by-ende-dot-app.mp3` (114.84 BPM,
  bundled preset available)
- Music treatment: starts at 0 with a short fade-in (0–0.6s), sits low under type
  scenes, lifts slightly at the diagram reveal, fades out over the last ~1.2s
- Music cue guidance: preset at
  `assets/music/happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json`.
  Strong cues in window: 1.60, 3.70, 5.80, 6.34, 8.96, 9.50, 12.65, 17.91.
  Beat grid ~0.52s. Restraint: three strong-cue locks only (5.80 / 12.65 / 17.91).
- Audio-reactive treatment: subtle — music RMS should warm the background glow
  and let the emerald edge of the active node breathe; no waveform bars, no
  strobing
- Audio-coupled moments:
  - counter ticking 1 → 101 — short tick/click per increment
  - passport card arrival — one soft card/whoosh on the 6.34 strong cue
  - STRUCTURE chips popping in — one light click per chip, then hold
  - explained line lighting up — a single soft confirmation cue
  - final title — one restrained low hit over the music tail
- SFX posture: sparse. Motion-matched only. Prefer low high-frequency-risk files
  (see `sfx/sfx-analysis.md`) because this is a polished, not chaotic, edit.
- Restraint rule: audio must never lead the read. If a sound competes with a
  line of text, the sound loses.

## Storyboard

### Scene 1 — "Looks innocent" — 5.80s

Black. A mono chip `GET /books` fades in top-left of centre. Under it the headline
types in over two lines: **"returns a list of books — and looks completely
innocent."** Both are verbatim from the `GET /books` passport card. Nothing else
on screen. Ends on a hard cut.

Sequential/interaction: yes — chip first (0.4s), then the headline lines arrive
one after the other (0.5s stagger), each held past its reading floor.
Audio intent: calm, closed, slightly suspicious — the quiet before the reveal.
Audio-coupled idea: headline typed word-by-word with soft key ticks.
Music: low bed, fade in.
Transition mood: clean hard cut on the strong cue at 5.80s → Scene 2

### Scene 2 — "101 queries" — 6.85s

The N+1 diagram (real project material, same dark palette) scales in from 1.04
with the dashed stage columns and emerald edges. Node `BookService` glows; node
`query101` activates and a counter chip ticks **1 → 101** beside the label
`queries`. Then the **passport card slides in from the node**: tag `NAIVE`,
summary *"findAll() loads the books, then a getter is called per book while
rendering"*, three bullets, and the footer chip `code: CatalogFetchService.java`.
A small note under the counter: *"One list query, then one more per row."*

Sequential/interaction: yes — diagram (5.80) → counter (6.34) → passport (6.9)
→ code chip pulses last. Counter is a count-up, not a text swap.
Audio intent: the reveal — energy lifts, then settles under the passport.
Audio-coupled idea: tick-per-increment on the counter, one soft card arrival on
the passport, the code chip pulses on a beat.
Music: bed lifts; strong cue at 6.34 carries the counter.
Transition mood: the `code:` chip pulses and the frame pushes into it → Scene 3

### Scene 3 — "The real file" — 5.26s

The code viewer opens exactly as the product renders it: header
`CATALOGFETCHSERVICE.JAVA · Service · 53 lines`, the file card with
`src/main/java/com/example/bookstore/service/CatalogFetchService.java`, the
`STRUCTURE (5)` chip row, then line-numbered Java with the real content —
`@Service`, `private final QueryCounter queryCounter;`, and the explained
`@Transactional(readOnly = true)` block lit with an emerald gutter bar. The line
`4 explained lines in this file` sits above the code.

Sequential/interaction: yes — panel (12.65) → file card → 4 structure chips pop
in fast (0.12s stagger) then hold → explained line lights last.
Audio intent: focused, mechanical — the sound of something being opened and read.
Audio-coupled idea: light click per structure chip, one soft confirmation when
the explained line lights.
Music: steady; strong cue at 12.65 carries the panel open.
Transition mood: clean crossfade → Scene 4

### Scene 4 — "Nothing to install" — 3.59s

The stat row from the hub arrives left to right, quickly, then holds as a set:
`21 diagrams` · `196 nodes` · `61 guided views` · `128 quiz items`. Below it the
title **Spring Boot Diagram Atlas** and the closer:

**"Open index.html. Nothing to install."**

Sequential/interaction: yes — four stat items stagger 0.12s apart and the whole
set holds for the remaining time (do not put one text line per beat; that
outruns reading). Title and closer arrive after the set has landed.
Audio intent: resolve. One restrained hit under the title, then let the music
tail out.
Audio-coupled idea: four quick ticks for the four stats, final low hit on the
title.
Music: strong cue at 17.91 carries the stat row; fade out over the last 1.2s.
Transition mood: none — hold to black.

**Music mood for this video:** polished / warm-upbeat, restrained
**Audio summary:** a warm bed fades in under a quiet typographic hook, lifts on
the diagram and code reveals, and resolves under the stat row before fading out.

## Reading-time floor

- `GET /books` chip: short label — 0.8s settled
- Headline "returns a list of books — and looks completely innocent.": 10 words
  → 3.0s settled (Scene 1 is 5.80s, so this clears comfortably)
- Counter label `101 queries`: short label — 0.8s settled
- Passport summary line: 11 words → ~2.4s settled (holds until the scene cuts)
- Note "One list query, then one more per row.": 8 words → 2.4s settled
- `4 explained lines in this file`: 6 words → 1.8s settled
- Stat row: held as a full set for ~2.4s
- Closer "Open index.html. Nothing to install.": 6 words → 1.8s settled
