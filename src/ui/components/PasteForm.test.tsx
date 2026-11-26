/**
 * Tests for PasteForm — Tasks 11.1 and 11.2.
 *
 * Covers:
 *  - Invalid JSON → error shown in role="alert", onSubmit NOT called.
 *  - No dependencies → error shown, onSubmit NOT called.
 *  - Valid JSON → no error, onSubmit called with parsed inputs.
 *  - "Try an example" button → parses bundled sample, calls onSubmit,
 *    no error shown (FR-1.2).
 *  - Editing textarea after an error clears the error.
 *
 * Network is never touched (pure parsing only).
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PasteForm } from './PasteForm';
import type { DependencyInput } from '../../types';

// Stub the ?raw import that Vite resolves at build time.
// Vitest does not run Vite transforms, so we provide a minimal valid
// package.json with one dependency from each of the four verdicts.
vi.mock('../../../sample/example.package.json?raw', () => ({
  default: JSON.stringify({
    dependencies: { react: '^18.0.0' },
    devDependencies: { '@types/node': '^20.0.0' },
  }),
}));

describe('PasteForm', () => {
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSubmit = vi.fn();
  });

  function setup(disabled = false) {
    render(<PasteForm onSubmit={onSubmit} disabled={disabled} />);
    const textarea = screen.getByRole('textbox');
    const digBtn = screen.getByRole('button', { name: /dig graves/i });
    const exampleBtn = screen.getByRole('button', { name: /try an example/i });
    const errorRegion = screen.getByRole('alert');
    return { textarea, digBtn, exampleBtn, errorRegion };
  }

  // --- 11.1 rendering ---

  it('renders a labeled textarea', () => {
    setup();
    expect(screen.getByLabelText(/paste your/i)).toBeInTheDocument();
  });

  it('renders "Dig graves" and "Try an example" buttons', () => {
    setup();
    expect(screen.getByRole('button', { name: /dig graves/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try an example/i })).toBeInTheDocument();
  });

  it('renders an empty role="alert" region initially', () => {
    const { errorRegion } = setup();
    expect(errorRegion).toBeInTheDocument();
    expect(errorRegion).toHaveTextContent('');
  });

  it('renders the privacy notice', () => {
    setup();
    expect(screen.getByText(/package names are sent to npm and osv/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing is stored/i)).toBeInTheDocument();
  });

  // --- 11.2 parse errors wired to alert region ---

  it('shows a parse error and does NOT call onSubmit for invalid JSON', () => {
    const { textarea, digBtn, errorRegion } = setup();
    fireEvent.change(textarea, { target: { value: 'not valid json' } });
    fireEvent.click(digBtn);
    expect(errorRegion).not.toHaveTextContent('');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows an error and does NOT call onSubmit when no dependencies exist', () => {
    const { textarea, digBtn, errorRegion } = setup();
    fireEvent.change(textarea, { target: { value: JSON.stringify({ name: 'empty-pkg' }) } });
    fireEvent.click(digBtn);
    expect(errorRegion).toHaveTextContent(/no dependencies/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit and clears error for valid JSON with dependencies', () => {
    const { textarea, digBtn, errorRegion } = setup();
    const pkg = JSON.stringify({ dependencies: { lodash: '^4.0.0' } });
    fireEvent.change(textarea, { target: { value: pkg } });
    fireEvent.click(digBtn);
    expect(errorRegion).toHaveTextContent('');
    expect(onSubmit).toHaveBeenCalledOnce();
    const inputs: DependencyInput[] = onSubmit.mock.calls[0][0];
    expect(inputs).toHaveLength(1);
    expect(inputs[0].name).toBe('lodash');
    expect(inputs[0].rawSpecifier).toBe('^4.0.0');
    expect(inputs[0].dev).toBe(false);
  });

  it('marks devDependencies entries with dev=true', () => {
    const { textarea, digBtn } = setup();
    const pkg = JSON.stringify({ devDependencies: { vitest: '^2.0.0' } });
    fireEvent.change(textarea, { target: { value: pkg } });
    fireEvent.click(digBtn);
    const inputs: DependencyInput[] = onSubmit.mock.calls[0][0];
    expect(inputs[0].dev).toBe(true);
  });

  // --- 11.1: Try an example button ---

  it('"Try an example" calls onSubmit without errors', () => {
    const { exampleBtn, errorRegion } = setup();
    fireEvent.click(exampleBtn);
    expect(errorRegion).toHaveTextContent('');
    expect(onSubmit).toHaveBeenCalledOnce();
    const inputs: DependencyInput[] = onSubmit.mock.calls[0][0];
    expect(inputs.length).toBeGreaterThan(0);
  });

  // --- Stale error clears on edit ---

  it('clears error when the user edits the textarea after a failure', () => {
    const { textarea, digBtn, errorRegion } = setup();
    // Trigger an error first (empty submit).
    fireEvent.click(digBtn);
    expect(errorRegion).not.toHaveTextContent('');
    // User edits → error clears.
    fireEvent.change(textarea, { target: { value: ' ' } });
    expect(errorRegion).toHaveTextContent('');
  });

  // --- Disabled state ---

  it('disables both buttons and the textarea when disabled=true', () => {
    const { textarea, digBtn, exampleBtn } = setup(true);
    expect(textarea).toBeDisabled();
    expect(digBtn).toBeDisabled();
    expect(exampleBtn).toBeDisabled();
  });
});
