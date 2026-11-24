---
inclusion: always
---

# Technology Stack

## Stack

- TypeScript + React 18 + Vite 5. Static output; no backend, no server runtime.
- `semver` is the only runtime dependency beyond React.
- Testing: Vitest + fast-check (property-based), @testing-library/react with jsdom for light UI behavior tests.
- Scripts (from `package.json`):
  - `npm test` — `vitest run` (unit + property tests, no network).
  - `npm run build` — `tsc && vite build`.
  - `npm run check-sample` — `tsx scripts/check-sample.ts`; runs the core pipeline against the live registry and OSV and fails if any of the four verdicts is missing from the sample results. Hits the network; run before demos, not part of `npm test`.
  - `npm run dev` — Vite dev server.

## Deployment

GitHub Pages via `.github/workflows/deploy.yml` on push to `main`: `npm test` first (failing tests block the deploy), then `npm ci && npm run build`, then the official actions/deploy-pages flow. Vite `base` is `/dependency-graveyard/`.

## Dependency policy

- Add a new dependency only when genuinely needed; prefer the standard library and existing deps first.
- Runtime deps must stay minimal (React, react-dom, semver). Anything else needs a justification tied to a requirement.
- Before stating a package's status (deprecated or not, last publish date, known vulnerabilities) in any document, spec, sample, or comment, verify it with live data: use the fetch MCP server against `https://registry.npmjs.org/<name>` (dist-tags, `time`, per-version `deprecated`) and `https://api.osv.dev/v1/query` for vulnerabilities. This rule exists because a wrong assumption ("moment has not been published in years") once made it into the design.
- The `.kiro` directory (specs, hooks, steering, settings) stays committed; it must never be gitignored.
