import { describe, expect, it } from 'vitest';
import type { FetchLike } from './fetchWithTimeout';
import { fetchRegistry } from './registry';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fullDoc = {
  'dist-tags': { latest: '2.0.0', next: '2.1.0-beta.1' },
  time: {
    created: '2020-01-01T00:00:00.000Z',
    modified: '2030-01-01T00:00:00.000Z',
    '1.0.0': '2024-01-01T00:00:00.000Z',
    '1.1.0': '2025-01-01T00:00:00.000Z',
    '2.0.0': '2026-01-01T00:00:00.000Z',
  },
  versions: {
    '1.0.0': { deprecated: 'please move on' },
    '1.1.0': {},
    '2.0.0': {},
  },
};

describe('fetchRegistry', () => {
  it('maps 404 to "not found on npm"', async () => {
    const fetchFn: FetchLike = async () => new Response('{}', { status: 404 });
    const r = await fetchRegistry('does-not-exist', { fetchFn });
    expect(r).toEqual({ ok: false, error: 'not found on npm' });
  });

  it('maps a timeout to "lookup timed out"', async () => {
    // A real fetch rejects with AbortError when the signal fires; the stub
    // must mimic that, otherwise the abort has no effect.
    const fetchFn: FetchLike = (_url, init) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const e = new Error('The operation was aborted');
          e.name = 'AbortError';
          reject(e);
        });
      });
    const r = await fetchRegistry('slow-package', { fetchFn, timeoutMs: 20 });
    expect(r).toEqual({ ok: false, error: 'lookup timed out' });
  });

  it('encodes scoped package names as @scope%2Fname', async () => {
    let seenUrl = '';
    const fetchFn: FetchLike = async (url) => {
      seenUrl = url;
      return jsonResponse(404, {});
    };
    await fetchRegistry('@scope/name', { fetchFn });
    expect(seenUrl).toBe('https://registry.npmjs.org/@scope%2Fname');
  });

  it('reduces the full document to dist-tags, time, versions, deprecations', async () => {
    const fetchFn: FetchLike = async () => jsonResponse(200, fullDoc);
    const r = await fetchRegistry('pkg', { fetchFn });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.registry.latestVersion).toBe('2.0.0');
    expect(r.registry.versions).toEqual(['1.0.0', '1.1.0', '2.0.0']);
    expect(r.registry.distTags).toEqual({ latest: '2.0.0', next: '2.1.0-beta.1' });
    expect(r.registry.time['1.0.0']).toBe('2024-01-01T00:00:00.000Z');
    expect(r.registry.time['created']).toBeDefined(); // kept raw; core ignores it
    expect(r.registry.deprecated['1.0.0']).toBe('please move on');
    expect(r.registry.deprecated['2.0.0']).toBeUndefined();
  });

  it('reports non-404 HTTP errors with the status', async () => {
    const fetchFn: FetchLike = async () => new Response('nope', { status: 503 });
    const r = await fetchRegistry('pkg', { fetchFn });
    expect(r).toEqual({ ok: false, error: 'registry request failed with status 503' });
  });

  it('reports network errors without throwing', async () => {
    const fetchFn: FetchLike = async () => {
      throw new TypeError('fetch failed');
    };
    const r = await fetchRegistry('pkg', { fetchFn });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('network error');
  });
});
