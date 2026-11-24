import { describe, expect, it } from 'vitest';
import { analyzePackage } from './analyze';
import type { FetchLike } from './io/fetchWithTimeout';
import type { DependencyInput } from './types';

const NOW = new Date('2026-11-24T00:00:00.000Z');

function dep(name: string, rawSpecifier: string): DependencyInput {
  return { name, rawSpecifier, dev: false };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function registryDoc(latest: string, versions: string[], deprecated: Record<string, string> = {}, lastPublish = '2026-10-01T00:00:00.000Z') {
  return {
    'dist-tags': { latest },
    time: Object.fromEntries(versions.map((v) => [v, lastPublish])),
    versions: Object.fromEntries(
      versions.map((v) => [v, deprecated[v] ? { deprecated: deprecated[v] } : {}]),
    ),
  };
}

describe('analyzePackage', () => {
  it('does not call fetch at all for an unresolvable specifier', async () => {
    let calls = 0;
    const fetchFn: FetchLike = async () => {
      calls++;
      return jsonResponse(200, {});
    };
    const report = await analyzePackage(dep('ghost-town', 'github:some/missing-repo'), {
      fetchFn,
      now: NOW,
    });
    expect(calls).toBe(0);
    expect(report.verdict).toBe('UNKNOWN');
    expect(report.registry).toBeNull();
    expect(report.unresolvableReason).toBe('git url');
    expect(report.verdictReasons[0]).toContain('git URL');
  });

  it('does not query OSV when the registry returns 404', async () => {
    const urls: string[] = [];
    const fetchFn: FetchLike = async (url) => {
      urls.push(url);
      if (url.includes('registry.npmjs.org')) return jsonResponse(404, {});
      throw new Error('OSV must not be called');
    };
    const report = await analyzePackage(dep('missing-pkg', '^1.0.0'), { fetchFn, now: NOW });
    expect(urls).toHaveLength(1); // registry only
    expect(report.verdict).toBe('UNKNOWN');
    expect(report.lookupError).toBe('not found on npm');
    expect(report.registry).toBeNull();
  });

  it('keeps the verdict when the OSV query fails, and flags the check as unavailable', async () => {
    const doc = registryDoc('2.0.0', ['1.0.0', '2.0.0']);
    const fetchFn: FetchLike = async (url) => {
      if (url.includes('registry.npmjs.org')) return jsonResponse(200, doc);
      return jsonResponse(500, {}); // OSV failure
    };
    const report = await analyzePackage(dep('fresh-pkg', '^2.0.0'), { fetchFn, now: NOW });
    expect(report.verdict).toBe('ALIVE');
    expect(report.vulnCheckUnavailable).toBe(true);
    expect(report.vulnerabilities).toEqual([]);
  });

  it('classifies DYING when the resolved version has vulnerabilities', async () => {
    const doc = registryDoc('2.0.0', ['1.0.0', '2.0.0']);
    const fetchFn: FetchLike = async (url) => {
      if (url.includes('registry.npmjs.org')) return jsonResponse(200, doc);
      return jsonResponse(200, {
        vulns: [{ id: 'GHSA-1', summary: 'bad', references: [{ url: 'https://x' }] }],
      });
    };
    const report = await analyzePackage(dep('stale-pkg', '^1.0.0'), { fetchFn, now: NOW });
    expect(report.resolvedVersion).toBe('1.0.0');
    expect(report.verdict).toBe('DYING');
    expect(report.vulnerabilities).toHaveLength(1);
    expect(report.verdictReasons.some((r) => r.includes('1 known vulnerability'))).toBe(true);
  });

  it('marks DEAD when the latest version is deprecated', async () => {
    const doc = registryDoc('2.0.0', ['1.0.0', '2.0.0'], { '2.0.0': 'abandoned' });
    const fetchFn: FetchLike = async (url) => {
      if (url.includes('registry.npmjs.org')) return jsonResponse(200, doc);
      return jsonResponse(404, {});
    };
    const report = await analyzePackage(dep('dead-pkg', '^2.0.0'), { fetchFn, now: NOW });
    expect(report.verdict).toBe('DEAD');
    expect(report.verdictReasons[0]).toContain('deprecated: abandoned');
  });

  it('returns UNKNOWN when no published version satisfies the range', async () => {
    const doc = registryDoc('2.0.0', ['1.0.0', '2.0.0']);
    const fetchFn: FetchLike = async (url) => {
      if (url.includes('registry.npmjs.org')) return jsonResponse(200, doc);
      throw new Error('OSV must not be called');
    };
    const report = await analyzePackage(dep('picky-pkg', '^9.0.0'), { fetchFn, now: NOW });
    expect(report.verdict).toBe('UNKNOWN');
    expect(report.unresolvableReason).toBe('no satisfying version');
    expect(report.registry).not.toBeNull(); // registry data exists, resolution failed
  });
});
