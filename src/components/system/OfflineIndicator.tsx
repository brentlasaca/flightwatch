
'use client';
import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 flex items-center gap-1.5 bg-slate-800 dark:bg-slate-700 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
      <WifiOff size={12} />
      Offline
    </div>
  );
}
