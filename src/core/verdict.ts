// Verdict classification (FR-4.x). Pure: the current time is injected and
// the module never reads the clock, network, or DOM.

import { CONFIG } from '../config';
import type { RegistryInfo, UnresolvableReason, Verdict } from '../types';

export interface VerdictInputs {
  /** Registry lookup failure ("not found on npm", "lookup timed out", ...). */
  lookupError: string | null;
  resolvedVersion: string | null;
  unresolvableReason: UnresolvableReason | null;
  registry: RegistryInfo | null;
  vulnerabilityCount: number;
}

/** Publish time of the most recently published version (FR-4.2). */
export function computeLastPublish(registry: RegistryInfo): Date | null {
  let latest: Date | null = null;
  for (const version of registry.versions) {
    const t = registry.time[version];
    if (t === undefined) continue;
    const d = new Date(t);
    if (isNaN(d.getTime())) continue;
    if (latest === null || d > latest) latest = d;
  }
  return latest;
}

/**
 * Precedence (FR-4.6), in one line:
 * UNKNOWN > deprecated(latest) > age>=3y > (age>=1y or vulnerabilities or resolved-version deprecated) > ALIVE
 *
 * A "year" is a fixed 365-day length (CONFIG.yearMs). Age boundaries are
 * inclusive: exactly 1 year -> DYING, exactly 3 years -> DEAD (FR-4.4).
 */
export function classifyVerdict(input: VerdictInputs, now: Date): Verdict {
  const { lookupError, resolvedVersion, unresolvableReason, registry, vulnerabilityCount } = input;

  // 1. UNKNOWN: unresolved specifier or failed registry lookup.
  if (lookupError !== null || unresolvableReason !== null || registry === null || resolvedVersion === null) {
    return 'UNKNOWN';
  }

  // 2. Latest version deprecated -> DEAD (FR-4.3).
  if (registry.deprecated[registry.latestVersion] !== undefined) {
    return 'DEAD';
  }

  // 3. Age >= deadMs -> DEAD.
  const lastPublish = computeLastPublish(registry);
  if (lastPublish === null) return 'UNKNOWN'; // cannot judge without publish data
  const age = now.getTime() - lastPublish.getTime();
  if (age >= CONFIG.deadMs) {
    return 'DEAD';
  }

  // 4. Age >= dyingMs, or vulnerabilities, or resolved-only deprecation -> DYING.
  const resolvedDeprecated = registry.deprecated[resolvedVersion] !== undefined;
  if (age >= CONFIG.dyingMs || vulnerabilityCount > 0 || resolvedDeprecated) {
    return 'DYING';
  }

  // 5. Otherwise ALIVE.
  return 'ALIVE';
}

const UNRESOLVABLE_MESSAGES: Record<UnresolvableReason, string> = {
  'git url': 'git URL cannot be resolved',
  'tarball url': 'tarball URL cannot be resolved',
  'file url': 'file URL cannot be resolved',
  'link protocol': 'link: protocol cannot be resolved',
  'workspace protocol': 'workspace: protocol cannot be resolved',
  'npm alias': 'npm: alias cannot be resolved',
  'no satisfying version': 'no published version satisfies the range',
  'unknown dist-tag': 'dist-tag not found in the registry',
};

/**
 * Every reason that applies to the verdict, for the epitaph (FR-5.2).
 * DYING can carry several reasons at once (age, vulnerabilities, and
 * resolved-only deprecation); the "upgrade available" note is always kept
 * when the resolved version is deprecated while the latest is not.
 */
export function verdictReasons(input: VerdictInputs, now: Date, verdict: Verdict): string[] {
  const { lookupError, unresolvableReason, registry, resolvedVersion, vulnerabilityCount } = input;

  if (verdict === 'UNKNOWN') {
    if (lookupError !== null) return [lookupError];
    if (unresolvableReason !== null) return [UNRESOLVABLE_MESSAGES[unresolvableReason]];
    if (registry === null) return ['registry data unavailable'];
    if (resolvedVersion === null) return ['version could not be resolved'];
    if (computeLastPublish(registry) === null) return ['no publish time data available'];
    return ['unknown'];
  }

  if (verdict === 'DEAD') {
    const reasons: string[] = [];
    const dep = registry !== null ? registry.deprecated[registry.latestVersion] : undefined;
    if (dep !== undefined) reasons.push(`deprecated: ${dep}`);
    const last = registry !== null ? computeLastPublish(registry) : null;
    if (last !== null) {
      const age = now.getTime() - last.getTime();
      if (age >= CONFIG.deadMs) {
        reasons.push(`no publish in ${Math.floor(CONFIG.deadMs / CONFIG.yearMs)} years or more`);
      }
    }
    return reasons.length > 0 ? reasons : ['dead'];
  }

  if (verdict === 'DYING') {
    const reasons: string[] = [];
    const last = registry !== null ? computeLastPublish(registry) : null;
    const age = last !== null ? now.getTime() - last.getTime() : null;
    if (age !== null && age >= CONFIG.dyingMs) {
      reasons.push(
        `no publish in ${Math.floor(CONFIG.dyingMs / CONFIG.yearMs)} to ${Math.floor(CONFIG.deadMs / CONFIG.yearMs)} years`,
      );
    }
    if (vulnerabilityCount > 0) {
      reasons.push(
        `resolved version has ${vulnerabilityCount} known vulnerabilit${vulnerabilityCount === 1 ? 'y' : 'ies'}`,
      );
    }
    const resolvedDeprecated =
      registry !== null && resolvedVersion !== null && registry.deprecated[resolvedVersion] !== undefined;
    if (resolvedDeprecated) {
      reasons.push('resolved version is deprecated; upgrade available');
    }
    return reasons.length > 0 ? reasons : ['dying'];
  }

  return ['recently published, no known issues'];
}
