# Dependency Graveyard — How I used Kiro (DRAFT)

> Draft. Every claim below maps to a commit, a file in `.kiro/`, or something observed in a session.
> Lines marked `[CHECK]` need the author to confirm before submitting.

## What it is

Paste a `package.json`, get a graveyard. Each dependency is looked up on the npm registry and OSV and
becomes a tombstone (DEAD), a ghost (DYING), a tree (ALIVE) or a fog-shrouded mound (UNKNOWN).
Client-only React + Vite app, deployed to GitHub Pages. Category: Costume Contest.

## Spec-driven development

The whole app is built from `.kiro/specs/dependency-graveyard/` (requirements → design → tasks).
None of the three documents was accepted as first drafted; the git history keeps every revision:

- `149b9ab` initial requirements (Kiro draft)
- `a289153` requirements refined: version resolution, deprecation rules, verdict precedence, progress, privacy notice
- `1babe33` design: OSV switched to one query per package, sample data fixed, deployment plan added
- `1581e41` → `b806e7f` tasks: per-fetch timeouts, deploy moved early, every task linked to requirement IDs, tests before deploy

The spec stayed alive during implementation. When I found that unresolvable specifiers
(e.g. `ghost-town@github:some/missing-repo`) were still being looked up on npm — and showing data
from an unrelated package that happens to share the name — Kiro fixed it in the spec first
(FR-2.1: classify first, make no request; FR-5.2: hide registry fields when there is no registry data),
rewrote the design's orchestration section, updated task 12.1, then implemented `analyzePackage` (`b1068f4`).

Progress at time of writing: 23 of 40 tasks done (scaffold, deploy, core, I/O, sample). The UI tasks remain. `[CHECK: update before submit]`

## Property-based testing

Core logic (`src/core/`: specifier classification, version resolution, verdict precedence, summary) is
covered by fast-check properties — verdict age boundaries at exactly `dyingMs`/`deadMs` and 1 ms below,
precedence order over generated inputs, unresolvable → UNKNOWN regardless of other data.

A real counterexample the properties produced:

- A generator meant to produce dist-tag names emitted `"x"` and `"v1"`. Both are valid semver *ranges*,
  not tags, so the test oracle was wrong, not the implementation. Reproduced with seed `-296014871`,
  fixed by filtering the generator with `semver.validRange(tag) === null`, then run repeatedly to confirm no flakiness.

That failure became a rule: `.kiro/steering/testing.md` says never loosen a failing property;
read the counterexample and seed, then decide whether the oracle, the implementation or the requirement is wrong.

## Steering

Six documents in `.kiro/steering/`:

| File | Inclusion | Purpose |
|---|---|---|
| `product.md` | always | what the app is, the four verdicts, what is out of scope |
| `tech.md` | always | stack, commands, deploy, "add a dependency only when needed", verify package facts via the fetch MCP before writing them down |
| `structure.md` | always | `core` / `io` / `ui` layers; `core` may not use fetch, clock or DOM |
| `testing.md` | fileMatch (tests, `src/core/**`) | the PBT rules above |
| `visual-design.md` | fileMatch (`src/ui/**`) | visual direction for the UI |
| `language.md` | always | conversation language |

Observed effect: a fresh session followed `language.md` without being told, and the agent ran the test
suite 10 times in a row on its own to check for flakiness before reporting.

## Agent hooks

Four hooks in `.kiro/hooks/`:

- `spec-drift-check` (PostFileSave on `requirements.md`, agent action): when FR-2.1/FR-5.2 changed, it
  reported 4 places in `design.md` and `tasks.md` that no longer agreed. Report only, never edits.
- `tests-on-save` (PostFileSave on `src/**/*.ts(x)`, command): `npx vitest run`.
- `typecheck-on-stop` (Stop, command): `npx tsc --noEmit`.
- `flaky-check` (Manual, command): runs the suite 10 times and prints the failure count.

What I learned: command hooks run silently. The agent itself reported "the hook did not fire", and I
saw no output in the terminal. Rather than guess, I made each command append a timestamp
(`date >> .kiro/hooks/.fired.log`) (`0277edb`). The logs showed `tests-on-save` firing on both saves
(22:44:43, 22:45:17) and `typecheck-on-stop` at the end of both turns (22:44:26, 22:45:28).
The hooks had worked all along; successful command hooks just don't report back.

## MCP

`.kiro/settings/mcp.json` adds a fetch MCP server, scoped to this project. Its first real use: while
investigating the "hook didn't fire" question, Kiro fetched the official hooks documentation
(kiro.dev/docs/hooks) and cited it instead of guessing. `tech.md` requires the same for package facts
(deprecation, last publish, vulnerabilities) before they go into docs or sample data.

## Custom agent and subagents

- `.kiro/agents/a11y-reviewer.json`: read-only accessibility reviewer for `src/ui` (fs_write denied),
  checking keyboard access, focus, color-only verdicts, reduced motion and dialog focus against FR-8.x / FR-5.3.
  Registered (`kiro-cli agent list`) but not yet run, since the UI doesn't exist yet. `[CHECK: update after UI]`
- When asked how hooks, MCP and agents are configured, Kiro CLI spawned its `introspect` subagent on
  its own to read its documentation rather than answer from memory.

## Things that went wrong (and how they were fixed)

- GitHub Pages deploy failed intermittently ("No artifacts named github-pages were found", then on rerun
  "Multiple artifacts…"). Upgrading actions (`53d7de9`) did not fix it. Splitting into separate `build`
  and `deploy` jobs did (`7a224b3`); later runs succeeded on first attempt.

## Honest note on process

All application code and `.kiro/` configuration was written by Kiro (CLI). I used a separate AI
assistant as a reviewer: it read diffs, ran tests and `check-sample`, and caught issues such as the
`ghost-town` lookup and the deploy root cause. Those catches are not claimed as Kiro's above.
