// Summary sentence (FR-6.1). Pure.

import type { Verdict } from '../types';

export interface SummaryResult {
  total: number;
  dead: number;
  dying: number;
  sentence: string;
}

/**
 * Build the summary over all analyzed dependencies, e.g.
 * "7 of 42 dependencies are dead, 12 are dying".
 */
export function summarize(verdicts: Verdict[]): SummaryResult {
  const total = verdicts.length;
  let dead = 0;
  let dying = 0;
  for (const v of verdicts) {
    if (v === 'DEAD') dead += 1;
    else if (v === 'DYING') dying += 1;
  }
  const depWord = total === 1 ? 'dependency' : 'dependencies';
  const beWord = dead === 1 ? 'is' : 'are';
  const deadPart = `${dead} of ${total} ${depWord} ${beWord} dead`;
  const dyingPart = dying === 1 ? `${dying} is dying` : `${dying} are dying`;
  return { total, dead, dying, sentence: `${deadPart}, ${dyingPart}` };
}
