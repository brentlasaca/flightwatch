
'use client';
import { X, RefreshCw, ZapOff, ExternalLink } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useState, useEffect } from 'react';

export function SystemBanners() {
  const { quotaExhausted, setQuotaExhausted } = useApp();
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      });
    });
  }, []);

  const handleReload = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
      });
    }
    window.location.reload();
  };

  if (!quotaExhausted && !updateAvailable) return null;

  return (
    <div className="flex flex-col gap-1 px-4 pt-2">
      {quotaExhausted && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-r-xl px-3 py-2.5">
          <ZapOff size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">SerpAPI quota exhausted</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              All tracking paused.{' '}
              <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noopener noreferrer"
                className="underline inline-flex items-center gap-0.5">
                Add credits <ExternalLink size={10} />
              </a>
              , then resume your trackers.
            </p>
          </div>
          <button onClick={() => setQuotaExhausted(false)} className="text-amber-500 hover:text-amber-700 flex-shrink-0">
            <X size={16} />
          </button>
        </div>
      )}
      {updateAvailable && (
        <div className="flex items-center gap-3 bg-sky-50 dark:bg-sky-900/20 border-l-4 border-sky-400 rounded-r-xl px-3 py-2.5">
          <RefreshCw size={16} className="text-sky-500 flex-shrink-0" />
          <p className="text-sm text-sky-800 dark:text-sky-300 flex-1">A new version of Flightwatch is ready.</p>
          <button onClick={handleReload}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline whitespace-nowrap">
            Reload
          </button>
        </div>
      )}
    </div>
  );
}
