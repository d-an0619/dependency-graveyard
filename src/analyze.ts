// Single-package analysis pipeline, shared by the UI and check-sample:
// classify -> (registry -> resolve -> OSV) -> verdict -> reasons.
// A specifier that is unresolvable by classification (git/tarball/file/
// link/workspace/npm alias) skips registry and OSV entirely and yields
// UNKNOWN with null registry data (FR-2.1, FR-3.3).

import { classifySpecifier, resolveSpecifier } from './core/resolveVersion';
import { classifyVerdict, verdictReasons, type VerdictInputs } from './core/verdict';
import { queryVulnerabilities } from './io/osv';
import { fetchRegistry } from './io/registry';
import type { FetchLike } from './io/fetchWithTimeout';
import type { DependencyInput, PackageReport, RegistryInfo, Vulnerability } from './types';

export interface AnalyzeOptions {
  fetchFn?: FetchLike;
  now?: Date;
}

/**
 * Analyze one dependency end to end. Never throws for per-package
 * failures: they become part of the returned report.
 */
export async function analyzePackage(
  input: DependencyInput,
  opts: AnalyzeOptions = {},
): Promise<PackageReport> {
  const now = opts.now ?? new Date();

  let spec = classifySpecifier(input.rawSpecifier);

  // Unresolvable by classification: no lookups at all.
  if (spec.kind === 'unresolvable') {
    const verdictInputs: VerdictInputs = {
      lookupError: null,
      resolvedVersion: null,
      unresolvableReason: spec.reason,
      registry: null,
      vulnerabilityCount: 0,
    };
    const verdict = classifyVerdict(verdictInputs, now);
    return {
      input,
      resolvedVersion: null,
      unresolvableReason: spec.reason,
      registry: null,
      vulnerabilities: [],
      lookupError: null,
      vulnCheckUnavailable: false,
      verdict,
      verdictReasons: verdictReasons(verdictInputs, now, verdict),
    };
  }

  // Registry lookup (skipped above).
  let registry: RegistryInfo | null = null;
  let lookupError: string | null = null;
  const registryResult = await fetchRegistry(input.name, { fetchFn: opts.fetchFn });
  if (registryResult.ok) {
    registry = registryResult.registry;
  } else {
    lookupError = registryResult.error;
  }

  // Version resolution.
  let resolvedVersion: string | null = null;
  let unresolvableReason: PackageReport['unresolvableReason'] = null;
  if (registry !== null) {
    const resolution = resolveSpecifier(spec, registry);
    if (resolution.ok) {
      resolvedVersion = resolution.version;
    } else {
      unresolvableReason = resolution.reason;
    }
  }

  // OSV lookup (only when a version resolved and the registry answered).
  let vulnerabilities: Vulnerability[] = [];
  let vulnCheckUnavailable = false;
  if (resolvedVersion !== null) {
    const osv = await queryVulnerabilities(input.name, resolvedVersion, {
      fetchFn: opts.fetchFn,
    });
    if (osv.ok) {
      vulnerabilities = osv.vulnerabilities;
    } else {
      vulnCheckUnavailable = true;
    }
  }

  const verdictInputs: VerdictInputs = {
    lookupError,
    resolvedVersion,
    unresolvableReason,
    registry,
    vulnerabilityCount: vulnerabilities.length,
  };
  const verdict = classifyVerdict(verdictInputs, now);
  return {
    input,
    resolvedVersion,
    unresolvableReason,
    registry,
    vulnerabilities,
    lookupError,
    vulnCheckUnavailable,
    verdict,
    verdictReasons: verdictReasons(verdictInputs, now, verdict),
  };
}
