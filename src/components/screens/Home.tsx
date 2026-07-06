'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Info, RefreshCw } from 'lucide-react';
import { getDB, pruneOldHistory } from '@/lib/db';
import { estimateDailyApiCalls } from '@/lib/serpapi';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { useTrackerFetch } from '@/hooks/useTrackerFetch';
import { AppHeader } from '@/components/ui/AppHeader';
import { TrackerCard } from '@/components/tracker/TrackerCard';
import { FlightwatchLogoMark } from '@/components/ui/FlightwatchLogo';
import { Modal } from '@/components/ui/Modal';
import type { Tracker } from '@/types';

type SortMode = 'updated' | 'price' | 'name';

/** Sort order persistence key (PRD v1.11 §4.5.2, Design Specs v1.8 §4.2). */
const SORT_STORAGE_KEY = 'trackerListSortOrder';
const SORT_MODES: SortMode[] = ['updated', 'price', 'name'];

function loadStoredSort(): SortMode {
  if (typeof window === 'undefined') return 'updated';
  const stored = window.localStorage.getItem(SORT_STORAGE_KEY);
  return (SORT_MODES as string[]).includes(stored || '') ? (stored as SortMode) : 'updated';
}

/** Fetch All batch-level cooldown, separate from any per-tracker debounce (PRD §4.2.5). */
const FETCH_ALL_COOLDOWN_MS = 60_000;
/** Brief stagger between sequential fetches in a Fetch All run (Design Specs v1.8 §5.14). */
const FETCH_ALL_STAGGER_MS = 300;

type FetchAllState = 'idle' | 'confirming' | 'running' | 'cooldown';

interface HomeProps { onAddTracker: () => void; onEditTracker: (t: Tracker) => void; }

export function Home({ onAddTracker, onEditTracker }: HomeProps) {
  const { navigate, setQuotaExhausted } = useApp();
  const { toast } = useToast();
  const [search, setSearch]     = useState('');
  const [sort, setSort]         = useState<SortMode>(loadStoredSort);
  const [deleteTarget, setDeleteTarget] = useState<Tracker | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [fetchingIds, setFetchingIds]   = useState<Set<string>>(new Set());
  const [showCallsInfo, setShowCallsInfo] = useState(false);
  const didInitFetch = useRef(false);
  // Tracks every tracker ID that has already been handled by either the initial
  // batch fetch or the new-tracker effect below. Seeded synchronously inside
  // the didInitFetch effect so the two effects never double-fetch on first load.
  const seenTrackerIds = useRef<Set<string>>(new Set());

  // Fetch All (PRD §4.2.5 / Design Specs §5.14)
  const [fetchAllState, setFetchAllState] = useState<FetchAllState>('idle');
  const [fetchAllProgress, setFetchAllProgress] = useState<{ done: number; total: number } | null>(null);
  const fetchAllCancelRef = useRef(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Persist sort order (PRD §4.5.2) — restored on next visit via loadStoredSort().
  useEffect(() => {
    window.localStorage.setItem(SORT_STORAGE_KEY, sort);
  }, [sort]);

  const handleQuota = useCallback(() => {
    setQuotaExhausted(true);
    toast('SerpAPI quota exhausted — all trackers paused', 'error');
  }, [setQuotaExhausted, toast]);

  const { fetchTracker, fetchAllActive } = useTrackerFetch(handleQuota);
  const allTrackers = useLiveQuery(() => getDB().trackers.orderBy('updatedAt').reverse().toArray(), []);

  // Trigger 1: opportunistic recheck of stale active trackers on Home open.
  useEffect(() => {
    if (didInitFetch.current || !allTrackers) return;
    didInitFetch.current = true;
    // Seed seen-set with every tracker that exists right now so the effect
    // below doesn't double-fetch any of them on the same render.
    allTrackers.forEach(t => seenTrackerIds.current.add(t.id));
    pruneOldHistory().catch(console.warn);
    fetchAllActive(allTrackers, {
      onTrackerStart: id => setFetchingIds(prev => new Set([...prev, id])),
      onTrackerEnd:   id => setFetchingIds(prev => { const n = new Set(prev); n.delete(id); return n; }),
    });
  }, [allTrackers, fetchAllActive]);

  // Bug fix: auto-fetch newly created trackers that appear in allTrackers after
  // the initial batch has already run (i.e. user created a tracker and navigated
  // back to Home). The live query fires every time the trackers table changes, so
  // seenTrackerIds is the guard that makes this a no-op for IDs already handled.
  useEffect(() => {
    if (!didInitFetch.current || !allTrackers) return;

    const newUnfetched = allTrackers.filter(
      t => !seenTrackerIds.current.has(t.id) && t.status === 'active' && !t.lastFetchedAt
    );

    // Always mark every current ID as seen, regardless of whether we fetch,
    // so subsequent live-query updates (e.g. lastFetchedAt being written back)
    // don't re-enter this branch.
    allTrackers.forEach(t => seenTrackerIds.current.add(t.id));

    for (const t of newUnfetched) {
      setFetchingIds(prev => new Set([...prev, t.id]));
      fetchTracker(t).then(() => {
        setFetchingIds(prev => { const n = new Set(prev); n.delete(t.id); return n; });
      });
    }
  }, [allTrackers, fetchTracker]);

  const handleFetch = useCallback(async (tracker: Tracker) => {
    setFetchingIds(prev => new Set([...prev, tracker.id]));
    await fetchTracker(tracker);
    setFetchingIds(prev => { const n = new Set(prev); n.delete(tracker.id); return n; });
    toast('Price updated');
  }, [fetchTracker, toast]);

  const handleTogglePause = useCallback(async (tracker: Tracker) => {
    const newStatus = tracker.status === 'active' ? 'paused' : 'active';
    await getDB().trackers.update(tracker.id, { status: newStatus, updatedAt: new Date().toISOString() });
    toast(newStatus === 'active' ? 'Tracking resumed' : 'Tracking paused');
  }, [toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await getDB().priceHistory.where('trackerId').equals(deleteTarget.id).delete();
      await getDB().trackers.delete(deleteTarget.id);
      toast('Tracker deleted');
    } finally { setDeleting(false); setDeleteTarget(null); }
  }, [deleteTarget, toast]);

  const cycleSort = () => {
    const order: SortMode[] = ['updated', 'price', 'name'];
    setSort(prev => order[(order.indexOf(prev) + 1) % order.length]);
  };
  const sortLabel: Record<SortMode, string> = { updated: 'Recently updated', price: 'Lowest price', name: 'Name (A–Z)' };

  const activeTrackers = (allTrackers || []).filter(t => t.status === 'active');
  const activeCount = activeTrackers.length;

  // Fetch All — force-fetches every active tracker (PRD §4.2.5, Design Specs §5.14).
  const handleFetchAllClick = useCallback(() => {
    if (fetchAllState !== 'idle' || !isOnline || activeCount === 0) return;
    setFetchAllState('confirming');
  }, [fetchAllState, isOnline, activeCount]);

  const handleFetchAllCancel = useCallback(() => {
    setFetchAllState('idle');
  }, []);

  const handleCancelRun = useCallback(() => {
    fetchAllCancelRef.current = true;
  }, []);

  const handleFetchAllConfirm = useCallback(async () => {
    const total = activeCount;
    fetchAllCancelRef.current = false;
    setFetchAllProgress({ done: 0, total });
    setFetchAllState('running');

    const summary = await fetchAllActive(allTrackers || [], {
      force: true,
      staggerMs: FETCH_ALL_STAGGER_MS,
      isCancelled: () => fetchAllCancelRef.current,
      onTrackerStart: id => setFetchingIds(prev => new Set([...prev, id])),
      onTrackerEnd: id => {
        setFetchingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        setFetchAllProgress(prev => prev ? { ...prev, done: prev.done + 1 } : prev);
      },
    });

    if (summary.cancelled) {
      toast(`Fetch all cancelled after ${summary.attempted} of ${total}.`);
    } else if (!summary.quotaExhausted) {
      // Quota-exhausted runs already get their own banner/toast via handleQuota above.
      if (summary.failed > 0) {
        toast(`Fetched ${summary.attempted}, ${summary.failed} failed.`, summary.failed === summary.attempted ? 'error' : 'success');
      } else {
        toast(`Fetched ${summary.attempted} tracker${summary.attempted !== 1 ? 's' : ''}.`);
      }
    }

    setFetchAllProgress(null);
    setFetchAllState('cooldown');
    setTimeout(() => setFetchAllState('idle'), FETCH_ALL_COOLDOWN_MS);
  }, [activeCount, allTrackers, fetchAllActive, toast]);

  const filtered = (allTrackers || []).filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.params.departure_id.toLowerCase().includes(q) ||
      t.params.arrival_id.toLowerCase().includes(q) ||
      (t.name || '').toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    if (sort === 'price') return (a.lastKnownPrice || Infinity) - (b.lastKnownPrice || Infinity);
    if (sort === 'name') return (
      (a.name || `${a.params.departure_id}-${a.params.arrival_id}`)
        .localeCompare(b.name || `${b.params.departure_id}-${b.params.arrival_id}`)
    );
    return 0;
  });

  const totalCalls = (allTrackers || [])
    .filter(t => t.status === 'active')
    .reduce((sum, t) => sum + estimateDailyApiCalls(t.schedule.frequency), 0);

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-900 pb-20">
      {/* App header — no right-slot element (Bell removed per PRD v1.6) */}
      <AppHeader />

      {/* Search */}
      <div className="px-4 pt-4 pb-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search trackers…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Sort + Fetch All */}
      {((allTrackers?.length || 0) > 1 || activeCount > 0) && (
        <div className="px-4 pb-3 flex items-center justify-between gap-2">
          {(allTrackers?.length || 0) > 1 ? (
            <button
              onClick={cycleSort}
              className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Sort: <span className="font-medium text-slate-700 dark:text-slate-200">{sortLabel[sort]}</span> ↕
            </button>
          ) : <span />}

          {activeCount > 0 && (
            fetchAllState === 'running' ? (
              <div className="flex items-center gap-2">
                <span
                  role="status"
                  aria-live="polite"
                  aria-label={`Fetching ${fetchAllProgress?.done ?? 0} of ${fetchAllProgress?.total ?? activeCount} trackers`}
                  className="text-xs font-medium text-sky-600 dark:text-sky-400 flex items-center gap-1"
                >
                  <RefreshCw size={14} className="animate-spin" />
                  Fetching {fetchAllProgress?.done ?? 0} of {fetchAllProgress?.total ?? activeCount}…
                </span>
                <button
                  onClick={handleCancelRun}
                  aria-label="Cancel fetch all"
                  className="text-xs text-slate-500 dark:text-slate-400 underline hover:text-slate-700 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleFetchAllClick}
                disabled={fetchAllState === 'cooldown' || !isOnline}
                aria-label={
                  fetchAllState === 'cooldown'
                    ? 'Fetch all active trackers, fetched moments ago'
                    : 'Fetch all active trackers'
                }
                className={`text-xs font-medium flex items-center gap-1 transition-colors ${
                  fetchAllState === 'cooldown' || !isOnline
                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300'
                }`}
              >
                <RefreshCw size={14} />
                {fetchAllState === 'cooldown' ? 'Fetched moments ago' : 'Fetch all'}
              </button>
            )
          )}
        </div>
      )}

      {/* Tracker list */}
      <div className="flex-1 px-4 flex flex-col gap-3">
        {!allTrackers ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 && search ? (
          <div className="flex flex-col items-center py-16 gap-2 text-slate-400">
            <Search size={32} className="opacity-30" />
            <p className="text-sm">No trackers match &ldquo;{search}&rdquo;</p>
            <button onClick={() => setSearch('')} className="text-sky-500 text-sm">Clear search</button>
          </div>
        ) : allTrackers.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-slate-400">
            <FlightwatchLogoMark size={64} className="opacity-40" />
            <p className="text-lg font-medium text-slate-500 dark:text-slate-400">No trackers yet</p>
            <p className="text-sm text-center text-slate-400 dark:text-slate-500 max-w-xs">
              Add your first flight to start watching prices.
            </p>
            <button
              onClick={onAddTracker}
              className="mt-2 px-5 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 active:bg-sky-700 transition-colors"
            >
              Track your first flight →
            </button>
          </div>
        ) : (
          filtered.map(t => (
            <TrackerCard
              key={t.id}
              tracker={t}
              onClick={() => navigate('detail', t.id)}
              onTogglePause={handleTogglePause}
              onDelete={t => setDeleteTarget(t)}
              onFetch={handleFetch}
              isFetching={fetchingIds.has(t.id)}
            />
          ))
        )}

        {totalCalls > 0 && (
          <div className="py-2">
            <button
              onClick={() => setShowCallsInfo(v => !v)}
              className="w-full flex items-center justify-center gap-1 text-xs text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500"
            >
              <Info size={11} className="flex-shrink-0" />
              Up to ~{totalCalls} API call{totalCalls !== 1 ? 's' : ''}/day across{' '}
              {(allTrackers || []).filter(t => t.status === 'active').length} active tracker
              {(allTrackers || []).filter(t => t.status === 'active').length !== 1 ? 's' : ''}
            </button>
            {showCallsInfo && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-1.5 px-4 leading-relaxed">
                This is the most you&rsquo;d use if every tracker&rsquo;s recheck interval is hit every time you open the app.
                Flightwatch doesn&rsquo;t check prices in the background, so real usage is typically lower.
              </p>
            )}
          </div>
        )}
      </div>

      <Modal
        open={!!deleteTarget}
        title="Delete this tracker?"
        description={
          deleteTarget
            ? `${deleteTarget.params.departure_id} → ${deleteTarget.params.arrival_id} will be removed along with its price history.`
            : ''
        }
        confirmLabel="Delete tracker"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      {/* Fetch All confirmation — not destructive, discloses credit cost (PRD §4.2.5, Design Specs §5.7) */}
      <Modal
        open={fetchAllState === 'confirming'}
        title={`Fetch all ${activeCount} tracker${activeCount !== 1 ? 's' : ''}?`}
        description={`This will use approximately ${activeCount} SerpAPI credit${activeCount !== 1 ? 's' : ''}.`}
        confirmLabel="Fetch all"
        confirmVariant="primary"
        onConfirm={handleFetchAllConfirm}
        onCancel={handleFetchAllCancel}
      />
    </div>
  );
}
