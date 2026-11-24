---
inclusion: always
---

# Product Overview — Dependency Graveyard

Source of truth: `.kiro/specs/dependency-graveyard/requirements.md`.

## What this is

Dependency Graveyard is a static, client-only single-page web app (no backend) built for the Kiroween 2026 hackathon, Costume Contest category. A developer pastes the raw contents of a `package.json`, and the app fetches live data from the public npm registry and the OSV vulnerability database, then renders each dependency as a grave in a haunted graveyard.

## Who it is for

- Hackathon judges and visitors: the presentation is spooky, polished, and self-explanatory.
- Developers who want a quick, zero-install health check of a `package.json`: paste, see which dependencies are dead or dying, click a grave for the epitaph details.

All network lookups run from the browser. Nothing is stored; only package names are sent to npm and OSV (FR-7.1).

## The four verdicts

- `ALIVE`: actively maintained; no deprecation, recent publish, no known vulnerabilities.
- `DYING`: last publish at least 1 fixed year ago, OR known vulnerabilities for the resolved version, OR only the resolved version is deprecated ("upgrade available").
- `DEAD`: the latest version (`dist-tags.latest`) is deprecated, OR the last publish was at least 3 fixed years ago.
- `UNKNOWN`: the specifier cannot be resolved (git/file/tarball URLs, `link:`/`workspace:`/`npm:` protocols, unsatisfiable range, unknown dist-tag) or the registry lookup failed (including not-found). Looked-up network failures never affect other packages.

Precedence, one line (FR-4.6): `UNKNOWN > deprecated(latest) > age>=3y > (age>=1y or vulnerabilities or resolved-version deprecated) > ALIVE`. "Last publish" is the newest version publish time from the registry `time` object; `modified`/`created` are not used.

## Out of scope

Do not build: login/accounts, any persistence beyond the browser session, transitive dependency resolution, non-npm ecosystems, offline mode, a backend server. The npm ecosystem only, `dependencies` + `devDependencies` only.
