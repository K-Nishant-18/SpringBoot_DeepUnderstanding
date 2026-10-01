# Hyperframes Composition Brief: Spring Boot Diagram Atlas

## Objective
Create a short launch-style brag video for the Spring Boot Diagram Atlas — a
folder of 21 interactive Spring Boot diagrams with a mirrored runnable app.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 21.5 seconds

## Source Material
- Project root: `D:/1.Notes ✨`
- Primary files read: `index.html`, `guide.html`, `sbkit.css`, `Spring_Boot_Nplus1.html`
  (hover-detail + guided-view JSON), `README.md`, `content-index.js`
- Product name: **Spring Boot Diagram Atlas**
- Tagline / strongest claim: "Open index.html. Nothing to install."
- Key UI or visual moment to recreate: the **N+1 diagram with the semantic
  passport card open** — emerald nodes on `#020617`, dashed stage columns, the
  `BookService` node glowing, the `NAIVE` tag, and the `code: CatalogFetchService.java`
  chip. Second: the **code viewer** header, STRUCTURE chip row and line-numbered
  Java with an emerald gutter bar on the explained line.
- Copy that must appear verbatim (all real, from the project):
  - `GET /books`
  - "returns a list of books - and looks completely innocent."
  - "findAll() loads the books, then a getter is called per book while rendering."
  - "One query for the books, then 100 more for the authors."
  - "One list query, then one more per row - 101 round trips for 100 books."
  - "4 explained lines in this file"
  - `src/main/java/com/example/bookstore/service/CatalogFetchService.java`
  - "Open index.html. Nothing to install."

## Creative Direction
- Tone preset: `polished`
- Creative direction: near-black developer-tool product film — emerald accent,
  monospaced labels, precise small motion, no theatrics
- Interpretation: fewer scenes, longer holds, confidence through restraint. Type
  is technical: mono for labels/tags/paths, system sans for headlines. Entrances
  are 0.3–0.5s and everything else is settled reading time. No flashes, no
  parallax, nothing decorative that is not the product itself.
- Angle: documentation describes Spring Boot; this shows the receipts. One line
  that looks innocent, the 101 queries it actually fires, then the jump into the
  real source file.
- Hook: `GET /books` chip, then "returns a list of books - and looks completely
  innocent." typed underneath.
- Outro / punchline: "Open index.html. Nothing to install."
- Avoid:
  - Generic SaaS language ("streamline", "supercharge", "unlock")
  - Abstract filler visuals, colour washes, particles, waveform graphics
  - Redesigning the product's UI into something it does not look like

## Visual Identity
- Background: `#020617`
- Panel fill: `rgba(15,23,42,.5)`, panel border `#1e293b`, toolbar border `#334155`
- Text: `#ffffff`; muted `#94a3b8`; dim `#64748b`
- Accent: `#34d399` (secondary ramps `#059669`, and the guide's sky/violet
  gradient partners for the title only)
- Display font: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- Body font: same system sans stack
- Mono / label font: `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`
- Visual references from the project: the N+1 diagram grid and dashed stage
  columns (`01 / Web layer`, `02 / Service`, `03 / Fetch plan`, `04 / Database`),
  the passport card with its `NAIVE` tag and bullet list, the hub's stat row
  (21 / 6 / 196 / 209 / 61), the code viewer header and STRUCTURE chip row.

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. **Looks innocent** — 5.80s — `GET /books` chip + the verbatim passport
   headline, typed. Nothing else.
2. **101 queries** — 6.85s — the real N+1 diagram scales in, `query101` counts
   1 → 101, the BookService passport card slides in with its `code:` chip.
3. **The real file** — 5.26s — the code viewer opens `CatalogFetchService.java`
   with the file card, STRUCTURE chips, and the explained line lit.
4. **Nothing to install** — 3.59s — hub stat row (21 / 196 / 61 / 128) lands as
   a set, then the title and closer.

Total 21.50s. Scene boundaries at 5.80 / 12.65 / 17.91 are intended strong-cue
locks.

## Audio
- Audio role: sparse professional accents over a warm bed
- Audio arc: quiet under the typographic hook → lifts at the diagram reveal →
  focused/mechanical under the code viewer → resolves under the stat row → tail out
- Music: `assets/music/happy-beats-business-moves-vol-11-by-ende-dot-app.mp3`
- Music treatment: 0–0.6s fade-in, low posture under Scene 1, slight lift from
  5.80, hold through Scene 3, fade out over the final ~1.2s
- Music cue guidance: bundled preset at
  `assets/music/happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json`
  (114.84 BPM, strong cues in window: 1.60, 3.70, 5.80, 6.34, 8.96, 9.50, 12.65,
  17.91; beat grid ~0.52s). Intended locks: 5.80 (diagram reveal), 12.65 (code
  viewer open), 17.91 (stat row). Everything else is optional and may be
  abandoned if it hurts readability.
- Audio-reactive treatment: subtle — music energy warms the background glow and
  lets the active node's emerald edge breathe. No waveform bars, no strobing, no
  particles. If audio extraction is unavailable, document it and continue without.
- Audio-coupled moments:
  - counter ticking 1 → 101 — short tick per increment
  - passport card arrival — one soft card cue at 6.34
  - STRUCTURE chips popping in — one light click per chip, then hold
  - explained line lighting — one soft confirmation
  - final title — one restrained low hit over the music tail
- SFX selection guidance: sparse and motion-matched only; prefer low
  high-frequency-risk files. Consult `sfx/sfx-analysis.md` / `.json`.
- Exact SFX choice: Hyperframes should choose filenames, timestamps, density and
  volume from the implemented animation.
- Audio files: music is already copied to `composition/assets/music/`; copy any
  selected SFX into the same `assets/` tree.

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core`
(composition contract + `data-*` timing), `hyperframes-animation` (motion),
`hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes`
(seek-safe keyframes) and `hyperframes-cli` (lint/check/render). /brag is its own
workflow: do not enter the `hyperframes` entry-point intent interview and do not
route into its generic promo / launch-video workflow. Prefer native Hyperframes
conventions over anything in `/brag`.

Requirements:
- Show at least one real UI, copy, or visual element from the source project —
  the N+1 diagram and the code viewer are non-negotiable.
- Keep all text readable in the final render; honour the reading-time floors in
  `brag-plan.md`.
- Keep the video within 15–25 seconds (target 21.5s).
- Include the music layer; audio was not disabled.
- Treat `/brag` audio notes as guidance, not a fixed cue sheet. Choose SFX after
  the visual animation exists.
- Treat music cue metadata as optional timing hints. Ignore cues that hurt
  readability, scene pacing, or the product story.
- Major reveals may move toward nearby strong cues within ~0.15s; smaller
  entrances may align to beat points within ~0.10s. Use only 1–3 strong cue
  locks (5.80 / 12.65 / 17.91 are the intended ones).
- For sequential STRUCTURE chips, reveal fast (≈0.12s stagger) and hold the set —
  do not put a text line on every beat.
- When music is present, consider the audio-reactive workflow: extract audio data
  and wire at least one visual element to RMS/frequency energy. If extraction is
  unavailable (no helper / no ffmpeg), note it and skip rather than block.
- Use local assets for audio and any runtime/media dependencies.
- Run `hyperframes check` before render — it is brag's single gate.
