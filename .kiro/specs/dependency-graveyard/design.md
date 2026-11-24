# Dependency Graveyard — Design

## Context

The approved requirements live in `requirements.md`. This document describes the architecture, data flow, and component design of the static React + Vite app. No backend exists; every network call goes from the browser to the public npm registry and the OSV API.

## Goals

- A pure, testable core (parsing, resolution, verdict) with no I/O, so property-based tests can run in Node without mocks of the network.
- A thin I/O layer (registry + OSV fetchers) behind small interfaces, so the core can be tested against fabricated registry payloads.
- A polished, spooky, accessible UI that renders results incrementally as lookups complete.

## Non-Goals

- Transitive dependency resolution, non-npm ecosystems, persistence, offline support.

## Architecture

```
src/
  main.tsx                  # bootstrap
  App.tsx                   # top-level state machine
  analyze.ts                # analyzePackage: classify -> registry -> resolve -> OSV -> verdict
  types.ts                  # domain types (DependencyInput, RegistryInfo, Vulnerability, Verdict, ...)
  config.ts                 # thresholds, concurrency, timeouts (single config object)
  core/
    parsePackageJson.ts     # parse + validate pasted JSON -> DependencyInput[]
    resolveVersion.ts       # specifier -> resolved version | unresolvable reason
    verdict.ts              # classifyVerdict(input, now) -> Verdict
    summary.ts              # build summary counts and sentence
  io/
    registry.ts             # npm registry fetch + parse (dist-tags, time, deprecations)
    osv.ts                  # OSV single-query fetch + parse
    pool.ts                 # limited-concurrency task pool with per-request timeout
  ui/
    components/             # PasteForm, Graveyard, Grave, Epitaph, Summary, Progress, PrivacyNote
    theme/                  # spooky theme, CSS (or CSS modules), reduced-motion handling
  sample/                   # bundled example package.json (all four verdicts)
```

Dependency rule: `ui` may depend on `core` and `io`; `io` depends on `core` types only; `core` depends on nothing but `types`/`config` (no fetch, no clock, no DOM). This keeps the property-based tests free of mocking.

## Domain Model

```ts
type Verdict = 'ALIVE' | 'DYING' | 'DEAD' | 'UNKNOWN';

type UnresolvableReason =
  | 'git url' | 'tarball url' | 'file url' | 'link protocol' | 'workspace protocol'
  | 'npm alias' | 'no satisfying version' | 'unknown dist-tag';

type Specifier =
  | { kind: 'range'; range: string }
  | { kind: 'dist-tag'; tag: string }
  | { kind: 'unresolvable'; reason: UnresolvableReason };

interface DependencyInput { name: string; rawSpecifier: string; specifier: Specifier; }

interface RegistryInfo {
  latestVersion: string;            // dist-tags.latest
  versions: string[];              // all published versions
  time: Record<string, string>;    // version -> ISO timestamp (modified/created ignored)
  deprecated: Record<string, string | undefined>; // version -> message
}

interface PackageReport {
  input: DependencyInput;
  resolvedVersion: string | null;
  registry: RegistryInfo | null;
  vulnerabilities: Vulnerability[];  // for resolvedVersion
  lookupError: string | null;        // e.g. "not found on npm", timeout, network
  verdict: Verdict;
  verdictReason: string;            // human-readable, shown in epitaph
}
```

## Core Logic

### parsePackageJson (core/parsePackageJson.ts)

- `JSON.parse` with error mapping to a friendly inline message (include position when available).
- Accepts an object with `dependencies` and/or `devDependencies` as string maps. If both are missing or empty, return an input error.
- Duplicates (same name in both maps, devDependencies wins or is flagged) — we take the union with `devDependencies` overriding, since it is the more specific install.
- Output: `DependencyInput[]` (order preserved, dependencies first, then devDependencies).

### resolveVersion (core/resolveVersion.ts)

Pure function `(specifier: string, registry: RegistryInfo) => { version } | { reason: UnresolvableReason }`.

- Classification of the raw specifier:
  - Starts with `git+`, `git://`, `https://`/`http://` ending in `.git`, `github:user/repo` → `git url`.
  - A plain `https://`/`http://` URL ending in `.tgz` (tarball URL, `https://.../x.tgz`) → `tarball url`.
  - `file:` or a path (`.`, `../x`, `./x`) → `file url`.
  - `link:`/`workspace:` protocols → their reason.
  - `npm:<real-name>@<range>` → `npm alias`.
  - Otherwise, if the string (after stripping whitespace) is a valid semver range → `range`; if it is a bare identifier (no digits/dots structure, e.g. `latest`, `next`) → `dist-tag`.
- Range resolution: use `semver` package's `maxSatisfying(versions, range)`. `null` → `no satisfying version`.
- Dist-tag resolution: look up `dist-tags[tag]` in the registry; missing → `unknown dist-tag`. Note: the registry fetcher must request and keep the full `dist-tags` map for this.

### verdict (core/verdict.ts)

Pure: `classifyVerdict(report: VerdictInputs, now: Date): Verdict`.

Precedence (from FR-4.6):

1. `UNKNOWN` — unresolvable specifier or lookup error.
2. latest version deprecated → `DEAD`.
3. age >= 3 years → `DEAD`.
4. age >= 1 year, OR vulnerability count > 0, OR resolved version deprecated (while latest is not) → `DYING`.
5. Otherwise `ALIVE`.

Age = `now - lastPublishTime` where `lastPublishTime = max(time[version])` over published versions (excluding `modified`, `created` keys). The date math uses plain `Date` arithmetic against `now`, never reads the wall clock. A "year" is a fixed 365-day length, defined once as a millisecond constant in `CONFIG` and used for both thresholds.

Thresholds (`config.ts`):

```ts
const YEAR_MS = 365 * 24 * 60 * 60 * 1000; // fixed-length year

export const CONFIG = {
  yearMs: YEAR_MS,          // one "year" for age math
  dyingMs: 1 * YEAR_MS,     // age >= dyingMs -> DYING eligible
  deadMs: 3 * YEAR_MS,       // age >= deadMs -> DEAD
  concurrency: 6,
  requestTimeoutMs: 10_000,
  registryUrl: 'https://registry.npmjs.org',
  osvQueryUrl: 'https://api.osv.dev/v1/query',
};
```

Boundary rule: age `>= dyingMs` (i.e. exactly one 365-day year, to the millisecond) → eligible for DYING; age `>= deadMs` (exactly three 365-day years) → DEAD. Tests pin these with fixed dates.

A separate `verdictReasons(input, verdict)` produces the epitaph text as an array of every applicable reason (e.g. "no publish in 3 years", "deprecated: <message>", "resolved version has 2 known vulnerabilities", "not found on npm", "git URL cannot be resolved"). A DYING verdict can carry several reasons at once (age, vulnerabilities, resolved-only deprecation); the "upgrade available" note is always kept when the resolved version is deprecated while the latest is not.

## I/O Layer

### pool.ts

`runWithConcurrency(tasks: Task[], limit: 6)` returning results as they settle via async iterator or callback. Timeouts are applied per fetch request, not per task: each underlying `fetch` (registry request, OSV request) gets its own 10-second `AbortController` deadline. A registry timeout resolves that package as `UNKNOWN` ("lookup timed out"). An OSV timeout follows the accepted OSV failure policy: an empty vulnerability list plus a "vulnerability check unavailable" note in the epitaph; the verdict is not UNKNOWN. A timeout resolves as an error for that request, never a rejection of the whole pool.

### registry.ts

- `fetchRegistry(name): Promise<RegistryInfo | { error: string }>` — GET `registry.npmjs.org/<name>` (URL-encode the name; scoped names work as-is). 404 → `{ error: 'not found on npm' }`.
- We always fetch the full registry document, because per-version publish times (`time`) are only available there; the abbreviated document does not carry them. From the full document we extract only what we need: `dist-tags`, the `time` map, and each version's `deprecated` message from `versions[].deprecated`.
- Registry responses can be large (packages with hundreds of versions); the one-off JSON parse happens on the main thread and is acceptable (see Performance).
- Last publish = `max(time)` over keys that are actual versions.

### osv.ts

- `queryVulnerabilities(name: string, version: string): Promise<Vulnerability[] | { error: string }>` — a single POST to `https://api.osv.dev/v1/query` with body `{ "package": { "name", "ecosystem": "npm" }, "version" }`. A `200` with `vulns: []` (or no `vulns` key) means no known vulnerabilities; a `404` also means none.
- The response's `vulns[].summary` strings are shown in the epitaph's vulnerability list, each linked to the advisory (OSV `id` link or `references[].url`).
- Failure policy (accepted): FR-2.3's "failed lookup marks that package UNKNOWN" applies to the registry lookup, which is the primary source. A failed OSV query affects only vulnerability data, so the package gets an empty vulnerability list plus a "vulnerability check unavailable" note in the epitaph rather than an UNKNOWN verdict. This keeps an OSV outage from degrading every package to UNKNOWN.

### Orchestration (analyzePackage)

The whole per-package flow lives in one function, `src/analyze.ts`:
`analyzePackage(input, { fetchFn?, now? })` — classify → (if the specifier is
resolvable-by-classification: registry fetch → version resolution → OSV
query) → verdict → reasons. It is shared by `App.tsx` and
`scripts/check-sample.ts`, so the script and the UI can never disagree
about the pipeline. It never throws for per-package failures; failures
become part of the returned `PackageReport`.

Flow inside `analyzePackage`:

1. Classify the raw specifier. If it is unresolvable by classification
   (git/tarball/file URL, `link:`/`workspace:`/`npm:` protocol), return
   UNKNOWN immediately: no registry or OSV request at all, `registry: null`,
   so the epitaph shows no latest version or last publish date (FR-2.1, FR-3.3).
2. Otherwise fetch the registry. 404/timeout/network failure → UNKNOWN
   with the lookup error; no OSV request.
3. Resolve the specifier against the registry document. Resolution failure
   (`no satisfying version`, `unknown dist-tag`) → UNKNOWN; the fetched
   registry data is kept in the report.
4. Query OSV for the resolved version. A failed OSV query (including
   timeout) does not change the verdict: the report keeps an empty
   vulnerability list and `vulnCheckUnavailable: true`, shown as a
   "vulnerability check unavailable" note in the epitaph (accepted policy).
5. Compute the verdict once with the injected `now` and collect every
   applicable reason, so a grave never flips from ALIVE to DYING after
   being shown.

`App.tsx` builds one `analyzePackage` call per dependency and runs them
through the pool (limit 6). Each finished call emits its complete
`PackageReport`; the grave renders once, already final. Graves appear in
completion order while pending slots show the "digging..." placeholder,
then settle into a stable sorted order (DEAD, DYING, UNKNOWN, ALIVE, then
alphabetical) once all tasks complete. Progress: `X of N checked` counts
completed tasks (registry + OSV both done, or skipped-lookup UNKNOWNs).

## UI Design

Single screen, three vertical zones; a full-viewport spooky scene.

### Visual theme

- Night sky gradient (deep indigo to black), full moon, drifting fog layers, silhouetted fence and bare trees at the edges. CSS animations for fog drift, moon glow, ghost float; all gated behind `@media (prefers-reduced-motion: no-preference)`.
- Font: a display serif with a slightly worn feel for titles (e.g. IM Fell English or similar from Google Fonts), a readable sans for data.
- Palette: desaturated blues/greys for the scene; verdict colors used only as accents (shape + label always present).

### Components

- `PasteForm`: label, textarea (monospace), "Dig graves" primary button, "Try an example" secondary button, inline error region (`role="alert"`). Also the privacy notice line: "package names are sent to npm and OSV; nothing is stored".
- `Progress`: live region (`aria-live="polite"`) with "12 of 42 checked" and a thin progress bar.
- `Summary`: "7 of 42 dependencies are dead, 12 are dying" — counts computed by `core/summary.ts`.
- `Graveyard`: grid of `Grave` tiles (CSS grid, wraps). Each grave is a `<button>` (or a div with `role="button"` and `tabindex` — button is simpler) containing:
  - the creature/artwork: tombstone (DEAD), ghost (DYING), tree (ALIVE), fog-shrouded mound (UNKNOWN),
  - the package name (truncated with title attribute),
  - a text verdict label ("dead", "dying", "alive", "unknown"),
  - artwork delivered as inline SVG components (no image sprites) so shapes are accessible and stylable.
- `Epitaph`: modal dialog (`role="dialog"`, `aria-modal`), focus moves into it on open, Escape closes, focus returns to the triggering grave. Content: package name, installed range, resolved version, latest version and last publish date (only when registry data exists; unresolvable specifiers carry none, FR-2.1), vulnerability count with links (each OSV finding shows its advisory `summary` linked to the advisory URL), deprecation message, "upgrade available" note, UNKNOWN reason. Rendered as a weathered stone tablet.

### Incremental rendering

State: `reports: PackageReport[]` keyed by package name; a grave slot renders as soon as its report exists, showing a "digging..." placeholder (a mound with a shovel) while pending. The list re-sorts only when all lookups complete, to avoid graves jumping around during progress.

### Accessibility

- Verdict conveyed by distinct SVG shape + always-visible text label, never color alone (FR-8.2).
- Visible `:focus-visible` outlines on all interactive elements; a skip-to-graveyard landmark.
- Reduced motion: fog/ghost/moon animations disabled; opacity transitions only.

## Sample data

`sample/example.package.json` is bundled (imported as a raw asset). Contents chosen so the analysis (against the live registry) yields all four verdicts. Verified against the registry as of 2026-11-24:

```json
{
  "name": "graveyard-demo",
  "private": true,
  "dependencies": {
    "react": "^18.0.0",
    "moment": "^2.29.0",
    "lodash": "4.17.15",
    "request": "^2.88.2",
    "left-pad": "^1.3.0",
    "colors": "^1.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "ghost-town": "github:some/missing-repo"
  }
}
```

Rationale:

- `react`, `moment`, `@types/node`: recently published → `ALIVE`.
- `request`, `left-pad`: latest version deprecated → `DEAD`.
- `colors`: last publish 2022-01, older than 3 fixed years → `DEAD` by age.
- `lodash` pinned to exact `4.17.15`: this version has 5 known vulnerabilities in OSV → `DYING` (stable, independent of publish age).
- `ghost-town` via `github:` URL → `UNKNOWN` (git url).

Because verdicts drift as packages publish or deprecate over time, the sample is verified by a script. `scripts/check-sample.ts` (run via `npm run check-sample`, using `tsx`) runs the same `analyzePackage` pipeline against the live registry and OSV, and fails if any of the four verdicts is missing. It is intended to be run before a demo; it is not part of the unit test suite, since it hits the network. Unresolvable specifiers are reported without registry data (no latest or last-publish line).

## Error handling

- Parse errors: inline, specific ("Invalid JSON: <detail>", "No dependencies found").
- Registry failures: per-package `UNKNOWN` with reason; rest unaffected.
- OSV query failures: per-package "vulnerability check unavailable" note in the epitaph; verdict unaffected (see io/osv.ts).
- Timeouts: 10s via AbortController, surface as "lookup timed out".

## Testing

- `core/verdict`: fast-check properties —
  - exactly 3 years (ms-precise) → DEAD; 3 years minus 1ms → not DEAD by age.
  - exactly 1 year → DYING; 1 year minus 1ms → ALIVE (assuming no vulns/deprecation).
  - deprecated latest → DEAD regardless of age or vulnerabilities.
  - resolved-only deprecation → DYING with "upgrade available" reason, never DEAD.
  - any vulnerability count > 0 → at least DYING.
  - lookup error or unresolvable → UNKNOWN regardless of other inputs.
  - precedence: shrink arbitrary inputs and assert the one-line precedence order holds.
- `core/resolveVersion`: fast-check over generated specifiers — valid ranges resolve to the highest satisfying published version; `git:`, `file:`, `link:`, `workspace:`, tarball URLs, `npm:` and unsatisfiable ranges return the right reason; dist-tags resolve via the tags map.
- `core/parsePackageJson` and `core/summary`: unit tests.
- UI: light behavior tests (input validation rendering, epitaph opens on click and closes on Escape) with Vitest + Testing Library. Property tests for the full pipeline are out of scope (network).
- `now` is always injected; no test reads the real clock.

## Performance

- One registry GET and one OSV POST per package. A 100-dependency file costs ~200 requests at concurrency 6, fine for a hackathon demo.
- Full-document registry parsing for huge packages (e.g. `lodash`) is done on the main thread but is a one-off JSON parse; acceptable. If it ever janks, the fallback is streaming extraction of `dist-tags`/`time` only — noted, not built.

## Deployment

- Hosted on GitHub Pages at the repository URL `dependency-graveyard` (repo name), so Vite's `base` is set to `'/dependency-graveyard/'` in `vite.config.ts`.
- A GitHub Actions workflow (`.github/workflows/deploy.yml`) triggers on push to `main`, runs the static build (`npm ci && npm run build`), and deploys `dist/` via the official `actions/deploy-pages` flow.
- Build output is plain static files; no server runtime is required.

## Open Decisions (resolved)

- Sorting of graves: stable by verdict severity (DEAD, DYING, UNKNOWN, ALIVE) once all lookups complete, then alphabetically.
- devDependencies overriding duplicates: accepted.
- OSV outage does not degrade to UNKNOWN: accepted (see io/osv.ts).
