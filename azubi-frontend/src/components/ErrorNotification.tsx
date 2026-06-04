import { useState, useEffect } from 'react';
import { addListener, getLogs } from '../utils/logger';

export default function ErrorNotification() {
  const [hasError, setHasError] = useState(getLogs().length > 0);

  useEffect(() => {
    const unsub = addListener(() => {
      setHasError(getLogs().length > 0);
    });
    return unsub;
  }, []);

  if (!hasError) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-3 bg-white border border-red-200 text-gray-800 px-4 py-3 rounded-xl shadow-lg text-sm">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <span className="font-medium">Fehler aufgetreten</span>
      <button
        onClick={() => {
          const logs = getLogs();
          alert(logs.map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.source ? `(${l.source}) ` : ''}${l.message}`).join('\n'));
        }}
        className="bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1 text-xs font-medium transition-colors"
      >
        Details
      </button>
      <button
        onClick={() => window.location.reload()}
        className="bg-violet-500 text-white rounded-lg px-3 py-1 text-xs font-medium hover:bg-violet-600 transition-colors"
      >
        Neu laden
      </button>
    </div>
  );
}
