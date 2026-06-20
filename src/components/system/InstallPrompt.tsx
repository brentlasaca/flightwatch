
'use client';
import { useState, useEffect } from 'react';
import { Share, X, PlusSquare } from 'lucide-react';

type Platform = 'ios' | 'android' | null;

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return null;
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);
  if (isStandalone) return null;
  if (isIOS) return 'ios';
  if (isAndroid) return 'android';
  return null;
}

export function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt?: () => void } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const last = localStorage.getItem('fw_install_dismissed');
    if (last && Date.now() - parseInt(last) < 30 * 24 * 3600 * 1000) {
      setDismissed(true);
      return;
    }
    setPlatform(detectPlatform());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt?: () => void });
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('fw_install_dismissed', String(Date.now()));
    setDismissed(true);
  };

  const handleAndroidInstall = async () => {
    if (deferredPrompt?.prompt) {
      deferredPrompt.prompt();
    }
    handleDismiss();
  };

  if (dismissed || !platform) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 40 40" className="w-6 h-6">
            <g transform="translate(20,20) rotate(-30)">
              <ellipse cx="0" cy="-6" rx="3.5" ry="1.8" fill="#3B82F6"/>
              <path d="M-3.5-6 L-14-9 L-14-6 L-3.5-5 Z" fill="#3B82F6" opacity="0.8"/>
              <path d="M3.5-6 L14-9 L14-6 L3.5-5 Z"   fill="#3B82F6" opacity="0.8"/>
              <rect x="-1.5" y="2" width="3" height="5" rx="1" fill="#3B82F6" opacity="0.7"/>
            </g>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Install Flightwatch</p>
          {platform === 'ios' ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Tap <Share size={11} className="inline" /> then <strong>&ldquo;Add to Home Screen&rdquo;</strong> for the best experience and notifications.
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Runs offline · Notifies you on price drops · Works like a native app.
            </p>
          )}
        </div>
        <button onClick={handleDismiss} className="text-slate-400 hover:text-slate-600 flex-shrink-0 p-1">
          <X size={16} />
        </button>
      </div>
      {platform === 'android' && deferredPrompt && (
        <button onClick={handleAndroidInstall}
          className="mt-3 w-full py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 active:bg-sky-700 transition-colors flex items-center justify-center gap-2">
          <PlusSquare size={16} /> Install
        </button>
      )}
    </div>
  );
}
