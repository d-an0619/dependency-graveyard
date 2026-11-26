/**
 * Grave — placeholder tile for Task 12.
 *
 * Task 13.1 replaces this with the inline-SVG artwork (tombstone / ghost /
 * tree / fog-shrouded mound) and button semantics. For now each grave is a
 * plain tile showing the package name (truncated, title attribute) and a
 * visible verdict label, so shape/label are already the signal, not color.
 */

import type { DependencyInput, PackageReport } from '../../types';

export interface GraveProps {
  input: DependencyInput;
  report: PackageReport | null;
}

export function Grave({ input, report }: GraveProps) {
  const name = input.name;

  if (report === null) {
    return (
      <div className="grave grave--pending" aria-label={`${name}: digging`}>
        <span className="grave__shape" aria-hidden="true" />
        <span className="grave__name" title={name}>
          {name}
        </span>
        <span className="grave__verdict grave__verdict--pending">digging...</span>
      </div>
    );
  }

  const verdict = report.verdict.toLowerCase();

  return (
    <div className={`grave grave--${verdict}`}>
      {/* Placeholder shape slot; real SVG artwork arrives in Task 13.1. */}
      <span className="grave__shape" aria-hidden="true" />
      <span className="grave__name" title={name}>
        {name}
      </span>
      <span className={`grave__verdict verdict-${verdict}`}>{verdict}</span>
    </div>
  );
}
