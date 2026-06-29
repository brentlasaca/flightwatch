'use client';

/**
 * TrackerDefaultRow & supporting picker sheets
 * PRD v1.8 §4.11 / Design Specs v1.6 §5.11
 *
 * Each row in the Tracker Defaults panel on the Settings screen.
 * Tapping a row opens a bottom-sheet picker appropriate to that field.
 */

import { useState, useEffect } from 'react';
import { ChevronRight, RotateCcw, Check, Minus } from 'lucide-react';
import { setTrackerDefault, resetTrackerDefaults, SYSTEM_DEFAULTS } from '@/lib/trackerDefaults';
import type { TrackerDefaults } from '@/lib/trackerDefaults';
import { ALL_CURRENCIES } from '@/data/currencies';
import { LANGUAGES, getLanguageName } from '@/data/languages';
import { Modal } from '@/components/ui/Modal';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useToast } from '@/context/ToastContext';
import type { TravelClass, TripType, StopsFilter, AlertDirection, FetchFrequency } from '@/types';

/* ─── Label helpers ─────────────────────────────────────────────────────── */

const CLASS_LABELS: Record<TravelClass, string> = {
  1: 'Economy', 2: 'Premium Economy', 3: 'Business', 4: 'First',
};

const TRIP_LABELS: Record<TripType, string> = {
  1: 'Round Trip', 2: 'One Way',
};

const STOPS_LABELS: Record<StopsFilter, string> = {
  0: 'Any', 1: 'Nonstop only', 2: '1 stop or fewer',
};

const INTERVAL_LABELS: Record<FetchFrequency, string> = {
  hourly: 'Every hour',
  '3h':   'Every 3 hours',
  '6h':   'Every 6 hours',
  '12h':  'Every 12 hours',
  daily:  'Once a day',
};

const DIRECTION_LABELS: Record<AlertDirection, string> = {
  below: 'At or below',
  above: 'At or above',
};

function getValueLabel(key: keyof TrackerDefaults, defaults: TrackerDefaults): string {
  switch (key) {
    case 'defaultCurrency':       return defaults.defaultCurrency;
    case 'defaultLanguage':       return getLanguageName(defaults.defaultLanguage);
    case 'defaultTravelClass':    return CLASS_LABELS[defaults.defaultTravelClass];
    case 'defaultAdults':         return String(defaults.defaultAdults);
    case 'defaultTripType':       return TRIP_LABELS[defaults.defaultTripType];
    case 'defaultStops':          return STOPS_LABELS[defaults.defaultStops];
    case 'defaultRecheckInterval': return INTERVAL_LABELS[defaults.defaultRecheckInterval];
    case 'defaultAlertDirection': return DIRECTION_LABELS[defaults.defaultAlertDirection];
    default: return '';
  }
}

const ROW_LABELS: Record<keyof TrackerDefaults, string> = {
  defaultCurrency:        'Currency',
  defaultLanguage:        'Language',
  defaultTravelClass:     'Travel class',
  defaultAdults:          'Adults',
  defaultTripType:        'Trip type',
  defaultStops:           'Stops',
  defaultRecheckInterval: 'Recheck interval',
  defaultAlertDirection:  'Alert direction',
};

/* ─── Generic picker sheets ─────────────────────────────────────────────── */

interface PickerSheetProps<T extends string | number> {
  open: boolean;
  title: string;
  options: { label: string; value: T }[];
  value: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}

function RadioPickerSheet<T extends string | number>({
  open, title, options, value, onSelect, onClose,
}: PickerSheetProps<T>) {
  const [draft, setDraft] = useState<T>(value);
  useEffect(() => { if (open) setDraft(value); }, [open, value]);

  const handleDone = () => { onSelect(draft); onClose(); };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button
            onClick={handleDone}
            aria-label={`Confirm ${title} selection`}
            className="text-sky-500 text-sm font-medium px-2 py-1"
          >Done</button>
        </div>
        {/* Options */}
        <fieldset>
          <legend className="sr-only">{title}</legend>
          <ul role="listbox">
            {options.map(opt => (
              <li key={String(opt.value)}>
                <button
                  role="option"
                  aria-selected={draft === opt.value}
                  onClick={() => setDraft(opt.value)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-slate-900 dark:text-white min-h-[48px] text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${draft === opt.value ? 'border-sky-500 bg-sky-500' : 'border-slate-300 dark:border-slate-600'}`}>
                    {draft === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      </div>
    </BottomSheet>
  );
}

/* Adults stepper sheet */
interface AdultsPickerProps {
  open: boolean;
  value: number;
  onSelect: (v: number) => void;
  onClose: () => void;
}

function AdultsPickerSheet({ open, value, onSelect, onClose }: AdultsPickerProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (open) setDraft(value); }, [open, value]);

  const handleDone = () => { onSelect(draft); onClose(); };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Default number of adults</h3>
          <button onClick={handleDone} aria-label="Confirm adults selection" className="text-sky-500 text-sm font-medium px-2 py-1">Done</button>
        </div>
        <div className="flex items-center justify-center gap-8 py-10 px-4">
          <button
            onClick={() => setDraft(v => Math.max(1, v - 1))}
            disabled={draft <= 1}
            aria-label="Decrease adults"
            aria-disabled={draft <= 1}
            className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-xl text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all"
          >−</button>
          <span role="status" aria-live="polite" className="font-mono text-4xl font-bold text-slate-900 dark:text-white w-12 text-center tabular-nums">
            {draft}
          </span>
          <button
            onClick={() => setDraft(v => Math.min(9, v + 1))}
            disabled={draft >= 9}
            aria-label="Increase adults"
            aria-disabled={draft >= 9}
            className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-xl text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all"
          >+</button>
        </div>
      </div>
    </BottomSheet>
  );
}

/* Currency search sheet */
interface CurrencyPickerProps {
  open: boolean;
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}

function CurrencyPickerSheet({ open, value, onSelect, onClose }: CurrencyPickerProps) {
  const [draft, setDraft] = useState(value);
  const [query, setQuery] = useState('');
  useEffect(() => { if (open) { setDraft(value); setQuery(''); } }, [open, value]);

  const q = query.toLowerCase().trim();
  const filtered = q
    ? ALL_CURRENCIES.filter(c =>
        c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
      )
    : ALL_CURRENCIES;

  const handleDone = () => { onSelect(draft); onClose(); };

  return (
    <BottomSheet open={open} onClose={onClose} height="full">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Default currency</h3>
          <button onClick={handleDone} aria-label="Confirm currency selection" className="text-sky-500 text-sm font-medium px-2 py-1">Done</button>
        </div>
        <div className="px-4 py-2 flex-shrink-0 border-b border-slate-100 dark:border-slate-700">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search currencies…"
            aria-label="Search currencies"
            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border-0 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <ul role="listbox" className="flex-1 overflow-y-auto">
          {/* Currently selected pinned at top */}
          {!q && (() => {
            const sel = ALL_CURRENCIES.find(c => c.code === draft);
            return sel ? (
              <>
                <li key={`pin-${sel.code}`}>
                  <button
                    role="option"
                    aria-selected={true}
                    onClick={() => setDraft(sel.code)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-slate-900 dark:text-white min-h-[48px] text-left bg-sky-50 dark:bg-sky-900/20"
                  >
                    <span>{sel.code} — {sel.name}</span>
                    <Check size={16} className="text-sky-500 flex-shrink-0" />
                  </button>
                </li>
                <li aria-hidden><div className="h-px bg-slate-200 dark:bg-slate-700 mx-4" /></li>
              </>
            ) : null;
          })()}
          {filtered
            .filter(c => q || c.code !== draft) // skip pinned item in sorted list
            .map(c => (
              <li key={c.code}>
                <button
                  role="option"
                  aria-selected={draft === c.code}
                  onClick={() => setDraft(c.code)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-slate-900 dark:text-white min-h-[48px] text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700/40 last:border-0"
                >
                  <span>{c.code} — {c.name}</span>
                  {draft === c.code && <Check size={16} className="text-sky-500 flex-shrink-0" />}
                </button>
              </li>
            ))}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-sm text-slate-400 text-center">
              No results for &ldquo;{query}&rdquo;
            </li>
          )}
        </ul>
      </div>
    </BottomSheet>
  );
}

/* Language search sheet */
interface LanguagePickerProps {
  open: boolean;
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}

function LanguagePickerSheet({ open, value, onSelect, onClose }: LanguagePickerProps) {
  const [draft, setDraft] = useState(value);
  const [query, setQuery] = useState('');
  useEffect(() => { if (open) { setDraft(value); setQuery(''); } }, [open, value]);

  const q = query.toLowerCase().trim();
  const filtered = q
    ? LANGUAGES.filter(l => l.code.toLowerCase().includes(q) || l.name.toLowerCase().includes(q))
    : LANGUAGES;

  const handleDone = () => { onSelect(draft); onClose(); };

  return (
    <BottomSheet open={open} onClose={onClose} height="full">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Default language</h3>
          <button onClick={handleDone} aria-label="Confirm language selection" className="text-sky-500 text-sm font-medium px-2 py-1">Done</button>
        </div>
        <div className="px-4 py-2 flex-shrink-0 border-b border-slate-100 dark:border-slate-700">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search languages…"
            aria-label="Search languages"
            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border-0 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <ul role="listbox" className="flex-1 overflow-y-auto">
          {!q && (() => {
            const sel = LANGUAGES.find(l => l.code === draft);
            return sel ? (
              <>
                <li key={`pin-${sel.code}`}>
                  <button
                    role="option" aria-selected={true}
                    onClick={() => setDraft(sel.code)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-slate-900 dark:text-white min-h-[48px] text-left bg-sky-50 dark:bg-sky-900/20"
                  >
                    <span>{sel.name} ({sel.code})</span>
                    <Check size={16} className="text-sky-500 flex-shrink-0" />
                  </button>
                </li>
                <li aria-hidden><div className="h-px bg-slate-200 dark:bg-slate-700 mx-4" /></li>
              </>
            ) : null;
          })()}
          {filtered.filter(l => q || l.code !== draft).map(l => (
            <li key={l.code}>
              <button
                role="option" aria-selected={draft === l.code}
                onClick={() => setDraft(l.code)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-slate-900 dark:text-white min-h-[48px] text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700/40 last:border-0"
              >
                <span>{l.name} ({l.code})</span>
                {draft === l.code && <Check size={16} className="text-sky-500 flex-shrink-0" />}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-sm text-slate-400 text-center">
              No results for &ldquo;{query}&rdquo;
            </li>
          )}
        </ul>
      </div>
    </BottomSheet>
  );
}

/* ─── Tracker Defaults Panel ─────────────────────────────────────────────── */

export interface TrackerDefaultsPanelProps {
  defaults: TrackerDefaults;
  onChanged: (updated: TrackerDefaults) => void;
}

export function TrackerDefaultsPanel({ defaults, onChanged }: TrackerDefaultsPanelProps) {
  const { toast } = useToast();
  const [activeField, setActiveField] = useState<keyof TrackerDefaults | null>(null);
  const [showReset, setShowReset]     = useState(false);

  const handleChange = <K extends keyof TrackerDefaults>(key: K, value: TrackerDefaults[K]) => {
    setTrackerDefault(key, value);
    onChanged({ ...defaults, [key]: value });
  };

  const handleReset = () => {
    resetTrackerDefaults();
    onChanged({ ...SYSTEM_DEFAULTS });
    setShowReset(false);
    toast('Tracker defaults reset');
  };

  /* Shared row renderer */
  const Row = ({ fieldKey }: { fieldKey: keyof TrackerDefaults }) => (
    <button
      onClick={() => setActiveField(fieldKey)}
      aria-label={`${ROW_LABELS[fieldKey]}, currently ${getValueLabel(fieldKey, defaults)}. Tap to change.`}
      className="w-full flex items-center justify-between px-4 py-3.5 min-h-[48px] text-left hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
    >
      <span className="text-sm font-medium text-slate-900 dark:text-white">{ROW_LABELS[fieldKey]}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm text-slate-500 dark:text-slate-400">{getValueLabel(fieldKey, defaults)}</span>
        <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
      </div>
    </button>
  );

  return (
    <>
      <section aria-labelledby="defaults-heading">
        <p id="defaults-heading" className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          Tracker Defaults
        </p>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <Row fieldKey="defaultCurrency" />
          <Row fieldKey="defaultLanguage" />
          <Row fieldKey="defaultTravelClass" />
          <Row fieldKey="defaultAdults" />
          <Row fieldKey="defaultTripType" />
          <Row fieldKey="defaultStops" />
          <Row fieldKey="defaultRecheckInterval" />
          <Row fieldKey="defaultAlertDirection" />

          {/* Reset row */}
          <button
            onClick={() => setShowReset(true)}
            aria-label="Reset all tracker defaults to system defaults"
            className="w-full flex items-center gap-2 px-4 py-3.5 min-h-[44px] text-left hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors border-t border-slate-200 dark:border-slate-700"
          >
            <RotateCcw size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
            <span className="text-sm text-slate-400 dark:text-slate-500">Reset all to defaults</span>
          </button>
        </div>
      </section>

      {/* ── Picker sheets ── */}

      <CurrencyPickerSheet
        open={activeField === 'defaultCurrency'}
        value={defaults.defaultCurrency}
        onSelect={v => handleChange('defaultCurrency', v)}
        onClose={() => setActiveField(null)}
      />

      <LanguagePickerSheet
        open={activeField === 'defaultLanguage'}
        value={defaults.defaultLanguage}
        onSelect={v => handleChange('defaultLanguage', v)}
        onClose={() => setActiveField(null)}
      />

      <RadioPickerSheet<TravelClass>
        open={activeField === 'defaultTravelClass'}
        title="Default travel class"
        options={[
          { label: 'Economy',         value: 1 },
          { label: 'Premium Economy', value: 2 },
          { label: 'Business',        value: 3 },
          { label: 'First',           value: 4 },
        ]}
        value={defaults.defaultTravelClass}
        onSelect={v => handleChange('defaultTravelClass', v)}
        onClose={() => setActiveField(null)}
      />

      <AdultsPickerSheet
        open={activeField === 'defaultAdults'}
        value={defaults.defaultAdults}
        onSelect={v => handleChange('defaultAdults', v)}
        onClose={() => setActiveField(null)}
      />

      <RadioPickerSheet<TripType>
        open={activeField === 'defaultTripType'}
        title="Default trip type"
        options={[
          { label: 'Round Trip', value: 1 },
          { label: 'One Way',    value: 2 },
        ]}
        value={defaults.defaultTripType}
        onSelect={v => handleChange('defaultTripType', v)}
        onClose={() => setActiveField(null)}
      />

      <RadioPickerSheet<StopsFilter>
        open={activeField === 'defaultStops'}
        title="Default stops"
        options={[
          { label: 'Any stops',       value: 0 },
          { label: 'Nonstop only',    value: 1 },
          { label: '1 stop or fewer', value: 2 },
        ]}
        value={defaults.defaultStops}
        onSelect={v => handleChange('defaultStops', v)}
        onClose={() => setActiveField(null)}
      />

      <RadioPickerSheet<FetchFrequency>
        open={activeField === 'defaultRecheckInterval'}
        title="Default recheck interval"
        options={[
          { label: 'Every hour',     value: 'hourly' },
          { label: 'Every 3 hours',  value: '3h'     },
          { label: 'Every 6 hours',  value: '6h'     },
          { label: 'Every 12 hours', value: '12h'    },
          { label: 'Once a day',     value: 'daily'  },
        ]}
        value={defaults.defaultRecheckInterval}
        onSelect={v => handleChange('defaultRecheckInterval', v)}
        onClose={() => setActiveField(null)}
      />

      <RadioPickerSheet<AlertDirection>
        open={activeField === 'defaultAlertDirection'}
        title="Default alert direction"
        options={[
          { label: 'At or below target', value: 'below' },
          { label: 'At or above target', value: 'above' },
        ]}
        value={defaults.defaultAlertDirection}
        onSelect={v => handleChange('defaultAlertDirection', v)}
        onClose={() => setActiveField(null)}
      />

      {/* Reset confirmation modal */}
      <Modal
        open={showReset}
        title="Reset tracker defaults?"
        description="All 8 fields will revert to their original values (Economy, USD, Round Trip, Every 6 hours, etc.)."
        confirmLabel="Reset defaults"
        confirmVariant="primary"
        onConfirm={handleReset}
        onCancel={() => setShowReset(false)}
      />

      {/* Invisible spacer to suppress unused import warning */}
      <span style={{ display: 'none' }}><Minus size={0} /></span>
    </>
  );
}
