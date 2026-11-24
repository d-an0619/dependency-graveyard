---
inclusion: always
---

# Project Structure

```
src/
  main.tsx        # bootstrap
  App.tsx         # top-level state machine / orchestration
  types.ts        # domain types (Verdict, DependencyInput, RegistryInfo, ...)
  config.ts       # single CONFIG object: thresholds, concurrency, timeouts, URLs
  core/           # pure logic: parsePackageJson, resolveVersion, verdict, summary
  io/             # network: registry, osv, pool, fetchWithTimeout
  ui/             # components/ (PasteForm, Graveyard, Grave, Epitaph, ...) + theme/
sample/           # bundled example package.json (all four verdicts)
scripts/          # check-sample.ts (live-registry sample verification)
```

## Layer rules

- `core/` is pure: no `fetch`, no `Date.now()` or any wall-clock read (time is injected), no DOM access. It may import from `src/types.ts` and `src/config.ts` only. This keeps the property-based tests mock-free.
- `io/` depends on `core` types and `config` only; it owns all network access (registry fetch, OSV query, concurrency pool, per-request 10s timeout).
- `ui/` may depend on `core` and `io`; it renders results incrementally as lookups complete. Artwork is inline SVG.

When adding code, place it in the layer that owns its concerns; never let `core/` gain I/O, clock, or DOM dependencies.
