
'use client';
import { useState, useRef } from 'react';
import { KeyRound, Upload, Download, Moon, Sun, Monitor, ExternalLink, Trash2, Bell } from 'lucide-react';
import { getApiKey, saveApiKey, clearApiKey } from '@/lib/crypto';
import { validateApiKey } from '@/lib/serpapi';
import { exportData, importData } from '@/lib/export';
import { useTheme } from '@/hooks/useTheme';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AppHeader } from '@/components/ui/AppHeader';
import type { Theme } from '@/types';

export function Settings() {
  const { theme, setTheme } = useTheme();
  const { navigate }        = useApp();
  const { toast }           = useToast();

  const [changingKey,   setChangingKey]   = useState(false);
  const [newKey,        setNewKey]        = useState('');
  const [keyError,      setKeyError]      = useState('');
  const [validatingKey, setValidatingKey] = useState(false);

  const [importMode,    setImportMode]    = useState<'merge' | 'replace'>('merge');
  const [importFile,    setImportFile]    = useState<File | null>(null);
  const [showImport,    setShowImport]    = useState(false);
  const [importing,     setImporting]     = useState(false);
  const [importSummary, setImportSummary] = useState('');

  const [showClearData, setShowClearData] = useState(false);
  const [clearingData,  setClearingData]  = useState(false);

  const [testingNotif,  setTestingNotif]  = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // BUG FIX: fixed-width masked key — always exactly 6 + 7 dots + 4 chars,
  // regardless of the actual key length, so the display never overflows.
  const maskedKey = () => {
    const k = getApiKey();
    if (!k) return '—';
    return `${k.slice(0, 6)}•••••••${k.slice(-4)}`;
  };

  const handleValidateKey = async () => {
    if (!newKey.trim()) return;
    setValidatingKey(true);
    setKeyError('');
    const r = await validateApiKey(newKey.trim());
    setValidatingKey(false);
    if (r.valid) {
      saveApiKey(newKey.trim());
      setChangingKey(false);
      setNewKey('');
      toast('API key updated');
    } else if (r.quotaExhausted) {
      setKeyError('This key has no remaining credits.');
    } else {
      setKeyError(r.error || 'Invalid key. Check it and try again.');
    }
  };

  const handleExport = async () => {
    try { await exportData(); toast('Backup saved'); }
    catch { toast('Export failed', 'error'); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportSummary(`File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    setShowImport(true);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const result = await importData(importFile, importMode);
      setShowImport(false);
      setImportFile(null);
      toast(`Imported ${result.trackers} tracker${result.trackers !== 1 ? 's' : ''} and ${result.records} price records`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import failed', 'error');
    } finally { setImporting(false); }
  };

  const handleClearAll = async () => {
    setClearingData(true);
    try {
      const { getDB } = await import('@/lib/db');
      const db = getDB();
      await db.trackers.clear();
      await db.priceHistory.clear();
      clearApiKey();
      toast('All data cleared');
      navigate('onboarding');
    } finally { setClearingData(false); setShowClearData(false); }
  };

  // ── Test notification ─────────────────────────────────────────────────────
  const handleTestNotification = async () => {
    setTestingNotif(true);
    try {
      if (!('Notification' in window)) {
        toast('Notifications not supported in this browser', 'error');
        return;
      }

      // Request permission if not yet granted
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'denied') {
        toast('Notifications are blocked. Enable them in your device Settings → Safari → Flightwatch.', 'error');
        return;
      }

      // Use service worker showNotification (required on iOS PWA; also works on Android & desktop)
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification('✈ Flightwatch — Test notification', {
          body: 'Push notifications are working! You will be alerted when a fare hits your target.',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'fw-test',
        });
        toast('Test notification sent');
      } else {
        // Fallback for browsers without service worker (non-PWA desktop)
        new Notification('✈ Flightwatch — Test notification', {
          body: 'Push notifications are working!',
          icon: '/icons/icon-192.png',
        });
        toast('Test notification sent');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not send test notification', 'error');
    } finally {
      setTestingNotif(false);
    }
  };

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Persistent app header — no right-slot element on Settings */}
      <AppHeader />

      <div className="px-4 pt-5 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
      </div>

      <div className="px-4 flex flex-col gap-5">

        {/* ── Appearance ── */}
        <section>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Appearance</p>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Theme</p>
            <SegmentedControl
              options={([
                { label: 'Light',  value: 'light'  },
                { label: 'Dark',   value: 'dark'   },
                { label: 'System', value: 'system' },
              ] as { label: string; value: Theme }[])}
              value={theme}
              onChange={setTheme}
            />
          </div>
        </section>

        {/* ── Notifications ── */}
        <section>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Notifications</p>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={handleTestNotification}
              disabled={testingNotif}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left rounded-2xl disabled:opacity-50"
            >
              <Bell size={18} className="text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {testingNotif ? 'Sending…' : 'Send test notification'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Verify push notifications are working on this device
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* ── SerpAPI ── */}
        <section>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">SerpAPI</p>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="px-4 py-3.5">
              {/*
                BUG FIX: min-w-0 on the text container lets the flex layout
                constrain its width, enabling `truncate` to actually clip the
                monospace key string instead of overflowing the card.
              */}
              <div className="flex items-center gap-3 justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">API Key</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                    {maskedKey()}
                  </p>
                </div>
                <button
                  onClick={() => { setChangingKey(!changingKey); setNewKey(''); setKeyError(''); }}
                  className="flex-shrink-0 text-sm text-sky-500 font-medium px-3 py-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20"
                >
                  {changingKey ? 'Cancel' : 'Change'}
                </button>
              </div>
              {changingKey && (
                <div className="mt-3 flex flex-col gap-2">
                  <input type="password" value={newKey} placeholder="New SerpAPI key…"
                    onChange={e => { setNewKey(e.target.value); setKeyError(''); }}
                    className={`w-full px-3 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 ${keyError ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'}`} />
                  {keyError && <p className="text-xs text-red-500">{keyError}</p>}
                  <Button variant="primary" size="sm" loading={validatingKey} disabled={!newKey.trim()} onClick={handleValidateKey}>
                    Validate and save
                  </Button>
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3">
              <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noopener noreferrer"
                className="text-sm text-sky-500 flex items-center gap-1.5 hover:underline">
                <KeyRound size={14} /> Manage credits at serpapi.com <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </section>

        {/* ── Data ── */}
        <section>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Data</p>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
            <button onClick={handleExport}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left">
              <Upload size={18} className="text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Export data</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Download all trackers and price history</p>
              </div>
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left">
              <Download size={18} className="text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Import data</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Restore from a Flightwatch backup file</p>
              </div>
            </button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
          </div>
        </section>

        {/* ── Danger ── */}
        <section>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Danger zone</p>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-100 dark:border-red-900/30">
            <button onClick={() => setShowClearData(true)}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left rounded-2xl">
              <Trash2 size={18} className="text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-500">Clear all data</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Delete all trackers, history, and API key</p>
              </div>
            </button>
          </div>
        </section>

        {/* ── About ── */}
        <section>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-4">
            <p className="text-sm font-medium text-slate-900 dark:text-white">Flightwatch</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">v1.0.0 · All data stays on your device</p>
            <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Price history retained for 90 days</p>
          </div>
        </section>
      </div>

      {/* ── Import modal ── */}
      <Modal
        open={showImport}
        title="Import data"
        confirmLabel={importMode === 'replace' ? 'Replace and import' : 'Import'}
        confirmVariant={importMode === 'replace' ? 'destructive' : 'primary'}
        onConfirm={handleImport}
        onCancel={() => { setShowImport(false); setImportFile(null); }}
        loading={importing}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">{importSummary}</p>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">How to handle existing data</p>
            <div className="flex flex-col gap-2">
              {(['merge', 'replace'] as const).map(mode => (
                <label key={mode} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="importMode" value={mode}
                    checked={importMode === mode} onChange={() => setImportMode(mode)}
                    className="text-sky-500" />
                  <div>
                    <p className={`text-sm font-medium ${mode === 'replace' ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                      {mode === 'merge' ? 'Merge with existing data' : 'Replace all my data'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {mode === 'merge' ? 'New trackers added; existing unchanged' : 'All current trackers and history deleted'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={showClearData}
        title="Clear all data?"
        description="This will permanently delete all trackers, price history, and your API key. This cannot be undone."
        confirmLabel="Clear everything"
        confirmVariant="destructive"
        onConfirm={handleClearAll}
        onCancel={() => setShowClearData(false)}
        loading={clearingData}
      />
    </div>
  );
}
