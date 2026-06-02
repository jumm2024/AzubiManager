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
    <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-3 bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm">
      <span className="font-medium">Fehler aufgetreten</span>
      <button
        onClick={() => {
          const logs = getLogs();
          alert(logs.map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.source ? `(${l.source}) ` : ''}${l.message}`).join('\n'));
        }}
        className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1 text-xs font-medium transition-colors"
      >
        Details
      </button>
      <button
        onClick={() => window.location.reload()}
        className="bg-white text-red-700 rounded-lg px-3 py-1 text-xs font-medium hover:bg-gray-100 transition-colors"
      >
        Neu laden
      </button>
    </div>
  );
}
