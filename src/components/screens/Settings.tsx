'use client';
import { useState, useRef } from 'react';
import { KeyRound, Upload, Download, ExternalLink, Trash2 } from 'lucide-react';
import { getApiKey, saveApiKey, clearApiKey } from '@/lib/crypto';
import { validateApiKey } from '@/lib/serpapi';
import { exportData, importData } from '@/lib/export';
import { getTrackerDefaults, resetTrackerDefaults } from '@/lib/trackerDefaults';
import type { TrackerDefaults } from '@/lib/trackerDefaults';
import { useTheme } from '@/hooks/useTheme';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AppHeader } from '@/components/ui/AppHeader';
import { SystemBanners } from '@/components/system/SystemBanners';
import { TrackerDefaultsPanel } from '@/components/tracker/TrackerDefaultsPanel';
import type { Theme } from '@/types';

export function Settings() {
  const { theme, setTheme } = useTheme();
  const { navigate }        = useApp();
  const { toast }           = useToast();

  /* Tracker defaults state — initialised from localStorage */
  const [trackerDefaults, setTrackerDefaults] = useState<TrackerDefaults>(() => getTrackerDefaults());

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

  const fileRef = useRef<HTMLInputElement>(null);

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
      // Refresh defaults in UI if a "replace" import brought in new defaults
      if (importMode === 'replace') setTrackerDefaults(getTrackerDefaults());
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
      // Reset all defaults as part of "Clear all data" (PRD §4.11.6)
      resetTrackerDefaults();
      setTrackerDefaults(getTrackerDefaults());
      toast('All data cleared');
      navigate('onboarding');
    } finally { setClearingData(false); setShowClearData(false); }
  };

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Persistent app header — no right-slot element on Settings */}
      <AppHeader />
      <SystemBanners />

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

        {/* ── Tracker Defaults (PRD v1.8 §4.11) ── */}
        <TrackerDefaultsPanel
          defaults={trackerDefaults}
          onChanged={updated => {
            setTrackerDefaults(updated);
          }}
        />

        {/* ── SerpAPI ── */}
        <section>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">SerpAPI</p>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="px-4 py-3.5">
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
                <p className="text-xs text-slate-400 dark:text-slate-500">Download all trackers, history, and defaults</p>
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
                <p className="text-xs text-slate-400 dark:text-slate-500">Delete all trackers, history, defaults, and API key</p>
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
                      {mode === 'merge'
                        ? 'New trackers added; existing unchanged; your defaults preserved'
                        : 'All trackers, history, and defaults replaced from file'}
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
        description="This will permanently delete all trackers, price history, tracker defaults, and your API key. This cannot be undone."
        confirmLabel="Clear everything"
        confirmVariant="destructive"
        onConfirm={handleClearAll}
        onCancel={() => setShowClearData(false)}
        loading={clearingData}
      />
    </div>
  );
}
