'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppProvider, useApp } from '@/context/AppContext';
import { ToastProvider } from '@/context/ToastContext';
import { ToastContainer } from '@/components/ui/Toast';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Onboarding } from '@/components/screens/Onboarding';
import { Home } from '@/components/screens/Home';
import { Settings } from '@/components/screens/Settings';
import { TrackerDetail } from '@/components/tracker/TrackerDetail';
import { CreateEditTracker } from '@/components/tracker/CreateEditTracker';
import { SystemBanners } from '@/components/system/SystemBanners';
import { OfflineIndicator } from '@/components/system/OfflineIndicator';
import { InstallPrompt } from '@/components/system/InstallPrompt';
import { useTrackerFetch } from '@/hooks/useTrackerFetch';
import { isTrackerStale } from '@/lib/recheck';
import { getDB } from '@/lib/db';
import type { Tracker } from '@/types';

function AppContent() {
  const { screen, activeTrackerId, navigate, setQuotaExhausted } = useApp();
  const [createOpen, setCreateOpen]   = useState(false);
  const [editTracker, setEditTracker] = useState<Tracker | undefined>();
  const [fetchingIds, setFetchingIds] = useState<Set<string>>(new Set());

  const handleQuota = useCallback(() => {
    setQuotaExhausted(true);
  }, [setQuotaExhausted]);

  const { fetchTracker } = useTrackerFetch(handleQuota);

  const activeTracker = useLiveQuery(
    () => activeTrackerId ? getDB().trackers.get(activeTrackerId) : undefined,
    [activeTrackerId]
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const handleFetch = useCallback(async (tracker: Tracker) => {
    setFetchingIds(prev => new Set([...prev, tracker.id]));
    await fetchTracker(tracker);
    setFetchingIds(prev => { const n = new Set(prev); n.delete(tracker.id); return n; });
  }, [fetchTracker]);

  // Tracker Detail open is the second of Flightwatch's three actual fetch
  // triggers (PRD §4.2.1): opportunistically recheck this tracker if its
  // recheck interval has elapsed, once per visit to this screen.
  const detailFetchedRef = useRef<string | null>(null);
  useEffect(() => {
    if (screen !== 'detail') { detailFetchedRef.current = null; return; }
    if (!activeTracker || detailFetchedRef.current === activeTracker.id) return;
    detailFetchedRef.current = activeTracker.id;
    if (activeTracker.status === 'active' && isTrackerStale(activeTracker)) {
      handleFetch(activeTracker);
    }
  }, [screen, activeTracker, handleFetch]);

  const handleAddTracker = () => {
    setEditTracker(undefined);
    setCreateOpen(true);
  };

  const handleEditTracker = useCallback((t: Tracker) => {
    setEditTracker(t);
    setCreateOpen(true);
  }, []);

  const handleSaved = useCallback(() => {
    setEditTracker(undefined);
  }, []);

  if (screen === 'onboarding') {
    return <Onboarding />;
  }

  return (
    <div className="h-dvh bg-slate-50 dark:bg-slate-900 flex flex-col max-w-lg mx-auto relative overflow-hidden">
      {/* Desktop centering shadow */}
      <div className="hidden md:block fixed inset-y-0 left-1/2 -translate-x-1/2 w-[480px] shadow-2xl pointer-events-none z-0 border-x border-slate-200 dark:border-slate-700" />

      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <SystemBanners />

        {/*
          `<main>` is the single true scrolling region for all screens.
          `min-h-0` lets it actually shrink to the available flex space
          (flex items default to min-height: auto, which would otherwise
          let content push this taller than the viewport). Because this
          is the only overflow-y-auto ancestor, each screen's sticky
          AppHeader now correctly pins to the top of *this* scrollport
          instead of scrolling away with the rest of the page.
        */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          {screen === 'home' && (
            <Home onAddTracker={handleAddTracker} onEditTracker={handleEditTracker} />
          )}
          {screen === 'detail' && activeTracker && (
            <TrackerDetail
              tracker={activeTracker}
              onEdit={() => handleEditTracker(activeTracker)}
              onFetch={handleFetch}
              isFetching={fetchingIds.has(activeTracker.id)}
            />
          )}
          {screen === 'settings' && <Settings />}
        </main>

        <BottomNav onAddTracker={handleAddTracker} />
      </div>

      <CreateEditTracker
        open={createOpen}
        onClose={() => { setCreateOpen(false); setEditTracker(undefined); }}
        editTracker={editTracker}
        onSaved={handleSaved}
      />

      <ToastContainer />
      <OfflineIndicator />
      <InstallPrompt />
      {/*
        Screen-reader alert announcer (Design Specs v1.4 §9.3).
        The `aria-live="assertive"` region is the functional replacement for
        the system notification removed in PRD v1.6 OQ-8. When a price check
        crosses the alert threshold, announceAlert() injects text here so
        screen readers announce it without requiring focus navigation.
      */}
      <div
        id="fw-aria-live"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </div>
  );
}

export default function Page() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <AppProvider>
      <ToastProvider>
        {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
        <AppContent />
      </ToastProvider>
    </AppProvider>
  );
}
