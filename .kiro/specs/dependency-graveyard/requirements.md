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
- FR-1.2: A "Try an example" button loads a bundled sample `package.json` into the textarea and runs the analysis. The bundled sample is constructed so that the results include all four verdicts: `ALIVE`, `DYING`, `DEAD`, and `UNKNOWN`.
- FR-1.3: Invalid JSON, or JSON with neither `dependencies` nor `devDependencies` (or both empty), shows a clear inline error; no analysis runs.

### FR-2: Dependency lookup

- FR-2.1: For every entry in `dependencies` and `devDependencies` (including scoped packages such as `@scope/name`), the app fetches from the browser:
  - npm registry (`https://registry.npmjs.org/<name>`): `dist-tags.latest`, the `time` object, per-version deprecation flags, and the list of published versions.
  - OSV vulnerability database (single-package `POST https://api.osv.dev/v1/query`): known vulnerabilities for the resolved version; each finding's `summary` is shown in the epitaph, linked to the advisory.
- FR-2.2: All lookups run with limited concurrency, fixed at a default of 6 concurrent requests. Each request has a 10-second timeout.
- FR-2.3: If a single package lookup fails (network error, HTTP error, timeout), that package is marked `UNKNOWN` and the remaining packages are unaffected.
- FR-2.4: A package not found on the npm registry (HTTP 404, including private packages) is `UNKNOWN` with the reason "not found on npm".
- FR-2.5: While lookups are in flight, a progress indicator shows the count of completed lookups ("12 of 42 checked"). Results appear incrementally: each package's grave is rendered as soon as its lookup finishes.

### FR-3: Version resolution

- FR-3.1: If the version specifier is a semver range (e.g. `^1.2.3`, `~2.0.0`, `1.2.3`, `>=1 <3`), the resolved version is the highest published version in the registry's `versions` list that satisfies the range.
- FR-3.2: If the specifier is a dist-tag (e.g. `latest`, `next`), the resolved version is the version that tag points to.
- FR-3.3: Git URLs, tarball URLs (`https://.../x.tgz`), file URLs, `link:`/`workspace:` protocols, `npm:` aliases, and ranges that no published version satisfies are unresolvable; the package is `UNKNOWN` and the epitaph states the reason.

### FR-4: Verdict classification

- FR-4.1: A pure function classifies each package as `ALIVE`, `DYING`, `DEAD`, or `UNKNOWN`. The function receives the current time as an argument; it must not read the clock itself (no `Date.now()` inside the function).
- FR-4.2: "Last publish" is defined as the publish time of the most recently published version, taken from the registry `time` object. `time.modified` and `time.created` are not used.
- FR-4.3: Deprecation rules:
  - If the latest version (`dist-tags.latest`) is deprecated, the package is `DEAD`.
  - If only the resolved version is deprecated (and the latest is not), the package is `DYING`, and the epitaph shows an "upgrade available" note.
- FR-4.4: Age boundaries: a last publish of exactly 1 year ago or more is `DYING`; exactly 3 years ago or more is `DEAD`.
- FR-4.5: `DYING` also applies when the package has known vulnerabilities or when only the resolved version is deprecated (see FR-4.3).
- FR-4.6: Verdict precedence, in one line: `UNKNOWN > deprecated(latest) > age>=3y > (age>=1y or vulnerabilities or resolved-version deprecated) > ALIVE`.
- FR-4.7: All thresholds (dead years, dying years) live in a single config object.

### FR-5: Graveyard view

- FR-5.1: The graveyard shows one grave per dependency: `DEAD` = tombstone, `DYING` = ghost, `ALIVE` = tree, `UNKNOWN` = a distinct marker (e.g. fog-shrouded grave).
- FR-5.2: Clicking (or activating via keyboard) a grave opens an epitaph detail view showing: package name, installed version range, resolved version, latest version, last publish date, vulnerability count with links to OSV entries (showing each finding's `summary`), the deprecation message if any, an "upgrade available" note when only the resolved version is deprecated (FR-4.3), and the reason when the verdict is `UNKNOWN` (FR-3.3, FR-2.4).
- FR-5.3: The epitaph is reachable by keyboard and dismissible with Escape.

### FR-6: Summary

- FR-6.1: A summary shows the dead count and the dying count together, in the form "7 of 42 dependencies are dead, 12 are dying".

### FR-7: Privacy notice

- FR-7.1: The screen shows a one-line notice: "package names are sent to npm and OSV; nothing is stored".

### FR-8: Accessibility

- FR-8.1: All interactive elements are keyboard navigable with visible focus.
- FR-8.2: Verdicts are never conveyed by color alone; each verdict has a distinct shape/icon and a text label.
- FR-8.3: The app respects `prefers-reduced-motion` (spooky animations are disabled or reduced).

## Non-Functional Requirements

### NFR-1: Tech stack

- TypeScript + React + Vite. No backend. Ships as static files.

### NFR-2: Testing

- Property-based tests (fast-check) for the verdict function, including the exact 1-year and 3-year boundaries.
- Property-based tests for semver range resolution: `^`, `~`, exact versions, range expressions, dist-tags such as `latest`, and git/file URLs classified as unresolvable (`UNKNOWN`).
- Unit/behavior coverage for input validation and the summary line.

### NFR-3: Visual quality

- Spooky, polished, hackathon-grade presentation fitting the Costume Contest category.

### NFR-4: Repository

- The `.kiro` directory (specs, hooks, steering) stays committed; it must never be gitignored.
