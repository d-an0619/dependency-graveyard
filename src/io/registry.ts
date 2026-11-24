// npm registry fetcher (FR-2.1, FR-2.4, FR-4.2). The full document is
// always requested because per-version publish times only exist there.

import { CONFIG } from '../config';
import type { RegistryInfo } from '../types';
import { fetchWithTimeout, TimeoutError, type FetchLike } from './fetchWithTimeout';

export type RegistryResult =
  | { ok: true; registry: RegistryInfo }
  | { ok: false; error: string };

export interface FetchOptions {
  fetchFn?: FetchLike;
  timeoutMs?: number;
}

/**
 * Encode a package name for the registry path. Scoped names keep their "@"
 * and encode the slash: "@scope/name" -> "@scope%2Fname".
 */
export function encodePackageName(name: string): string {
  return name.startsWith('@')
    ? '@' + encodeURIComponent(name.slice(1))
    : encodeURIComponent(name);
}

/** Fetch and reduce the full registry document for one package. */
export async function fetchRegistry(
  name: string,
  opts: FetchOptions = {},
): Promise<RegistryResult> {
  const url = `${CONFIG.registryUrl}/${encodePackageName(name)}`;
  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      {},
      opts.fetchFn ?? (fetch as unknown as FetchLike),
      opts.timeoutMs ?? CONFIG.requestTimeoutMs,
    );
  } catch (e) {
    if (e instanceof TimeoutError) return { ok: false, error: 'lookup timed out' };
    return { ok: false, error: `network error: ${(e as Error).message}` };
  }

  if (res.status === 404) return { ok: false, error: 'not found on npm' };
  if (!res.ok) return { ok: false, error: `registry request failed with status ${res.status}` };

  let doc: any;
  try {
    doc = await res.json();
  } catch {
    return { ok: false, error: 'registry returned invalid JSON' };
  }

  const versions: string[] = Object.keys(doc.versions ?? {});
  if (versions.length === 0) return { ok: false, error: 'registry document has no versions' };

  const deprecated: Record<string, string | undefined> = {};
  for (const v of versions) {
    const d = doc.versions[v]?.deprecated;
    if (typeof d === 'string') deprecated[v] = d;
  }

  const distTags: Record<string, string> = doc['dist-tags'] ?? {};
  const latestVersion = distTags.latest ?? versions[versions.length - 1];

  const time: Record<string, string> = {};
  for (const [key, value] of Object.entries(doc.time ?? {})) {
    if (typeof value === 'string') time[key] = value;
  }

  return {
    ok: true,
    registry: {
      name,
      latestVersion,
      versions,
      distTags,
      time,
      deprecated,
    },
  };
}
