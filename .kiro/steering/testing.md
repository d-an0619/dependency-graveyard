---
inclusion: fileMatch
fileMatchPattern: ["**/*.test.ts", "**/*.test.tsx", "src/core/**"]
---

# Testing Standards

These rules come from real failures in this project: the strings `"v1"` and `"x"` were generated as dist-tag-looking specifiers, but the test oracle classified them as semver ranges, so the property test failed at random depending on the generated input.

## When a property-based test fails

- Do not loosen the test to make it pass. First read the counterexample and the reported seed.
- Decide which of the three is wrong, in order, before touching anything:
  1. the test oracle (what the test assumed the correct answer is),
  2. the implementation,
  3. the requirement.
- Fix the one that is actually wrong; quote the counterexample and seed in the commit or discussion.

## Generator (arbitrary) correctness

- The conditions a generator claims (e.g. "this string is a valid semver range", "this is a dist-tag") must be checked with the real library functions (`semver.validRange`, registry `dist-tags` maps, etc.), not with regex guesses. A string like `x` is not a dist-tag just because it looks like a bare identifier, and `v1` is not a dist-tag at all — `semver.validRange("v1")` accepts it as a range.
- If the oracle and the generator disagree about classification, fix the generator or the oracle so both use the same library-based predicate.

## New property tests

- Run any new property test 10 times in a row (e.g. `npx vitest run <file>` repeated, or 10 seeded runs) before considering it green. One passing run is not evidence.

## Scope

- `npm test` must never touch the network. Live-registry verification belongs to `npm run check-sample`.
- `now` is always injected into core functions; no test reads the real clock.
