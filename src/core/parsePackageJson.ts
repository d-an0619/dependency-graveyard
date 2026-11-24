// Parse and validate pasted package.json contents (FR-1.1, FR-1.3).
// Pure: no fetch, no clock, no DOM.

import type { DependencyInput } from '../types';

export type ParseResult =
  | { ok: true; inputs: DependencyInput[] }
  | { ok: false; error: string };

function friendlyJsonError(e: unknown): string {
  if (e instanceof SyntaxError) {
    const pos = e.message.match(/position (\d+)/);
    return pos
      ? `Invalid JSON: ${e.message} (near character ${pos[1]})`
      : `Invalid JSON: ${e.message}`;
  }
  return `Invalid JSON: ${String(e)}`;
}

function readDeps(value: unknown, label: string): Map<string, string> | string {
  if (value === undefined) return new Map();
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return `Invalid package.json: "${label}" must be an object.`;
  }
  const out = new Map<string, string>();
  for (const [name, spec] of Object.entries(value as Record<string, unknown>)) {
    if (typeof spec !== 'string') {
      return `Invalid package.json: "${label}.${name}" must be a string.`;
    }
    out.set(name, spec);
  }
  return out;
}

/**
 * Parse the pasted text. Returns a list of dependencies (dependencies first,
 * then devDependencies; when a name appears in both, the devDependencies
 * value wins). Invalid JSON or a file with no dependencies yields an error.
 */
export function parsePackageJson(text: string): ParseResult {
  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: friendlyJsonError(e) };
  }
  if (typeof root !== 'object' || root === null || Array.isArray(root)) {
    return { ok: false, error: 'Invalid package.json: top-level value must be an object.' };
  }

  const deps = readDeps((root as Record<string, unknown>).dependencies, 'dependencies');
  if (typeof deps === 'string') return { ok: false, error: deps };
  const devDeps = readDeps((root as Record<string, unknown>).devDependencies, 'devDependencies');
  if (typeof devDeps === 'string') return { ok: false, error: devDeps };

  if (deps.size === 0 && devDeps.size === 0) {
    return { ok: false, error: 'No dependencies found: neither "dependencies" nor "devDependencies" has entries.' };
  }

  const inputs: DependencyInput[] = [];
  const seen = new Set<string>();
  for (const [name, rawSpecifier] of deps) {
    inputs.push({ name, rawSpecifier, dev: false });
    seen.add(name);
  }
  for (const [name, rawSpecifier] of devDeps) {
    if (seen.has(name)) {
      // devDependencies wins on duplicates; keep the first-seen position.
      const existing = inputs.find((d) => d.name === name);
      if (existing) {
        existing.rawSpecifier = rawSpecifier;
        existing.dev = true;
      }
    } else {
      inputs.push({ name, rawSpecifier, dev: true });
      seen.add(name);
    }
  }
  return { ok: true, inputs };
}
