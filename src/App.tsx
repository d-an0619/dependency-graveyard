/**
 * App — top-level state machine / orchestration.
 *
 * Task 12.1: runs analyzePackage through the concurrency pool (6 at a time);
 *            reports land incrementally via the onSettled callback.
 * Task 12.2: Progress live region.
 * Task 12.3: Graveyard with pending placeholders; sorted once all done.
 */

import { useCallback, useState } from 'react';
import { SpookyScene } from './ui/components/SpookyScene';
import { PasteForm } from './ui/components/PasteForm';
import { Progress } from './ui/components/Progress';
import { Summary } from './ui/components/Summary';
import { Graveyard } from './ui/components/Graveyard';
import { analyzePackage } from './analyze';
import { runWithConcurrency } from './io/pool';
import { CONFIG } from './config';
import type { DependencyInput, PackageReport } from './types';

type Phase = 'idle' | 'running' | 'done';

interface AnalysisState {
  phase: Phase;
  inputs: DependencyInput[];
  /** Indexed by position in inputs; null = still pending. */
  reports: (PackageReport | null)[];
  completed: number;
}

const IDLE_STATE: AnalysisState = {
  phase: 'idle',
  inputs: [],
  reports: [],
  completed: 0,
};

export default function App() {
  const [state, setState] = useState<AnalysisState>(IDLE_STATE);

  const handleSubmit = useCallback((inputs: DependencyInput[]) => {
    // Transition to running immediately so the UI shows pending tiles.
    const initial: AnalysisState = {
      phase: 'running',
      inputs,
      reports: inputs.map(() => null),
      completed: 0,
    };
    setState(initial);

    // Kick off the pool. Each settled result is delivered incrementally.
    const now = new Date();
    runWithConcurrency(
      inputs,
      CONFIG.concurrency,
      (input) => analyzePackage(input, { now }),
      (report, index) => {
        setState((prev) => {
          const reports = [...prev.reports];
          reports[index] = report;
          const completed = prev.completed + 1;
          const phase = completed === inputs.length ? 'done' : 'running';
          return { ...prev, reports, completed, phase };
        });
      },
    ).catch(() => {
      // Pool rejection is a programming error; still mark done so the UI
      // doesn't hang in a perpetual "running" state.
      setState((prev) => ({ ...prev, phase: 'done' }));
    });
  }, []);

  const isRunning = state.phase === 'running';

  return (
    <>
      {/* Full-viewport spooky backdrop (Task 10.1) */}
      <SpookyScene />

      {/* Skip link for keyboard users (FR-8.1) */}
      <a href="#graveyard" className="skip-link">
        Skip to graveyard
      </a>

      {/* App content sits above the fixed scene via .app-shell z-index */}
      <div className="app-shell">
        <header style={{ padding: '2rem', textAlign: 'center' }}>
          <h1
            className="font-display"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '0.02em' }}
          >
            Dependency Graveyard
          </h1>
        </header>

        <main id="graveyard" style={{ flex: 1, padding: '0 1rem 4rem' }}>
          <PasteForm onSubmit={handleSubmit} disabled={isRunning} />

          {state.phase !== 'idle' && (
            <>
              <Progress
                completed={state.completed}
                total={state.inputs.length}
              />
              <Summary
                reports={state.reports}
                allDone={state.phase === 'done'}
              />
              <Graveyard
                inputs={state.inputs}
                reports={state.reports}
                allDone={state.phase === 'done'}
              />
            </>
          )}
        </main>
      </div>
    </>
  );
}
