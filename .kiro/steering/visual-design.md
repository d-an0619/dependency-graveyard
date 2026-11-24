---
inclusion: fileMatch
fileMatchPattern: "src/ui/**"
---

# Visual Design — Spooky, Readable, Accessible

Basis: the "UI Design" section of `.kiro/specs/dependency-graveyard/design.md`.

## Theme

- Single full-viewport scene: night sky gradient (deep indigo to black), full moon with glow, drifting fog layers, silhouetted fence and bare trees at the edges.
- Fonts: a worn display serif for titles, a readable sans for data and UI copy.
- Palette: desaturated blues/greys for the scene; verdict colors are accents only.

## Rules

- Verdicts are never conveyed by color alone (FR-8.2): each verdict has a distinct shape (tombstone = DEAD, ghost = DYING, tree = ALIVE, fog-shrouded mound = UNKNOWN) plus an always-visible text label. Artwork is inline SVG.
- Tone: spooky but in plain, easy-to-read English. Creepy wording must not hurt comprehension or accessibility (screen-reader text stays clear and literal).
- Respect `prefers-reduced-motion`: fog drift, ghost float, and moon glow animations run only under `@media (prefers-reduced-motion: no-preference)`; reduced mode falls back to opacity-only transitions (FR-8.3).
- All interactive elements are keyboard navigable with visible focus (FR-8.1); the epitaph dialog manages focus (in on open, Escape closes, return to the triggering grave, FR-5.3).
- Modals use `role="dialog"` / `aria-modal`; progress is an `aria-live="polite"` region; errors render in a `role="alert"` region.
