// Live check that the bundled sample package.json yields all four
// verdicts (ALIVE, DYING, DEAD, UNKNOWN). Hits the real npm registry and
// OSV; run before a demo: `npm run check-sample`.
// NOT part of the unit test suite (network).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parsePackageJson } from '../src/core/parsePackageJson';
import { resolveRawSpecifier } from '../src/core/resolveVersion';
import { classifyVerdict, verdictReasons, type VerdictInputs } from '../src/core/verdict';
import { summarize } from '../src/core/summary';
import { fetchRegistry } from '../src/io/registry';
import { queryVulnerabilities } from '../src/io/osv';
import { runWithConcurrency } from '../src/io/pool';
import { CONFIG } from '../src/config';
import type { RegistryInfo, Verdict, Vulnerability } from '../src/types';

const here = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(here, '../sample/example.package.json');

const parsed = parsePackageJson(readFileSync(samplePath, 'utf-8'));
if (!parsed.ok) {
  console.error(`sample is invalid: ${parsed.error}`);
  process.exit(1);
}

const now = new Date();

interface Row {
  name: string;
  rawSpecifier: string;
  verdict: Verdict;
  reasons: string[];
  resolvedVersion: string | null;
  latestVersion: string | null;
  vulnerabilityCount: number;
  vulnNote: string | null;
  lastPublish: string | null;
}

const rows = await runWithConcurrency(parsed.inputs, CONFIG.concurrency, async (input): Promise<Row> => {
  let resolvedVersion: string | null = null;
  let unresolvableReason: VerdictInputs['unresolvableReason'] = null;
  let registry: RegistryInfo | null = null;
  let vulnerabilities: Vulnerability[] = [];
  let lookupError: string | null = null;
  let vulnNote: string | null = null;

  const registryResult = await fetchRegistry(input.name);
  if (registryResult.ok) {
    registry = registryResult.registry;
    const resolution = resolveRawSpecifier(input.rawSpecifier, registry);
    if (resolution.ok) {
      resolvedVersion = resolution.version;
      const osv = await queryVulnerabilities(input.name, resolvedVersion);
      if (osv.ok) {
        vulnerabilities = osv.vulnerabilities;
      } else {
        vulnNote = osv.error;
      }
    } else {
      unresolvableReason = resolution.reason;
    }
  } else {
    lookupError = registryResult.error;
  }

  const inputs: VerdictInputs = {
    lookupError,
    resolvedVersion,
    unresolvableReason,
    registry,
    vulnerabilityCount: vulnerabilities.length,
  };
  const verdict = classifyVerdict(inputs, now);

  const lastPublishMs =
    registry !== null
      ? Math.max(
          ...registry.versions
            .map((v) => Date.parse(registry!.time[v] ?? ''))
            .filter((t) => !Number.isNaN(t)),
        )
      : Number.NaN;

  return {
    name: input.name,
    rawSpecifier: input.rawSpecifier,
    verdict,
    reasons: verdictReasons(inputs, now, verdict),
    resolvedVersion,
    latestVersion: registry?.latestVersion ?? null,
    vulnerabilityCount: vulnerabilities.length,
    vulnNote,
    lastPublish: Number.isNaN(lastPublishMs) ? null : new Date(lastPublishMs).toISOString().slice(0, 10),
  };
});

for (const row of rows) {
  const parts = [
    `${row.verdict.padEnd(7)}`,
    `${row.name}@${row.rawSpecifier}`,
    row.resolvedVersion ? `resolved ${row.resolvedVersion}` : 'unresolved',
    row.latestVersion ? `latest ${row.latestVersion}` : '',
    row.lastPublish ? `last publish ${row.lastPublish}` : '',
    row.vulnerabilityCount > 0 ? `${row.vulnerabilityCount} vulns` : '',
    row.vulnNote ? `(${row.vulnNote})` : '',
  ].filter(Boolean);
  console.log(parts.join(' | '));
  for (const reason of row.reasons) console.log(`        - ${reason}`);
}

console.log('');
console.log(`Summary: ${summarize(rows.map((r) => r.verdict)).sentence}`);

const seen = new Set(rows.map((r) => r.verdict));
const required: Verdict[] = ['ALIVE', 'DYING', 'DEAD', 'UNKNOWN'];
const missing = required.filter((v) => !seen.has(v));
if (missing.length > 0) {
  console.error(`\nFAIL: sample is missing verdicts: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('\nOK: all four verdicts present (ALIVE, DYING, DEAD, UNKNOWN).');
