// Classify package.json version specifiers and resolve them against registry
// data (FR-3.1, FR-3.2, FR-3.3). Pure: no fetch, no clock, no DOM.

import { maxSatisfying, validRange } from 'semver';
import type { RegistryInfo, Specifier, UnresolvableReason } from '../types';

/** True when the string is a GitHub-style user/repo shorthand (optionally #ref). */
function isRepoShorthand(s: string): boolean {
  return /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+(?:#.*)?$/.test(s);
}

/** Classify a raw version specifier without registry access. */
export function classifySpecifier(raw: string): Specifier {
  const s = raw.trim();
  if (s === '') {
    // npm treats an empty version as "*", i.e. any version.
    return { kind: 'range', range: '*' };
  }
  // Git-ish specifiers: explicit protocols, host shorthands, GitHub
  // user/repo, and ssh URLs.
  if (
    s.startsWith('git+') ||
    s.startsWith('git://') ||
    s.startsWith('github:') ||
    s.startsWith('gitlab:') ||
    s.startsWith('bitbucket:') ||
    s.startsWith('gist:') ||
    /^git@[^:]+:/.test(s) ||
    isRepoShorthand(s) ||
    /^https?:\/\/\S+\.git(?:#|$)/.test(s)
  ) {
    return { kind: 'unresolvable', reason: 'git url' };
  }
  // Any other http(s) URL is a tarball URL (FR: .tgz, .tar.gz, query strings).
  if (/^https?:\/\//.test(s)) {
    return { kind: 'unresolvable', reason: 'tarball url' };
  }
  if (s.startsWith('file:')) {
    return { kind: 'unresolvable', reason: 'file url' };
  }
  if (s.startsWith('link:')) {
    return { kind: 'unresolvable', reason: 'link protocol' };
  }
  if (s.startsWith('workspace:')) {
    return { kind: 'unresolvable', reason: 'workspace protocol' };
  }
  if (s.startsWith('npm:')) {
    return { kind: 'unresolvable', reason: 'npm alias' };
  }
  // Local paths: ./x, ../x, ., .., /x, ~/x
  if (/^(\.\/|\.\.\/|\.|\.\.|\/|~\/)/.test(s)) {
    return { kind: 'unresolvable', reason: 'file url' };
  }
  if (validRange(s) !== null) {
    return { kind: 'range', range: s };
  }
  // Anything else is treated as a dist-tag (e.g. "latest", "next").
  return { kind: 'dist-tag', tag: s };
}

export type ResolutionResult =
  | { ok: true; version: string }
  | { ok: false; reason: UnresolvableReason };

/**
 * Resolve a classified specifier against registry data.
 * - range: the highest published version satisfying the range (FR-3.1)
 * - dist-tag: the version the tag points to (FR-3.2)
 * - everything else: unresolvable with its reason (FR-3.3)
 */
export function resolveSpecifier(spec: Specifier, registry: RegistryInfo): ResolutionResult {
  switch (spec.kind) {
    case 'range': {
      const v = maxSatisfying(registry.versions, spec.range);
      return v === null
        ? { ok: false, reason: 'no satisfying version' }
        : { ok: true, version: v };
    }
    case 'dist-tag': {
      const v = registry.distTags[spec.tag];
      return v === undefined
        ? { ok: false, reason: 'unknown dist-tag' }
        : { ok: true, version: v };
    }
    case 'unresolvable':
      return { ok: false, reason: spec.reason };
  }
}

/** Convenience: classify then resolve. */
export function resolveRawSpecifier(raw: string, registry: RegistryInfo): ResolutionResult {
  return resolveSpecifier(classifySpecifier(raw), registry);
}
