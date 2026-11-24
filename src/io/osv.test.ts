import { describe, expect, it } from 'vitest';
import type { FetchLike } from './fetchWithTimeout';
import { queryVulnerabilities } from './osv';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('queryVulnerabilities', () => {
  it('maps vulns to id, summary, and an advisory url', async () => {
    const fetchFn: FetchLike = async () =>
      jsonResponse(200, {
        vulns: [
          {
            id: 'GHSA-aaaa-bbbb-cccc',
            summary: 'Prototype pollution in pkg',
            references: [{ type: 'WEB', url: 'https://github.com/advisories/1' }],
          },
          { id: 'GHSA-dddd-eeee-ffff', summary: 'ReDoS in pkg' },
        ],
      });
    const r = await queryVulnerabilities('pkg', '1.2.3', { fetchFn });
    expect(r).toEqual({
      ok: true,
      vulnerabilities: [
        {
          id: 'GHSA-aaaa-bbbb-cccc',
          summary: 'Prototype pollution in pkg',
          url: 'https://github.com/advisories/1',
        },
        {
          id: 'GHSA-dddd-eeee-ffff',
          summary: 'ReDoS in pkg',
          url: 'https://osv.dev/vulnerability/GHSA-dddd-eeee-ffff',
        },
      ],
    });
  });

  it('treats 404 as "no known vulnerabilities"', async () => {
    const fetchFn: FetchLike = async () => jsonResponse(404, {});
    const r = await queryVulnerabilities('pkg', '9.9.9', { fetchFn });
    expect(r).toEqual({ ok: true, vulnerabilities: [] });
  });

  it('returns an error result on HTTP failure', async () => {
    const fetchFn: FetchLike = async () => new Response('oops', { status: 500 });
    const r = await queryVulnerabilities('pkg', '1.2.3', { fetchFn });
    expect(r).toEqual({ ok: false, error: 'OSV request failed with status 500' });
  });

  it('returns an error result on timeout', async () => {
    const fetchFn: FetchLike = (_url, init) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const e = new Error('The operation was aborted');
          e.name = 'AbortError';
          reject(e);
        });
      });
    const r = await queryVulnerabilities('pkg', '1.2.3', { fetchFn, timeoutMs: 20 });
    expect(r).toEqual({ ok: false, error: 'vulnerability check timed out' });
  });

  it('returns an error result on network failure', async () => {
    const fetchFn: FetchLike = async () => {
      throw new TypeError('fetch failed');
    };
    const r = await queryVulnerabilities('pkg', '1.2.3', { fetchFn });
    expect(r.ok).toBe(false);
  });

  it('posts name, version, and ecosystem to the OSV query endpoint', async () => {
    let seenUrl = '';
    let seenInit: RequestInit | undefined;
    const fetchFn: FetchLike = async (url, init) => {
      seenUrl = url;
      seenInit = init;
      return jsonResponse(200, { vulns: [] });
    };
    await queryVulnerabilities('pkg', '1.2.3', { fetchFn });
    expect(seenUrl).toBe('https://api.osv.dev/v1/query');
    expect(JSON.parse(String(seenInit?.body))).toEqual({
      package: { name: 'pkg', ecosystem: 'npm' },
      version: '1.2.3',
    });
  });
});
