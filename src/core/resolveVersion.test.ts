import fc from 'fast-check';
import { compare, parse, validRange } from 'semver';
import { describe, expect, it } from 'vitest';
import type { RegistryInfo } from '../types';
import { classifySpecifier, resolveRawSpecifier, resolveSpecifier } from './resolveVersion';

// ---------- arbitraries ----------

const versionArb = fc
  .tuple(fc.integer({ min: 0, max: 20 }), fc.integer({ min: 0, max: 30 }), fc.integer({ min: 0, max: 40 }))
  .map(([a, b, c]) => `${a}.${b}.${c}`);

const distinctVersionsArb = fc
  .uniqueArray(versionArb, { minLength: 1, maxLength: 15 })
  .map((vs) => [...vs].sort(compare));

function registryOf(versions: string[], tags: Record<string, string> = {}): RegistryInfo {
  const latest = versions[versions.length - 1];
  return {
    name: 'pkg',
    latestVersion: latest ?? '1.0.0',
    versions,
    distTags: { latest, ...tags },
    time: Object.fromEntries(versions.map((v) => [v, '2026-01-01T00:00:00.000Z'])),
    deprecated: {},
  };
}

// ---------- classifier ----------

describe('classifySpecifier', () => {
  it('classifies unresolvable specifiers with their reasons', () => {
    const cases: [string, string][] = [
      ['git+https://github.com/user/repo.git', 'git url'],
      ['git://github.com/user/repo.git', 'git url'],
      ['github:user/repo', 'git url'],
      ['https://github.com/user/repo.git', 'git url'],
      ['user/repo', 'git url'],
      ['user/repo#v2.1.0', 'git url'],
      ['gitlab:user/repo', 'git url'],
      ['bitbucket:user/repo', 'git url'],
      ['gist:1234567', 'git url'],
      ['git@github.com:user/repo.git', 'git url'],
      ['https://example.com/pkg-1.2.3.tgz', 'tarball url'],
      ['https://example.com/pkg-1.2.3.tar.gz', 'tarball url'],
      ['https://example.com/pkg-1.2.3.tgz?cache=bust', 'tarball url'],
      ['https://example.com/anything', 'tarball url'],
      ['file:../local/pkg', 'file url'],
      ['./local/pkg', 'file url'],
      ['link:../local/pkg', 'link protocol'],
      ['workspace:^1.2.3', 'workspace protocol'],
      ['npm:other-package@^2.0.0', 'npm alias'],
    ];
    for (const [raw, reason] of cases) {
      const spec = classifySpecifier(raw);
      expect(spec).toEqual({ kind: 'unresolvable', reason });
    }
  });

  it('treats an empty string as the "*" range, like npm', () => {
    expect(classifySpecifier('')).toEqual({ kind: 'range', range: '*' });
    const reg = registryOf(['1.0.0', '2.0.0']);
    expect(resolveRawSpecifier('', reg)).toEqual({ ok: true, version: '2.0.0' });
  });

  it('classifies plain semver forms as ranges', () => {
    for (const raw of ['1.2.3', '^1.2.3', '~2.0.0', '>=1.0.0 <3.0.0', '1.x', '*', 'v1', 'x']) {
      expect(classifySpecifier(raw).kind).toBe('range');
    }
  });

  it('classifies bare identifiers that are not semver ranges as dist-tags', () => {
    for (const raw of ['latest', 'next', 'beta-1-2', 'canary']) {
      expect(classifySpecifier(raw).kind).toBe('dist-tag');
    }
  });

  it('never throws on arbitrary strings, and range kinds are valid ranges', () => {
    fc.assert(
      fc.property(fc.fullUnicodeString(), (raw) => {
        let spec: ReturnType<typeof classifySpecifier> | undefined;
        expect(() => {
          spec = classifySpecifier(raw);
        }).not.toThrow();
        if (spec !== undefined && spec.kind === 'range') {
          expect(validRange(spec.range)).not.toBeNull();
        }
      }),
    );
  });
});

// ---------- resolution: property-based ----------

describe('resolveSpecifier (property-based)', () => {
  it('an exact specifier resolves to that exact version', () => {
    fc.assert(
      fc.property(distinctVersionsArb, (versions) => {
        const v = versions[0];
        const r = resolveRawSpecifier(v, registryOf(versions));
        expect(r).toEqual({ ok: true, version: v });
      }),
    );
  });

  it('a caret range resolves per semver caret semantics (^1.2.3: same major; ^0.2.3: same minor; ^0.0.3: exact)', () => {
    fc.assert(
      fc.property(distinctVersionsArb, fc.nat(), (versions, nat) => {
        const v = versions[nat % versions.length];
        const p = parse(v)!;
        const expected = versions
          .filter((w) => {
            const q = parse(w)!;
            if (compare(w, v) < 0) return false;
            if (p.major > 0) return q.major === p.major;
            if (p.minor > 0) return q.major === 0 && q.minor === p.minor;
            return w === v; // ^0.0.x means exactly 0.0.x
          })
          .sort(compare)
          .pop();
        const r = resolveRawSpecifier(`^${v}`, registryOf(versions));
        if (expected === undefined) {
          expect(r).toEqual({ ok: false, reason: 'no satisfying version' });
        } else {
          expect(r).toEqual({ ok: true, version: expected });
        }
      }),
    );
  });

  it('a range resolves to the highest satisfying published version', () => {
    fc.assert(
      fc.property(distinctVersionsArb, fc.nat(), (versions, nat) => {
        const lo = versions[nat % versions.length];
        const expected = versions
          .filter((w) => compare(w, lo) >= 0)
          .sort(compare)
          .pop();
        const r = resolveRawSpecifier(`>=${lo}`, registryOf(versions));
        if (expected === undefined) {
          expect(r).toEqual({ ok: false, reason: 'no satisfying version' });
        } else {
          expect(r).toEqual({ ok: true, version: expected });
        }
      }),
    );
  });

  it('a dist-tag resolves to the tagged version; unknown tags fail', () => {
    // Tag names are letters/hyphens AND not parseable as a semver range
    // (decided with semver's validRange, not a regex guess: "v1", "x" etc.
    // are ranges, not tags).
    const tagArb = fc
      .stringMatching(/^[a-z][a-z-]*$/)
      .filter((tag) => validRange(tag) === null);
    fc.assert(
      fc.property(distinctVersionsArb, tagArb, fc.boolean(), (versions, tag, registerTag) => {
        const target = versions[versions.length - 1];
        const present = tag !== 'latest' && registerTag ? { [tag]: target } : {};
        const reg = registryOf(versions, present);
        const r = resolveRawSpecifier(tag, reg);
        if (reg.distTags[tag] !== undefined) {
          expect(r).toEqual({ ok: true, version: target });
        } else {
          expect(r).toEqual({ ok: false, reason: 'unknown dist-tag' });
        }
      }),
    );
  });

  it('ranges no published version satisfies are unresolvable', () => {
    fc.assert(
      fc.property(distinctVersionsArb, (versions) => {
        const top = parse(versions[versions.length - 1])!;
        const above = `${top.major + 1}.0.0`;
        const r = resolveRawSpecifier(`^${above}`, registryOf(versions));
        expect(r).toEqual({ ok: false, reason: 'no satisfying version' });
      }),
    );
  });
});

describe('resolveSpecifier (unit)', () => {
  it('returns the unresolvable reason for git/file specifiers even with registry data', () => {
    const reg = registryOf(['1.0.0']);
    expect(resolveRawSpecifier('github:user/repo', reg)).toEqual({ ok: false, reason: 'git url' });
    expect(resolveSpecifier({ kind: 'unresolvable', reason: 'npm alias' }, reg)).toEqual({
      ok: false,
      reason: 'npm alias',
    });
  });
});
