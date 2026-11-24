import { describe, expect, it } from 'vitest';
import { parsePackageJson } from './parsePackageJson';

describe('parsePackageJson', () => {
  it('parses dependencies first, then devDependencies', () => {
    const r = parsePackageJson(
      JSON.stringify({
        name: 'x',
        dependencies: { react: '^18.0.0', lodash: '4.17.15' },
        devDependencies: { typescript: '^5.0.0' },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.inputs.map((d) => d.name)).toEqual(['react', 'lodash', 'typescript']);
    expect(r.inputs[0].dev).toBe(false);
    expect(r.inputs[2].dev).toBe(true);
  });

  it('reports invalid JSON with a friendly message', () => {
    const r = parsePackageJson('{ "dependencies": ');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('Invalid JSON');
  });

  it('rejects a top-level non-object', () => {
    const r = parsePackageJson('"just a string"');
    expect(r.ok).toBe(false);
  });

  it('rejects a file with no dependencies at all', () => {
    const r = parsePackageJson(JSON.stringify({ name: 'x' }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain('No dependencies found');
  });

  it('rejects empty dependency maps', () => {
    const r = parsePackageJson(JSON.stringify({ dependencies: {}, devDependencies: {} }));
    expect(r.ok).toBe(false);
  });

  it('accepts dependencies when devDependencies is missing', () => {
    const r = parsePackageJson(JSON.stringify({ dependencies: { react: '^18.0.0' } }));
    expect(r.ok).toBe(true);
  });

  it('lets devDependencies override duplicate names, keeping position', () => {
    const r = parsePackageJson(
      JSON.stringify({
        dependencies: { lodash: '^4.0.0', react: '^18.0.0' },
        devDependencies: { lodash: '4.17.15' },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.inputs.map((d) => d.name)).toEqual(['lodash', 'react']);
    const lodash = r.inputs[0];
    expect(lodash.rawSpecifier).toBe('4.17.15');
    expect(lodash.dev).toBe(true);
  });

  it('rejects non-string dependency values', () => {
    const r = parsePackageJson('{"dependencies": {"react": 18}}');
    expect(r.ok).toBe(false);
  });
});
