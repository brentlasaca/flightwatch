'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Bell, BellOff } from 'lucide-react';
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

interface HomeProps { onAddTracker: () => void; onEditTracker: (t: Tracker) => void; }

export function Home({ onAddTracker, onEditTracker }: HomeProps) {
  const { navigate, setQuotaExhausted } = useApp();
  const { toast } = useToast();
  const [search, setSearch]     = useState('');
  const [sort, setSort]         = useState<SortMode>('updated');
  const [muteAll, setMuteAll]   = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('fw_mute_all') === '1'
  );
  const [deleteTarget, setDeleteTarget] = useState<Tracker | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [fetchingIds, setFetchingIds]   = useState<Set<string>>(new Set());
  const didInitFetch = useRef(false);

  const handleQuota = useCallback(() => {
    setQuotaExhausted(true);
    toast('SerpAPI quota exhausted — all trackers paused', 'error');
  }, [setQuotaExhausted, toast]);

  const { fetchTracker, fetchAllActive } = useTrackerFetch(handleQuota);
  const allTrackers = useLiveQuery(() => getDB().trackers.orderBy('updatedAt').reverse().toArray(), []);

  useEffect(() => {
    if (didInitFetch.current || !allTrackers) return;
    didInitFetch.current = true;
    pruneOldHistory().catch(console.warn);
    fetchAllActive(allTrackers);
  }, [allTrackers, fetchAllActive]);

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

  const toggleMuteAll = useCallback(() => {
    const next = !muteAll;
    setMuteAll(next);
    localStorage.setItem('fw_mute_all', next ? '1' : '0');
    toast(next ? 'All notifications muted' : 'Notifications enabled');
  }, [muteAll, toast]);

  const cycleSort = () => {
    const order: SortMode[] = ['updated', 'price', 'name'];
    setSort(prev => order[(order.indexOf(prev) + 1) % order.length]);
  };
  const sortLabel: Record<SortMode, string> = { updated: 'Recently updated', price: 'Lowest price', name: 'Name (A–Z)' };

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

  /* Bell button for the header right slot */
  const bellAction = (
    <button
      onClick={toggleMuteAll}
      aria-label={muteAll ? 'Unmute notifications' : 'Mute all notifications'}
      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
    >
      {muteAll ? <BellOff size={18} /> : <Bell size={18} />}
    </button>
  );

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Persistent header with logo + Bell */}
      <AppHeader right={bellAction} />

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

      {/* Sort */}
      {(allTrackers?.length || 0) > 1 && (
        <div className="px-4 pb-3">
          <button
            onClick={cycleSort}
            className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200"
          >
            Sort: <span className="font-medium text-slate-700 dark:text-slate-200">{sortLabel[sort]}</span> ↕
          </button>
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
          /* Empty state — uses Flightwatch logo mark per design specs §7.1 */
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
          <p className="text-xs text-slate-300 dark:text-slate-600 text-center py-2">
            ~{totalCalls} API call{totalCalls !== 1 ? 's' : ''}/day across{' '}
            {(allTrackers || []).filter(t => t.status === 'active').length} active tracker
            {(allTrackers || []).filter(t => t.status === 'active').length !== 1 ? 's' : ''}
          </p>
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
    </div>
  );
}
