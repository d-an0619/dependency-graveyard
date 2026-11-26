/**
 * Progress — Task 12.2 (FR-2.5)
 *
 * Live region announcing "N of M checked" (aria-live="polite") with a
 * progress bar. Hidden when there is nothing to track.
 */

export interface ProgressProps {
  completed: number;
  total: number;
}

export function Progress({ completed, total }: ProgressProps) {
  if (total <= 0) return null;
  const pct = Math.round((completed / total) * 100);
  const done = completed === total;

  return (
    <div className="progress">
      <p className="progress__text" aria-live="polite">
        {done ? `All ${total} dependencies checked` : `${completed} of ${total} checked`}
      </p>
      <div
        className="progress__bar"
        role="progressbar"
        aria-label="Analysis progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        aria-valuetext={`${completed} of ${total} checked`}
      >
        <div
          className="progress__fill"
          style={{ width: `${pct}%` }}
          data-done={done ? 'true' : undefined}
        />
      </div>
    </div>
  );
}
