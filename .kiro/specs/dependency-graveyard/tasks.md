# Dependency Graveyard — Tasks

## 1. Project scaffold

- [ ] 1.1 Initialize the repo as a Vite + React + TypeScript project, adapted for an existing directory. The existing `README.md`, `LICENSE`, and `.kiro/` directory must be preserved, never overwritten or removed, and `.kiro/` must not be gitignored. _Requirements: NFR-1, NFR-4_
- [ ] 1.2 Install runtime deps: `semver`. Install dev deps: `vitest`, `fast-check`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`. _Requirements: NFR-1, NFR-2_
- [ ] 1.3 Configure Vitest (jsdom environment, `src/**` test glob) and add npm scripts: `dev`, `build`, `test`, `check-sample`. _Requirements: NFR-1, NFR-2_
- [ ] 1.4 Set `base: '/dependency-graveyard/'` in `vite.config.ts`. _Requirements: NFR-1_

## 2. Early deployment (baseline)

- [ ] 2.1 Add `.github/workflows/deploy.yml`: on push to `main`, run `npm test` first, then `npm ci && npm run build`, and deploy `dist/` via GitHub Pages actions (source is already set to GitHub Actions in the repo settings). A failing test run must block the deploy. _Requirements: NFR-1_
- [ ] 2.2 Deploy the default Vite welcome screen to GitHub Pages, confirm the page is served at the `/dependency-graveyard/` base path, and keep this pipeline green before building the rest of the app. _Requirements: NFR-1_

## 3. Core: types and config

- [ ] 3.1 Create `src/types.ts` with the domain model: `Verdict`, `UnresolvableReason`, `Specifier`, `DependencyInput`, `RegistryInfo`, `Vulnerability`, `PackageReport`. _Requirements: FR-4.1, NFR-1_
- [ ] 3.2 Create `src/config.ts` with `YEAR_MS` (365-day fixed year), `dyingMs`, `deadMs`, `concurrency: 6`, `requestTimeoutMs: 10_000`, `registryUrl`, `osvQueryUrl`. _Requirements: FR-4.7, FR-2.2_

## 4. Core: parse

- [ ] 4.1 Implement `core/parsePackageJson.ts`: JSON parse with friendly error (including position), require non-empty `dependencies`/`devDependencies`, union with devDependencies overriding duplicates, stable order (dependencies first). _Requirements: FR-1.1, FR-1.3_
- [ ] 4.2 Unit tests: valid input, invalid JSON, no dependencies, both maps, duplicate names. _Requirements: FR-1.3, NFR-2_

## 5. Core: specifier classification and version resolution

- [ ] 5.1 Implement `core/resolveVersion.ts`: classify raw specifier (git url, tarball url, file url, link/workspace, npm alias, dist-tag, semver range), then resolve: `semver.maxSatisfying` for ranges, `dist-tags[tag]` for tags, with `no satisfying version` / `unknown dist-tag` outcomes. _Requirements: FR-3.1, FR-3.2, FR-3.3_
- [ ] 5.2 Property-based tests (fast-check): ranges (`^`, `~`, exact, compound ranges) resolve to the highest satisfying published version; git/tarball/file/link/workspace/npm-alias specifiers return the correct reason; unsatisfiable ranges and unknown dist-tags return correct reasons; dist-tags resolve via the tag map. _Requirements: FR-3.1, FR-3.2, FR-3.3, NFR-2_

## 6. Core: verdict

- [ ] 6.1 Implement `core/verdict.ts`: `classifyVerdict(report, now)` (pure, `now` injected) with precedence `UNKNOWN > deprecated(latest) > age>=deadMs > (age>=dyingMs or vulnerabilities or resolved-version deprecated) > ALIVE`; `lastPublish = max(time[version])` excluding `modified`/`created`; plus `verdictReason` producing epitaph text (including "upgrade available" for resolved-only deprecation). _Requirements: FR-4.1, FR-4.2, FR-4.3, FR-4.4, FR-4.5, FR-4.6, FR-4.7_
- [ ] 6.2 Property-based tests: exact `dyingMs` boundary → DYING, 1ms less → ALIVE; exact `deadMs` → DEAD, 1ms less → not DEAD by age; deprecated latest → DEAD regardless; resolved-only deprecation → DYING never DEAD; vulnerabilities > 0 → at least DYING; lookup error / unresolvable → UNKNOWN regardless; precedence order holds over generated inputs. _Requirements: FR-4.3, FR-4.4, FR-4.5, FR-4.6, NFR-2_

## 7. Core: summary

- [ ] 7.1 Implement `core/summary.ts`: counts and sentence "7 of 42 dependencies are dead, 12 are dying". _Requirements: FR-6.1_
- [ ] 7.2 Unit tests including 0-dead, all-dead, and mixed cases. _Requirements: FR-6.1, NFR-2_

## 8. I/O layer

- [ ] 8.1 Implement `io/pool.ts`: `runWithConcurrency` (limit from config, results delivered as they settle). _Requirements: FR-2.2_
- [ ] 8.2 Implement a fetch wrapper applying a per-request 10s `AbortController` timeout (used by both fetchers). _Requirements: FR-2.2_
- [ ] 8.3 Implement `io/registry.ts`: full-document GET, URL-encoded names, 404 → "not found on npm", extract `dist-tags`, `time`, per-version deprecations; compute `lastPublish`. _Requirements: FR-2.1, FR-2.4, FR-4.2_
- [ ] 8.4 Implement `io/osv.ts`: single POST `https://api.osv.dev/v1/query` with `{package: {name, ecosystem: 'npm'}, version}`; map `vulns[]` to `Vulnerability` (id, summary, url); 404 or empty `vulns` → no vulnerabilities; failures and timeouts → `{error}` handled by the accepted OSV policy (note in epitaph, verdict unchanged). _Requirements: FR-2.1, FR-2.2, FR-2.3_

## 9. Sample data and check script

- [ ] 9.1 Create `sample/example.package.json` per the design (react, moment, @types/node, request, left-pad, colors, lodash@4.17.15 exact, github: URL). _Requirements: FR-1.2_
- [ ] 9.2 Implement `scripts/check-sample.mjs` (Node, live fetches, reusing core logic): run the full pipeline on the sample and fail if any of ALIVE/DYING/DEAD/UNKNOWN is missing; wire as `npm run check-sample`. _Requirements: FR-1.2, NFR-2_
- [ ] 9.3 Run `npm run check-sample` against the live registry and adjust the sample until all four verdicts appear. _Requirements: FR-1.2_

## 10. UI: shell and theme

- [ ] 10.1 Build the full-viewport spooky scene: night sky gradient, moon, fog layers, fence/tree silhouettes as CSS/SVG; all animations gated behind `prefers-reduced-motion: no-preference`. _Requirements: NFR-3, FR-8.3_
- [ ] 10.2 Add the display serif + sans font setup and the verdict palette (accent only; shape + label always present). _Requirements: NFR-3, FR-8.2_

## 11. UI: input form

- [ ] 11.1 `PasteForm`: labeled monospace textarea, "Dig graves" primary button, "Try an example" secondary button (loads the bundled sample and runs analysis), inline error region (`role="alert"`), and the privacy notice line "package names are sent to npm and OSV; nothing is stored". _Requirements: FR-1.1, FR-1.2, FR-1.3, FR-7.1_
- [ ] 11.2 Wire parse errors and "no dependencies" errors to the inline region; no analysis runs on error. _Requirements: FR-1.3_

## 12. UI: orchestration and progress

- [ ] 12.1 In `App.tsx`, build one task per package (registry → resolve → OSV, sequential inside the task), run via the pool (6 concurrent), compute the verdict once per package, and render each grave only when its task completes. _Requirements: FR-2.1, FR-2.2, FR-2.3_
- [ ] 12.2 `Progress` live region (`aria-live="polite"`): "12 of 42 checked" counting completed tasks, with a progress bar. _Requirements: FR-2.5_
- [ ] 12.3 Pending slots render the "digging..." placeholder; after all tasks complete, sort graves DEAD → DYING → UNKNOWN → ALIVE, then alphabetically. _Requirements: FR-2.5, FR-5.1_

## 13. UI: graveyard, epitaph, summary

- [ ] 13.1 `Grave` tiles as buttons with inline SVG artwork: tombstone (DEAD), ghost (DYING), tree (ALIVE), fog-shrouded mound (UNKNOWN), each with the package name (truncated, title attribute) and a visible text verdict label. _Requirements: FR-5.1, FR-8.1, FR-8.2_
- [ ] 13.2 `Epitaph` modal: `role="dialog"` + `aria-modal`, focus moves in on open, Escape closes, focus returns to the triggering grave; content per FR-5.2 (name, installed range, resolved version, latest version, last publish date, vulnerability list with summaries and advisory links, deprecation message, "upgrade available" note, UNKNOWN reason, "vulnerability check unavailable" note when applicable). _Requirements: FR-5.2, FR-5.3, FR-4.3, FR-3.3, FR-2.4_
- [ ] 13.3 `Summary` line: dead and dying counts together, e.g. "7 of 42 dependencies are dead, 12 are dying". _Requirements: FR-6.1_

## 14. Accessibility

- [ ] 14.1 Keyboard navigability and visible `:focus-visible` styles on all interactive elements; skip-to-graveyard landmark. _Requirements: FR-8.1_
- [ ] 14.2 Verify verdicts are never conveyed by color alone (shape + label) and that reduced-motion mode disables fog/ghost/moon animations. _Requirements: FR-8.2, FR-8.3_

## 15. UI tests

- [ ] 15.1 Input validation rendering (invalid JSON, no dependencies) and example-button behavior (Vitest + Testing Library, network mocked). _Requirements: FR-1.3, NFR-2_
- [ ] 15.2 Epitaph opens on grave activation (click and keyboard) and closes on Escape. _Requirements: FR-5.2, FR-5.3, NFR-2_

## 16. Page metadata

- [ ] 16.1 Set the page title, favicon, and meta description (spooky-themed, English copy). _Requirements: NFR-1, NFR-3_

## 17. Final checks

- [ ] 17.1 All unit/property tests pass (`npm run test`); `npm run check-sample` passes against live services. _Requirements: NFR-2_
- [ ] 17.2 Confirm `.kiro/` is committed and not gitignored; commit remaining docs and code with English commit messages. _Requirements: NFR-4_
