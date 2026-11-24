// Domain types for Dependency Graveyard.
// This module must stay free of I/O and DOM types so the core logic is pure.

export type Verdict = 'ALIVE' | 'DYING' | 'DEAD' | 'UNKNOWN';

export type UnresolvableReason =
  | 'git url'
  | 'tarball url'
  | 'file url'
  | 'link protocol'
  | 'workspace protocol'
  | 'npm alias'
  | 'no satisfying version'
  | 'unknown dist-tag';

export type Specifier =
  | { kind: 'range'; range: string }
  | { kind: 'dist-tag'; tag: string }
  | { kind: 'unresolvable'; reason: UnresolvableReason };

/** A single dependency read from the pasted package.json. */
export interface DependencyInput {
  name: string;
  rawSpecifier: string;
  /** True when the entry came from devDependencies (duplicates: dev wins). */
  dev: boolean;
}

/** The subset of the npm registry document we keep. */
export interface RegistryInfo {
  name: string;
  /** dist-tags.latest */
  latestVersion: string;
  /** All published version strings. */
  versions: string[];
  /** dist-tags map, needed for dist-tag specifiers. */
  distTags: Record<string, string>;
  /** version -> ISO publish timestamp. `modified`/`created` keys must be excluded when reading. */
  time: Record<string, string>;
  /** version -> deprecation message (undefined = not deprecated). */
  deprecated: Record<string, string | undefined>;
}

/** One OSV finding for the resolved version. */
export interface Vulnerability {
  id: string;
  summary: string;
  url: string;
}

/** Everything the UI needs about one analyzed dependency. */
export interface PackageReport {
  input: DependencyInput;
  resolvedVersion: string | null;
  unresolvableReason: UnresolvableReason | null;
  registry: RegistryInfo | null;
  vulnerabilities: Vulnerability[];
  /** Set when the registry lookup itself failed, e.g. "not found on npm". */
  lookupError: string | null;
  /** True when the OSV query failed or timed out (verdict is unaffected). */
  vulnCheckUnavailable: boolean;
  verdict: Verdict;
  /** Every applicable reason for the verdict, shown in the epitaph. */
  verdictReasons: string[];
}
