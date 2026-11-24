// Live check that the bundled sample package.json yields all four
// verdicts (ALIVE, DYING, DEAD, UNKNOWN). Hits the real npm registry and
// OSV; run before a demo: `npm run check-sample`.
// NOT part of the unit test suite (network).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parsePackageJson } from '../src/core/parsePackageJson';
import { computeLastPublish } from '../src/core/verdict';
import { summarize } from '../src/core/summary';
import { analyzePackage } from '../src/analyze';
import { runWithConcurrency } from '../src/io/pool';
import { CONFIG } from '../src/config';
import type { PackageReport, Verdict } from '../src/types';

const here = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(here, '../sample/example.package.json');

const parsed = parsePackageJson(readFileSync(samplePath, 'utf-8'));
if (!parsed.ok) {
  console.error(`sample is invalid: ${parsed.error}`);
  process.exit(1);
}

const now = new Date();

const reports = await runWithConcurrency(parsed.inputs, CONFIG.concurrency, (input) =>
  analyzePackage(input, { now }),
);

for (const report of reports) {
  const { input, registry, resolvedVersion } = report;
  const parts = [
    report.verdict.padEnd(7),
    `${input.name}@${input.rawSpecifier}`,
    resolvedVersion ? `resolved ${resolvedVersion}` : 'unresolved',
  ];
  // Unresolvable specifiers never fetched the registry: no latest or
  // last-publish data to show.
  if (registry !== null) {
    parts.push(`latest ${registry.latestVersion}`);
    const lastPublish = computeLastPublish(registry);
    if (lastPublish !== null) parts.push(`last publish ${lastPublish.toISOString().slice(0, 10)}`);
  }
  if (report.vulnerabilities.length > 0) parts.push(`${report.vulnerabilities.length} vulns`);
  if (report.vulnCheckUnavailable) parts.push('(vulnerability check unavailable)');
  console.log(parts.join(' | '));
  for (const reason of report.verdictReasons) console.log(`        - ${reason}`);
}

console.log('');
console.log(`Summary: ${summarize(reports.map((r) => r.verdict)).sentence}`);

const seen = new Set<Verdict>(reports.map((r) => r.verdict));
const required: Verdict[] = ['ALIVE', 'DYING', 'DEAD', 'UNKNOWN'];
const missing = required.filter((v) => !seen.has(v));
if (missing.length > 0) {
  console.error(`\nFAIL: sample is missing verdicts: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('\nOK: all four verdicts present (ALIVE, DYING, DEAD, UNKNOWN).');
