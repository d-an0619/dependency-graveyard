// Single configuration object for thresholds and runtime constants (FR-4.7, FR-2.2).

/** A "year" for age math: fixed 365-day length. */
export const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const CONFIG = {
  yearMs: YEAR_MS,
  /** age >= dyingMs -> DYING eligible. */
  dyingMs: 1 * YEAR_MS,
  /** age >= deadMs -> DEAD. */
  deadMs: 3 * YEAR_MS,
  /** Concurrent lookups (fixed default, FR-2.2). */
  concurrency: 6,
  /** Per-request timeout, applied to each fetch, FR-2.2. */
  requestTimeoutMs: 10_000,
  registryUrl: 'https://registry.npmjs.org',
  osvQueryUrl: 'https://api.osv.dev/v1/query',
} as const;
