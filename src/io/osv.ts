// OSV vulnerability lookup: one single-package POST to /v1/query per
// package (FR-2.1). A failed query is an error result handled by the
// accepted OSV policy: note in the epitaph, verdict unaffected.

import { CONFIG } from '../config';
import type { Vulnerability } from '../types';
import { fetchWithTimeout, TimeoutError, type FetchLike } from './fetchWithTimeout';
import type { FetchOptions } from './registry';

export type OsvResult =
  | { ok: true; vulnerabilities: Vulnerability[] }
  | { ok: false; error: string };

/** Query known vulnerabilities for one exact package version. */
export async function queryVulnerabilities(
  name: string,
  version: string,
  opts: FetchOptions = {},
): Promise<OsvResult> {
  let res: Response;
  try {
    res = await fetchWithTimeout(
      CONFIG.osvQueryUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: { name, ecosystem: 'npm' }, version }),
      },
      opts.fetchFn ?? (fetch as unknown as FetchLike),
      opts.timeoutMs ?? CONFIG.requestTimeoutMs,
    );
  } catch (e) {
    if (e instanceof TimeoutError) return { ok: false, error: 'vulnerability check timed out' };
    return { ok: false, error: `vulnerability check unavailable: ${(e as Error).message}` };
  }

  // OSV returns 404 when the package/version combination has no known
  // vulnerabilities.
  if (res.status === 404) return { ok: true, vulnerabilities: [] };
  if (!res.ok) return { ok: false, error: `OSV request failed with status ${res.status}` };

  let doc: any;
  try {
    doc = await res.json();
  } catch {
    return { ok: false, error: 'OSV returned invalid JSON' };
  }

  const vulns: any[] = doc.vulns ?? [];
  const vulnerabilities: Vulnerability[] = vulns.map((v) => ({
    id: String(v.id ?? 'unknown'),
    summary: typeof v.summary === 'string' ? v.summary : String(v.id ?? 'unknown'),
    url:
      (Array.isArray(v.references)
        ? (v.references.find((r: any) => typeof r?.url === 'string')?.url as string | undefined)
        : undefined) ?? `https://osv.dev/vulnerability/${v.id ?? ''}`,
  }));
  return { ok: true, vulnerabilities };
}
