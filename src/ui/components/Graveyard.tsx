/**
 * Graveyard — Task 12.1 / 12.3
 *
 * Renders one slot per dependency. While the analysis runs, pending slots
 * show the "digging..." placeholder and completed graves render in input
 * order as their tasks settle. Once every task has completed, graves are
 * sorted DEAD -> DYING -> UNKNOWN -> ALIVE, then alphabetically (FR-5.1).
 */

import type { DependencyInput, PackageReport, Verdict } from '../../types';
import { Grave } from './Grave';

export interface GraveyardProps {
  inputs: DependencyInput[];
  /** Reports by input index; null = still pending. */
  reports: (PackageReport | null)[];
  /** True once every task has settled. */
  allDone: boolean;
}

const VERDICT_ORDER: Record<Verdict, number> = {
  DEAD: 0,
  DYING: 1,
  UNKNOWN: 2,
  ALIVE: 3,
};

export function Graveyard({ inputs, reports, allDone }: GraveyardProps) {
  let slots: { input: DependencyInput; report: PackageReport | null }[] = inputs.map(
    (input, i) => ({ input, report: reports[i] ?? null }),
  );

  if (allDone) {
    slots = [...slots].sort((a, b) => {
      const ra = a.report?.verdict ?? 'UNKNOWN';
      const rb = b.report?.verdict ?? 'UNKNOWN';
      const d = VERDICT_ORDER[ra] - VERDICT_ORDER[rb];
      if (d !== 0) return d;
      return a.input.name.localeCompare(b.input.name);
    });
  }

  return (
    <div className="graveyard">
      {slots.map(({ input, report }) => (
        <Grave key={input.name} input={input} report={report} />
      ))}
    </div>
  );
}
