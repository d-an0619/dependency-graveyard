/**
 * Summary — Task 13.3 (FR-6.1)
 *
 * Shows the dead/dying counts after all analysis tasks complete.
 * Reuses core/summary.ts; renders nothing while analysis is still running.
 */

import { summarize } from '../../core/summary';
import type { PackageReport, Verdict } from '../../types';

export interface SummaryProps {
  reports: (PackageReport | null)[];
  allDone: boolean;
}

export function Summary({ reports, allDone }: SummaryProps) {
  if (!allDone) return null;

  const verdicts: Verdict[] = reports.map((r) => r?.verdict ?? 'UNKNOWN');
  const { sentence } = summarize(verdicts);

  return (
    <p className="summary" aria-live="polite">
      {sentence}
    </p>
  );
}
