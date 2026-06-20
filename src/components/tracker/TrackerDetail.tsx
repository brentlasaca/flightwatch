'use client';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import dynamic from 'next/dynamic';
import {
  ArrowLeft, MoreHorizontal, PauseCircle, Play,
  Trash2, RefreshCw, Bell, BellOff,
} from 'lucide-react';
import { getDB } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { AppHeader } from '@/components/ui/AppHeader';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { PriceInsightsPanel } from './PriceInsightsPanel';
import type { Tracker } from '@/types';

const PriceChart = dynamic(() => import('./PriceChart'), {
  ssr: false,
  loading: () => (
    <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Loading chart…</div>
  ),
});

interface TrackerDetailProps {
  tracker: Tracker;
  onEdit: () => void;
  onFetch: (t: Tracker) => void;
  isFetching?: boolean;
}

function fmt(price: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TRAVEL_CLASS  = ['', 'Economy', 'Premium Economy', 'Business', 'First'];
const STOPS_LABEL   = ['Any stops', 'Nonstop only', '1 stop or fewer'];
const FREQ_LABEL: Record<string, string> = {
  hourly: 'Hourly', '3h': 'Every 3 hours', '6h': 'Every 6 hours',
  '12h': 'Every 12 hours', daily: 'Daily',
};

export function TrackerDetail({ tracker, onEdit, onFetch, isFetching }: TrackerDetailProps) {
  const { goBack }     = useApp();
  const { toast }      = useToast();
  const [showDelete, setShowDelete] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [deleting, setDeleting]   = useState(false);

  const history = useLiveQuery(
    () => getDB().priceHistory.where('trackerId').equals(tracker.id).sortBy('fetchedAt'),
    [tracker.id]
  );

  const successHistory = (history || []).filter(h => h.status === 'success' && h.lowestPrice > 0);
  const currentPrice   = tracker.lastKnownPrice;
  const isPaused       = tracker.status === 'paused';
  const targetMet      = currentPrice !== undefined && (
    (tracker.alertDirection === 'below' && currentPrice <= tracker.targetPrice) ||
    (tracker.alertDirection === 'above' && currentPrice >= tracker.targetPrice)
  );

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const db = getDB();
      await db.priceHistory.where('trackerId').equals(tracker.id).delete();
      await db.trackers.delete(tracker.id);
      goBack();
      toast('Tracker deleted');
    } finally { setDeleting(false); }
  };

  const handleTogglePause = async () => {
    const newStatus = isPaused ? 'active' : 'paused';
    await getDB().trackers.update(tracker.id, { status: newStatus, updatedAt: new Date().toISOString() });
    toast(isPaused ? 'Tracking resumed' : 'Tracking paused');
  };

  const handleToggleNotifications = async () => {
    await getDB().trackers.update(tracker.id, {
      notificationsEnabled: !tracker.notificationsEnabled,
      updatedAt: new Date().toISOString(),
    });
    toast(tracker.notificationsEnabled ? 'Notifications off' : 'Notifications on');
  };

  const lastChecked = tracker.lastFetchedAt ? fmtDate(tracker.lastFetchedAt) : 'Never';

  /* ⋯ overflow menu button for the header right slot */
  const overflowAction = (
    <div className="relative">
      <button
        onClick={() => setShowOverflow(v => !v)}
        aria-label="More options"
        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <MoreHorizontal size={18} />
      </button>
      {showOverflow && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setShowOverflow(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[140px]">
            <button
              onClick={() => { setShowOverflow(false); onEdit(); }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Edit tracker
            </button>
            <button
              onClick={() => { setShowOverflow(false); setShowDelete(true); }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete tracker…
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 dark:bg-slate-900">
      {/* App header — logo + wordmark + ⋯ overflow in right slot */}
      <AppHeader right={overflowAction} />

      <div className="overflow-y-auto pb-24 flex-1">
        {/* Back nav + route heading */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-sky-500 font-medium text-sm mb-3 -ml-0.5"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {tracker.params.departure_id} → {tracker.params.arrival_id}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {tracker.params.type === 1 ? 'Round Trip' : 'One Way'}{' '}
            · {TRAVEL_CLASS[tracker.params.travel_class]}{' '}
            · {tracker.params.adults} adult{tracker.params.adults > 1 ? 's' : ''}
            {tracker.params.return_date
              ? ` · ${new Date(tracker.params.outbound_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(tracker.params.return_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              : ` · ${new Date(tracker.params.outbound_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </p>
        </div>

        {/* Paused banner */}
        {isPaused && (
          <div className="mx-4 mb-3 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2">
            <PauseCircle size={16} className="text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Tracking paused. Resume to keep watching this route.
            </p>
          </div>
        )}

        {/* Price hero card */}
        <div className={`mx-4 mb-4 rounded-2xl p-5 border
          ${targetMet
            ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-700'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
            Current lowest fare
          </p>
          {currentPrice ? (
            <>
              <div className={`font-mono font-bold text-4xl tabular-nums
                ${targetMet ? 'text-amber-500 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                {fmt(currentPrice, tracker.currency)}
              </div>
              {targetMet && (
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-1">
                  ✓ This fare {tracker.alertDirection === 'below' ? 'dropped below' : 'rose above'} your target
                </p>
              )}
            </>
          ) : (
            <div className="font-mono text-2xl text-slate-300 dark:text-slate-600">—</div>
          )}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Target</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {tracker.alertDirection === 'below' ? '≤' : '≥'} {fmt(tracker.targetPrice, tracker.currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 dark:text-slate-500">Last checked</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{lastChecked}</p>
            </div>
          </div>
        </div>

        {/* ── Price Insights Panel (new) ── */}
        {history && (
          <PriceInsightsPanel
            history={history}
            currency={tracker.currency}
            targetPrice={tracker.targetPrice}
          />
        )}

        {/* Local price history chart */}
        <div className="px-4 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Price history (90 days)
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            {successHistory.length >= 2 ? (
              <PriceChart
                data={successHistory}
                currency={tracker.currency}
                targetPrice={tracker.targetPrice}
              />
            ) : (
              <div className="h-36 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                <RefreshCw size={24} className="opacity-40" />
                <p className="text-sm text-center">
                  Not enough data yet. Check back after a few more fetches.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tracker settings */}
        <div className="px-4 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Tracker settings</h2>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Notifications</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Cooldown: {tracker.cooldownHours}h</p>
              </div>
              <div className="flex items-center gap-2">
                {tracker.notificationsEnabled
                  ? <Bell size={14} className="text-slate-400" />
                  : <BellOff size={14} className="text-slate-400" />}
                <Toggle checked={tracker.notificationsEnabled} onChange={handleToggleNotifications} />
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <p className="text-sm text-slate-900 dark:text-white">Check frequency</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{FREQ_LABEL[tracker.schedule.frequency]}</p>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <p className="text-sm text-slate-900 dark:text-white">Stops filter</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{STOPS_LABEL[tracker.params.stops]}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 flex gap-3 mb-4">
          <Button variant="secondary" className="flex-1" onClick={handleTogglePause}>
            {isPaused ? <><Play size={14} /> Resume</> : <><PauseCircle size={14} /> Pause</>}
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => onFetch(tracker)} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Checking…' : 'Check now'}
          </Button>
        </div>
        <div className="px-4">
          <Button variant="destructive" className="w-full" onClick={() => setShowDelete(true)}>
            <Trash2 size={14} /> Delete tracker
          </Button>
        </div>
      </div>

      <Modal
        open={showDelete}
        title="Delete this tracker?"
        description={`${tracker.params.departure_id} → ${tracker.params.arrival_id} will be removed along with its price history. This cannot be undone.`}
        confirmLabel="Delete tracker"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={deleting}
      />
    </div>
  );
}
