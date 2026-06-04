import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
import * as logger from '../utils/logger';

vi.mock('../utils/logger', () => ({
  captureError: vi.fn(),
}));

function ThrowError() {
  throw new Error('Test error');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rendert children wenn kein Fehler', () => {
    render(
      <ErrorBoundary>
        <div>Normal Content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });

  it('zeigt Fehler-UI wenn ein Fehler geworfen wird', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Ein Fehler ist aufgetreten')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Seite neu laden/i })).toBeInTheDocument();
  });

  it('ruft captureError auf wenn ein Fehler passiert', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(logger.captureError).toHaveBeenCalledWith(
      expect.any(Error),
      'ErrorBoundary'
    );
  });

  it('zeigt custom fallback wenn angegeben', () => {
    render(
      <ErrorBoundary fallback={<div>Custom Error</div>}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error')).toBeInTheDocument();
    expect(screen.queryByText('Ein Fehler ist aufgetreten')).not.toBeInTheDocument();
  });

  it('Reset-Button ist vorhanden', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const button = screen.getByRole('button', { name: /Seite neu laden/i });
    expect(button).toBeInTheDocument();
  });
});
