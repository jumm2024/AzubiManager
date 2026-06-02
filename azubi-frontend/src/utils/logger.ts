interface LogEntry {
  message: string;
  source?: string;
  timestamp: number;
}

const MAX_LOGS = 50;
const logs: LogEntry[] = [];
let listeners: Array<() => void> = [];

export function addListener(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

function notify() {
  listeners.forEach(l => l());
}

export function getLogs(): LogEntry[] {
  return [...logs];
}

export function captureError(error: unknown, source?: string) {
  const message = error instanceof Error ? error.message : String(error);
  const entry: LogEntry = { message, source, timestamp: Date.now() };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
  console.error(`[${source || 'global'}]`, error);
  notify();
}

let initialized = false;

export function initGlobalCapture() {
  if (initialized) return;
  initialized = true;

  window.addEventListener('error', (event) => {
    captureError(event.error || event.message, 'window.onerror');
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason, 'unhandledRejection');
  });
}
