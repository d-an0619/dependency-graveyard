/**
 * PasteForm — Task 11.1 / 11.2
 *
 * - Labeled monospace textarea for pasting package.json text.
 * - "Dig graves" primary button: parses input and calls onSubmit on success.
 * - "Try an example" secondary button: loads the bundled sample and calls
 *   onSubmit without further user action (FR-1.2).
 * - Inline error region (role="alert") shown on parse failure or no-dependencies
 *   error; onSubmit is never called when there is an error (FR-1.3).
 * - Privacy notice: "package names are sent to npm and OSV; nothing is stored"
 *   (FR-7.1).
 */

import { useRef, useState } from 'react';
import { parsePackageJson } from '../../core/parsePackageJson';
import type { DependencyInput } from '../../types';

// Bundled sample is a plain JSON file; Vite handles the ?raw import.
// We import it at module load time so the button is instant (no network).
import sampleJson from '../../../sample/example.package.json?raw';

export interface PasteFormProps {
  /** Called with parsed inputs when analysis should begin. */
  onSubmit: (inputs: DependencyInput[]) => void;
  /** When true, disable the form (analysis in progress). */
  disabled?: boolean;
}

export function PasteForm({ onSubmit, disabled = false }: PasteFormProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleDigGraves() {
    const result = parsePackageJson(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onSubmit(result.inputs);
  }

  function handleTryExample() {
    // Load the bundled sample, run analysis immediately (FR-1.2).
    // No parse error expected for the bundled sample, but guard anyway.
    const result = parsePackageJson(sampleJson);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setText(sampleJson);
    setError(null);
    onSubmit(result.inputs);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Allow Ctrl/Cmd+Enter as a quick submit shortcut.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleDigGraves();
    }
  }

  return (
    <div className="paste-form">
      <div className="paste-form__field">
        <label htmlFor="pkg-json-input" className="paste-form__label font-display">
          Paste your <code>package.json</code>
        </label>

        <textarea
          ref={textareaRef}
          id="pkg-json-input"
          className="paste-form__textarea"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            // Clear stale error as the user edits.
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          rows={14}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          placeholder={'{\n  "dependencies": {\n    "react": "^18.0.0"\n  }\n}'}
          disabled={disabled}
          aria-describedby={error ? 'pkg-json-error' : undefined}
          aria-invalid={error !== null ? true : undefined}
        />
      </div>

      {/* Inline error region — always present in DOM so screen readers
          detect the role="alert" node before it has content (FR-1.3). */}
      <div
        id="pkg-json-error"
        role="alert"
        className="paste-form__error"
        aria-live="assertive"
      >
        {error ?? null}
      </div>

      <div className="paste-form__actions">
        <button
          type="button"
          className="paste-form__btn paste-form__btn--primary"
          onClick={handleDigGraves}
          disabled={disabled}
        >
          ⚰ Dig graves
        </button>

        <button
          type="button"
          className="paste-form__btn paste-form__btn--secondary"
          onClick={handleTryExample}
          disabled={disabled}
        >
          Try an example
        </button>
      </div>

      {/* Privacy notice (FR-7.1) */}
      <p className="paste-form__privacy">
        Package names are sent to npm and OSV; nothing is stored.
      </p>
    </div>
  );
}
