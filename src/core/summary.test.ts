import { describe, expect, it } from 'vitest';
import type { Verdict } from '../types';
import { summarize } from './summary';

describe('summarize', () => {
  it('builds the two-part sentence', () => {
    const verdicts: Verdict[] = [
      'DEAD', 'DEAD', 'DYING', 'ALIVE', 'ALIVE', 'UNKNOWN', 'ALIVE',
      'ALIVE', 'ALIVE', 'ALIVE', 'ALIVE', 'ALIVE',
    ];
    const s = summarize(verdicts);
    expect(s).toEqual({ total: 12, dead: 2, dying: 1, sentence: '2 of 12 dependencies are dead, 1 is dying' });
  });

  it('handles zero dead', () => {
    const s = summarize(['ALIVE', 'ALIVE', 'DYING', 'UNKNOWN']);
    expect(s.sentence).toBe('0 of 4 dependencies are dead, 1 is dying');
  });

  it('handles all dead', () => {
    const s = summarize(['DEAD', 'DEAD', 'DEAD']);
    expect(s.sentence).toBe('3 of 3 dependencies are dead, 0 are dying');
  });

  it('uses singular grammar for a single dependency', () => {
    expect(summarize(['DEAD']).sentence).toBe('1 of 1 dependency is dead, 0 are dying');
    expect(summarize(['DYING']).sentence).toBe('0 of 1 dependency are dead, 1 is dying');
  });

  it('counts only DEAD and DYING in the summary numbers', () => {
    const s = summarize(['ALIVE', 'DEAD', 'DYING', 'UNKNOWN']);
    expect(s.dead).toBe(1);
    expect(s.dying).toBe(1);
    expect(s.total).toBe(4);
  });
});
