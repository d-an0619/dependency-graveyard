# Dependency Graveyard — Requirements

## Overview

Dependency Graveyard is a static single-page web app (TypeScript + React + Vite, no backend) for the Kiroween 2026 hackathon (Costume Contest category). A developer pastes the contents of a `package.json` and sees which npm dependencies are dead, dying, or alive, rendered as a haunted graveyard.

## In Scope

- Client-side only app; all network lookups happen from the browser.
- `dependencies` and `devDependencies` of the pasted `package.json`.
- npm ecosystem only.

## Out of Scope

- Login / user accounts.
- Database or any persistence beyond the browser session.
- Transitive dependencies.
- Ecosystems other than npm.
- Offline mode.

## Functional Requirements

### FR-1: Input

- FR-1.1: A textarea accepts raw `package.json` contents.
- FR-1.2: A "Try an example" button loads a bundled sample `package.json` into the textarea and runs the analysis.
- FR-1.3: Invalid JSON, or JSON with neither `dependencies` nor `devDependencies` (or both empty), shows a clear inline error; no analysis runs.

### FR-2: Dependency lookup

- FR-2.1: For every entry in `dependencies` and `devDependencies`, the app fetches from the browser:
  - npm registry (`https://registry.npmjs.org/<name>`): latest version, time of last publish, and whether the package (or the resolved version) is deprecated.
  - OSV vulnerability database (`POST https://api.osv.dev/v1/querybatch`): known vulnerabilities for the resolved version.
- FR-2.2: All lookups run with limited concurrency (configurable, default 4–8 concurrent requests).
- FR-2.3: If a single package lookup fails (network error, HTTP error, timeout), that package is marked `UNKNOWN`; the remaining packages are unaffected.

### FR-3: Verdict classification

- FR-3.1: A pure function classifies each package as `ALIVE`, `DYING`, `DEAD`, or `UNKNOWN`.
  - `DEAD`: deprecated, or no publish in 3 or more years.
  - `DYING`: last publish between 1 and 3 years ago, or the package has known vulnerabilities.
  - `ALIVE`: otherwise.
  - `UNKNOWN`: lookup failed, or the version specifier cannot be resolved (git/file URLs, unsupported tags).
- FR-3.2: Deprecation takes precedence over age; a deprecated package is never `ALIVE` or `DYING`.
- FR-3.3: All thresholds (dead years, dying years) live in a single config object.

### FR-4: Graveyard view

- FR-4.1: The graveyard shows one grave per dependency: `DEAD` = tombstone, `DYING` = ghost, `ALIVE` = tree, `UNKNOWN` = a distinct marker (e.g. fog-shrouded grave).
- FR-4.2: Clicking (or activating via keyboard) a grave opens an epitaph detail view showing: package name, installed version range, latest version, last publish date, vulnerability count with links to OSV entries, and the deprecation message if any.
- FR-4.3: The epitaph is reachable by keyboard and dismissible with Escape.

### FR-5: Summary

- FR-5.1: A summary line renders in the form "7 of 42 dependencies are dead", counting `DEAD` verdicts over all analyzed dependencies.

### FR-6: Accessibility

- FR-6.1: All interactive elements are keyboard navigable with visible focus.
- FR-6.2: Verdicts are never conveyed by color alone; each verdict has a distinct shape/icon and a text label.
- FR-6.3: The app respects `prefers-reduced-motion` (spooky animations are disabled or reduced).

## Non-Functional Requirements

### NFR-1: Tech stack

- TypeScript + React + Vite. No backend. Ships as static files.

### NFR-2: Testing

- Property-based tests (fast-check) for the verdict function.
- Property-based tests for semver range resolution: `^`, `~`, exact versions, range expressions, dist-tags such as `latest`, and git/file URLs classified as unresolvable (`UNKNOWN`).
- Unit/behavior coverage for input validation and the summary line.

### NFR-3: Visual quality

- Spooky, polished, hackathon-grade presentation fitting the Costume Contest category.

### NFR-4: Repository

- The `.kiro` directory (specs, hooks, steering) stays committed; it must never be gitignored.
