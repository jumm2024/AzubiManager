import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureError, initGlobalCapture, getLogs, addListener } from './logger';

// Clear logs before each test by accessing the internal module state
vi.mock('./logger', async () => {
  const actual = await vi.importActual('./logger');
  return actual;
});

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('captureError speichert Fehler im Log', () => {
    const error = new Error('Test error');
    captureError(error, 'test-source');

    const logs = getLogs();
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[logs.length - 1].message).toBe('Test error');
    expect(logs[logs.length - 1].source).toBe('test-source');
  });

  it('captureError mit String als Fehler', () => {
    const beforeCount = getLogs().length;
    captureError('String error' as any, 'string-source');

    const logs = getLogs();
    expect(logs.length).toBeGreaterThan(beforeCount);
    expect(logs[logs.length - 1].message).toBe('String error');
  });

  it('captureError ohne source', () => {
    const beforeCount = getLogs().length;
    captureError(new Error('No source'));

    const logs = getLogs();
    expect(logs.length).toBeGreaterThan(beforeCount);
    expect(logs[logs.length - 1].source).toBeUndefined();
  });

  it('MAX_LOGS Begrenzung', () => {
    for (let i = 0; i < 60; i++) {
      captureError(new Error(`Error ${i}`), 'test');
    }

    const logs = getLogs();
    expect(logs.length).toBe(50);
    expect(logs[0].message).toBe('Error 10');
    expect(logs[49].message).toBe('Error 59');
  });

  it('addListener benachrichtigt Listener', () => {
    const listener = vi.fn();
    addListener(listener);

    captureError(new Error('Trigger'), 'test');

    expect(listener).toHaveBeenCalled();
  });

  it('addListener remove function entfernt Listener', () => {
    const listener = vi.fn();
    const remove = addListener(listener);

    remove();

    captureError(new Error('Should not trigger'), 'test');

    expect(listener).not.toHaveBeenCalled();
  });

  it('initGlobalCapture registriert Event Listener nur einmal', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    initGlobalCapture();
    initGlobalCapture();

    expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
  });
});
