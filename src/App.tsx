import { useState } from 'react';
import { SpookyScene } from './ui/components/SpookyScene';
import { PasteForm } from './ui/components/PasteForm';
import type { DependencyInput } from './types';

export default function App() {
  // inputs === null means the form is showing; non-null means analysis was
  // requested (Tasks 12+ will drive the actual analysis).
  const [_inputs, setInputs] = useState<DependencyInput[] | null>(null);

  function handleSubmit(inputs: DependencyInput[]) {
    setInputs(inputs);
    // Analysis orchestration is wired in Task 12.1.
  }

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
          <h1 className="font-display" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '0.02em' }}>
            Dependency Graveyard
          </h1>
        </header>

        <main id="graveyard" style={{ flex: 1, padding: '0 1rem 4rem' }}>
          <PasteForm onSubmit={handleSubmit} />
          {/* Graveyard, Progress, Summary rendered by later tasks */}
        </main>
      </div>
    </>
  );
}
