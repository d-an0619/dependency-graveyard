import { SpookyScene } from './ui/components/SpookyScene';

export default function App() {
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
          {/* PasteForm, Graveyard, etc. rendered by later tasks */}
        </main>
      </div>
    </>
  );
}
