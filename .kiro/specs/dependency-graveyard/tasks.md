# Dependency Graveyard — Tasks

## 1. Project scaffold

- [ ] 1.1 Initialize the repo as a Vite + React + TypeScript project (`npm create vite@latest . -- --template react-ts` adapted for an existing directory), keeping the committed `.kiro/` directory intact and excluded from nothing (never gitignored).
- [ ] 1.2 Install runtime deps: `semver`. Install dev deps: `vitest`, `@vitest/coverage`, `fast-check`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`.
- [ ] 1.3 Configure Vitest (jsdom environment, `src/**` test glob) and add npm scripts: `dev`, `build`, `test`, `check-sample`.
- [ ] 1.4 Set `base: '/dependency-graveyard/'` in `vite.config.ts`.

## 2. Core: types and config

- [ ] 2.1 Create `src/types.ts` with the domain model: `Verdict`, `UnresolvableReason`, `Specifier`, `DependencyInput`, `RegistryInfo`, `Vulnerability`, `PackageReport`.
- [ ] 2.2 Create `src/config.ts` with `YEAR_MS` (365-day fixed year), `dyingMs`, `deadMs`, `concurrency: 6`, `requestTimeoutMs: 10_000`, `registryUrl`, `osvQueryUrl`.

## 3. Core: parse

- [ ] 3.1 Implement `core/parsePackageJson.ts`: JSON parse with friendly error (including position), require non-empty `dependencies`/`devDependencies`, union with devDependencies overriding duplicates, stable order (dependencies first).
- [ ] 3.2 Unit tests: valid input, invalid JSON, no dependencies, both maps, duplicate names.

## 4. Core: specifier classification and version resolution

- [ ] 4.1 Implement `core/resolveVersion.ts`: classify raw specifier (git url, tarball url, file url, link/workspace, npm alias, dist-tag, semver range), then resolve: `semver.maxSatisfying` for ranges, `dist-tags[tag]` for tags, with `no satisfying version` / `unknown dist-tag` outcomes.
- [ ] 4.2 Property-based tests (fast-check): ranges (`^`, `~`, exact, compound ranges) resolve to the highest satisfying published version; git/tarball/file/link/workspace/npm-alias specifiers return the correct reason; unsatisfiable ranges and unknown dist-tags return correct reasons; dist-tags resolve via the tag map.

## 5. Core: verdict

- [ ] 5.1 Implement `core/verdict.ts`: `classifyVerdict(report, now)` (pure, `now` injected) with precedence `UNKNOWN > deprecated(latest) > age>=deadMs > (age>=dyingMs or vulnerabilities or resolved-version deprecated) > ALIVE`; `lastPublish = max(time[version])` excluding `modified`/`created`; plus `verdictReason` producing epitaph text (including "upgrade available" for resolved-only deprecation).
- [ ] 5.2 Property-based tests: exact `dyingMs` boundary → DYING, 1ms less → ALIVE; exact `deadMs` → DEAD, 1ms less → not DEAD by age; deprecated latest → DEAD regardless; resolved-only deprecation → DYING never DEAD; vulnerabilities > 0 → at least DYING; lookup error / unresolvable → UNKNOWN regardless; precedence order holds over generated inputs.

## 6. Core: summary

- [ ] 6.1 Implement `core/summary.ts`: counts and sentence "7 of 42 dependencies are dead, 12 are dying".
- [ ] 6.2 Unit tests including 0-dead, all-dead, and mixed cases.

## 7. I/O layer

- [ ] 7.1 Implement `io/pool.ts`: `runWithConcurrency` (limit from config, results delivered as they settle).
- [ ] 7.2 Implement a fetch wrapper applying a per-request 10s `AbortController` timeout (used by both fetchers).
- [ ] 7.3 Implement `io/registry.ts`: full-document GET, URL-encoded names, 404 → "not found on npm", extract `dist-tags`, `time`, per-version deprecations; compute `lastPublish`.
- [ ] 7.4 Implement `io/osv.ts`: single POST `https://api.osv.dev/v1/query` with `{package: {name, ecosystem: 'npm'}, version}`; map `vulns[]` to `Vulnerability` (id, summary, url); 404 or empty `vulns` → no vulnerabilities; failures → `{error}` handled by the accepted OSV policy (note in epitaph, verdict unchanged).

## 8. Sample data and check script

- [ ] 8.1 Create `sample/example.package.json` per the design (react, moment, @types/node, request, left-pad, colors, lodash@4.17.15 exact, github: URL).
- [ ] 8.2 Implement `scripts/check-sample.mjs` (Node, live fetches, reusing core logic): run the full pipeline on the sample and fail if any of ALIVE/DYING/DEAD/UNKNOWN is missing; wire as `npm run check-sample`.
- [ ] 8.3 Run `npm run check-sample` against the live registry and adjust the sample until all four verdicts appear.

## 9. UI: shell and theme

- [ ] 9.1 Build the full-viewport spooky scene: night sky gradient, moon, fog layers, fence/tree silhouettes as CSS/SVG; all animations gated behind `prefers-reduced-motion: no-preference`.
- [ ] 9.2 Add the display serif + sans font setup and the verdict palette (accent only; shape + label always present).

## 10. UI: input form

- [ ] 10.1 `PasteForm`: labeled monospace textarea, "Dig graves" primary button, "Try an example" secondary button (loads the bundled sample and runs analysis), inline error region (`role="alert"`), and the privacy notice line "package names are sent to npm and OSV; nothing is stored".
- [ ] 10.2 Wire parse errors and "no dependencies" errors to the inline region; no analysis runs on error.

## 11. UI: orchestration and progress

- [ ] 11.1 In `App.tsx`, build one task per package (registry → resolve → OSV, sequential inside the task), run via the pool (6 concurrent), compute the verdict once per package, and render each grave only when its task completes.
- [ ] 11.2 `Progress` live region (`aria-live="polite"`): "12 of 42 checked" counting completed tasks, with a progress bar.
- [ ] 11.3 Pending slots render the "digging..." placeholder; after all tasks complete, sort graves DEAD → DYING → UNKNOWN → ALIVE, then alphabetically.

## 12. UI: graveyard, epitaph, summary

- [ ] 12.1 `Grave` tiles as buttons with inline SVG artwork: tombstone (DEAD), ghost (DYING), tree (ALIVE), fog-shrouded mound (UNKNOWN), each with the package name (truncated, title attribute) and a visible text verdict label.
- [ ] 12.2 `Epitaph` modal: `role="dialog"` + `aria-modal`, focus moves in on open, Escape closes, focus returns to the triggering grave; content per FR-5.2 (name, installed range, resolved version, latest version, last publish date, vulnerability list with summaries and advisory links, deprecation message, "upgrade available" note, UNKNOWN reason, "vulnerability check unavailable" note when applicable).
- [ ] 12.3 `Summary` line: dead and dying counts together, e.g. "7 of 42 dependencies are dead, 12 are dying".

## 13. Accessibility

- [ ] 13.1 Keyboard navigability and visible `:focus-visible` styles on all interactive elements; skip-to-graveyard landmark.
- [ ] 13.2 Verify verdicts are never conveyed by color alone (shape + label) and that reduced-motion mode disables fog/ghost/moon animations.

## 14. UI tests

- [ ] 14.1 Input validation rendering (invalid JSON, no dependencies) and example-button behavior (Vitest + Testing Library, network mocked).
- [ ] 14.2 Epitaph opens on grave activation (click and keyboard) and closes on Escape.

## 15. Deployment

- [ ] 15.1 Add `.github/workflows/deploy.yml`: on push to `main`, `npm ci && npm run build`, deploy `dist/` via GitHub Pages actions.
- [ ] 15.2 Verify the production build serves correctly under the `/dependency-graveyard/` base path.

## 16. Final checks

- [ ] 16.1 All unit/property tests pass (`npm run test`); `npm run check-sample` passes against live services.
- [ ] 16.2 Confirm `.kiro/` is committed and not gitignored; commit remaining docs and code with English commit messages.
