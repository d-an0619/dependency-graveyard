import fc from 'fast-check';
import { compare } from 'semver';
import { describe, expect, it } from 'vitest';
import { YEAR_MS } from '../config';
import type { RegistryInfo, Verdict } from '../types';
import { classifyVerdict, computeLastPublish, verdictReasons, type VerdictInputs } from './verdict';

// ---------- helpers / arbitraries ----------

function registryWith(opts: {
  versions?: string[];
  latest?: string;
  deprecated?: Record<string, string | undefined>;
  lastPublish?: Date;
}): RegistryInfo {
  const versions = opts.versions ?? ['1.0.0'];
  const time = Object.fromEntries(
    versions.map((v) => [v, (opts.lastPublish ?? new Date(0)).toISOString()]),
  );
  return {
    name: 'pkg',
    latestVersion: opts.latest ?? versions[versions.length - 1],
    versions,
    distTags: { latest: opts.latest ?? versions[versions.length - 1] },
    time,
    deprecated: opts.deprecated ?? {},
  };
}

function inputsWith(opts: {
  lookupError?: string | null;
  resolved?: string | null;
  unresolvable?: string | null;
  registry?: RegistryInfo | null;
  vulns?: number;
}): VerdictInputs {
  return {
    lookupError: opts.lookupError ?? null,
    resolvedVersion: opts.resolved ?? null,
    unresolvableReason: (opts.unresolvable as VerdictInputs['unresolvableReason']) ?? null,
    registry: opts.registry ?? null,
    vulnerabilityCount: opts.vulns ?? 0,
  };
}

const nowArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') });
const ageMsArb = fc.integer({ min: 0, max: 5 * YEAR_MS });
const versionArb = fc
  .tuple(fc.integer({ min: 0, max: 10 }), fc.integer({ min: 0, max: 20 }), fc.integer({ min: 0, max: 30 }))
  .map(([a, b, c]) => `${a}.${b}.${c}`);

/** Two distinct versions, ordered [older, latest]. */
const versionPairArb = fc
  .tuple(versionArb, versionArb)
  .filter(([a, b]) => compare(a, b) !== 0)
  .map(([a, b]): [string, string] => (compare(a, b) < 0 ? [a, b] : [b, a]));

/** Fully generated verdict scenario. */
const scenarioArb = fc.record({
  now: nowArb,
  ageMs: ageMsArb,
  versionPair: versionPairArb,
  vulns: fc.nat(10),
  latestDeprecated: fc.boolean(),
  resolvedDeprecated: fc.boolean(),
  lookupFailed: fc.boolean(),
  unresolvable: fc.boolean(),
});

/** Build a full verdict scenario from generated values. */
function makeScenario(s: {
  now: Date;
  ageMs: number;
  versionPair: [older: string, latest: string];
  vulns: number;
  latestDeprecated: boolean;
  resolvedDeprecated: boolean;
  lookupFailed: boolean;
  unresolvable: boolean;
}): { input: VerdictInputs; now: Date } {
  const [older, latest] = s.versionPair;
  const lastPublish = new Date(s.now.getTime() - s.ageMs);
  const registry = registryWith({
    versions: [older, latest],
    latest,
    deprecated: {
      ...(s.latestDeprecated ? { [latest]: 'no longer maintained' } : {}),
      ...(s.resolvedDeprecated && !s.latestDeprecated ? { [older]: 'please upgrade' } : {}),
    },
    lastPublish,
  });
  const input = inputsWith({
    lookupError: s.lookupFailed ? 'lookup timed out' : null,
    resolved: s.unresolvable ? null : older,
    unresolvable: s.unresolvable ? 'git url' : null,
    registry: s.lookupFailed ? null : registry,
    vulns: s.vulns,
  });
  return { input, now: s.now };
}

// ---------- boundary properties ----------

describe('classifyVerdict (boundaries)', () => {
  it('age of exactly 3 fixed years is DEAD', () => {
    fc.assert(
      fc.property(nowArb, versionArb, (now, version) => {
        const lastPublish = new Date(now.getTime() - 3 * YEAR_MS);
        const registry = registryWith({ versions: [version], lastPublish });
        const v = classifyVerdict(inputsWith({ resolved: version, registry }), now);
        expect(v).toBe('DEAD');
      }),
    );
  });

  it('age of 3 fixed years minus 1ms is not DEAD by age (it is DYING)', () => {
    fc.assert(
      fc.property(nowArb, versionArb, (now, version) => {
        const lastPublish = new Date(now.getTime() - 3 * YEAR_MS + 1);
        const registry = registryWith({ versions: [version], lastPublish });
        const v = classifyVerdict(inputsWith({ resolved: version, registry }), now);
        expect(v).toBe('DYING');
      }),
    );
  });

  it('age of exactly 1 fixed year is DYING', () => {
    fc.assert(
      fc.property(nowArb, versionArb, (now, version) => {
        const lastPublish = new Date(now.getTime() - YEAR_MS);
        const registry = registryWith({ versions: [version], lastPublish });
        const v = classifyVerdict(inputsWith({ resolved: version, registry }), now);
        expect(v).toBe('DYING');
      }),
    );
  });

  it('age of 1 fixed year minus 1ms is ALIVE', () => {
    fc.assert(
      fc.property(nowArb, versionArb, (now, version) => {
        const lastPublish = new Date(now.getTime() - YEAR_MS + 1);
        const registry = registryWith({ versions: [version], lastPublish });
        const v = classifyVerdict(inputsWith({ resolved: version, registry }), now);
        expect(v).toBe('ALIVE');
      }),
    );
  });
});

// ---------- rule properties ----------

describe('classifyVerdict (rules)', () => {
  it('a deprecated latest version is DEAD regardless of age or vulnerabilities', () => {
    fc.assert(
      fc.property(scenarioArb, (s) => {
        const forced = {
          ...s,
          latestDeprecated: true,
          resolvedDeprecated: false,
          lookupFailed: false,
          unresolvable: false,
        };
        const { input, now } = makeScenario(forced);
        expect(classifyVerdict(input, now)).toBe('DEAD');
      }),
    );
  });

  it('resolved-only deprecation is DYING, never DEAD', () => {
    fc.assert(
      fc.property(scenarioArb, (s) => {
        const forced = {
          ...s,
          latestDeprecated: false,
          resolvedDeprecated: true,
          vulns: 0,
          ageMs: Math.min(s.ageMs, YEAR_MS - 1), // recent publish
          lookupFailed: false,
          unresolvable: false,
        };
        const { input, now } = makeScenario(forced);
        const v = classifyVerdict(input, now);
        expect(v).toBe('DYING');
      }),
    );
  });

  it('any vulnerability count > 0 makes the verdict at least DYING', () => {
    fc.assert(
      fc.property(scenarioArb, (s) => {
        const forced = {
          ...s,
          vulns: s.vulns === 0 ? 1 : s.vulns,
          latestDeprecated: false,
          resolvedDeprecated: false,
          ageMs: Math.min(s.ageMs, YEAR_MS - 1), // recent publish
          lookupFailed: false,
          unresolvable: false,
        };
        const { input, now } = makeScenario(forced);
        const v = classifyVerdict(input, now);
        expect(v === 'DYING' || v === 'DEAD').toBe(true);
      }),
    );
  });

  it('lookup failures and unresolvable specifiers are UNKNOWN regardless of everything else', () => {
    fc.assert(
      fc.property(scenarioArb, fc.constantFrom('lookup', 'unresolvable'), (s, mode) => {
        const forced = {
          ...s,
          lookupFailed: mode === 'lookup',
          unresolvable: mode === 'unresolvable',
        };
        const { input, now } = makeScenario(forced);
        expect(classifyVerdict(input, now)).toBe('UNKNOWN');
      }),
    );
  });
});

// ---------- precedence oracle over generated inputs ----------

describe('classifyVerdict (precedence)', () => {
  it('the one-line precedence order holds over arbitrary inputs', () => {
    fc.assert(
      fc.property(scenarioArb, (s) => {
        const { input, now } = makeScenario(s);
        const verdict = classifyVerdict(input, now);

        const unresolvable =
          input.lookupError !== null ||
          input.unresolvableReason !== null ||
          input.registry === null ||
          input.resolvedVersion === null;
        const lastPublish = input.registry ? computeLastPublish(input.registry) : null;
        const age = lastPublish ? now.getTime() - lastPublish.getTime() : null;
        const latestDeprecated =
          input.registry !== null &&
          input.registry.deprecated[input.registry.latestVersion] !== undefined;
        const resolvedDeprecated =
          input.registry !== null &&
          input.resolvedVersion !== null &&
          input.registry.deprecated[input.resolvedVersion] !== undefined;

        // Independent oracle restating FR-4.6.
        let expected: Verdict;
        if (unresolvable || lastPublish === null) {
          expected = 'UNKNOWN';
        } else if (latestDeprecated || age! >= 3 * YEAR_MS) {
          expected = 'DEAD';
        } else if (age! >= YEAR_MS || input.vulnerabilityCount > 0 || resolvedDeprecated) {
          expected = 'DYING';
        } else {
          expected = 'ALIVE';
        }
        expect(verdict).toBe(expected);

        // Implications for each verdict level.
        if (verdict === 'ALIVE') {
          expect(age!).toBeLessThan(YEAR_MS);
          expect(input.vulnerabilityCount).toBe(0);
          expect(latestDeprecated || resolvedDeprecated).toBe(false);
        }
        if (verdict === 'UNKNOWN') {
          expect(unresolvable || lastPublish === null).toBe(true);
        }
        if (verdict === 'DEAD') {
          expect(latestDeprecated || age! >= 3 * YEAR_MS).toBe(true);
        }
      }),
    );
  });
});

describe('computeLastPublish', () => {
  it('uses the most recent version publish, ignoring modified/created keys', () => {
    const registry = registryWith({ versions: ['1.0.0', '2.0.0'] });
    registry.time['modified'] = new Date('2030-01-01').toISOString();
    registry.time['created'] = new Date('2000-01-01').toISOString();
    registry.time['1.0.0'] = new Date('2024-01-01').toISOString();
    registry.time['2.0.0'] = new Date('2025-06-01').toISOString();
    expect(computeLastPublish(registry)?.toISOString()).toBe(new Date('2025-06-01').toISOString());
  });
});

describe('verdictReasons', () => {
  it('mentions "upgrade available" for resolved-only deprecation', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const registry = registryWith({
      versions: ['1.0.0', '2.0.0'],
      deprecated: { '1.0.0': 'please upgrade' },
      lastPublish: new Date('2025-12-01T00:00:00.000Z'), // recent
    });
    const input = inputsWith({ resolved: '1.0.0', registry });
    const v = classifyVerdict(input, now);
    expect(v).toBe('DYING');
    expect(verdictReasons(input, now, v)).toContain('resolved version is deprecated; upgrade available');
  });

  it('returns all applicable reasons for a DYING verdict', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const registry = registryWith({
      versions: ['1.0.0', '2.0.0'],
      deprecated: { '1.0.0': 'please upgrade' },
      lastPublish: new Date(now.getTime() - 1.5 * YEAR_MS), // stale
    });
    const input = inputsWith({ resolved: '1.0.0', registry, vulns: 3 });
    const v = classifyVerdict(input, now);
    expect(v).toBe('DYING');
    const reasons = verdictReasons(input, now, v);
    expect(reasons).toHaveLength(3);
    expect(reasons.some((r) => r.includes('no publish'))).toBe(true);
    expect(reasons.some((r) => r.includes('3 known vulnerabilities'))).toBe(true);
    // "upgrade available" never drops off when other reasons apply.
    expect(reasons).toContain('resolved version is deprecated; upgrade available');
  });

  it('reports the lookup error verbatim for UNKNOWN', () => {
    const input = inputsWith({ lookupError: 'not found on npm' });
    expect(verdictReasons(input, new Date(), 'UNKNOWN')).toEqual(['not found on npm']);
  });

  it('maps unresolvable reasons to readable text', () => {
    const input = inputsWith({ unresolvable: 'git url' });
    expect(verdictReasons(input, new Date(), 'UNKNOWN')[0]).toContain('git URL');
  });
});
