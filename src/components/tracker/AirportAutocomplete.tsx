
'use client';
import {
  useState, useEffect, useRef, useCallback, useId,
  KeyboardEvent,
} from 'react';
import { Search, Loader2, X, WifiOff, Info } from 'lucide-react';
import { getApiKey } from '@/lib/crypto';
import type { AirportSuggestion } from '@/types';

// ─── session-level cache ─────────────────────────────────────────────────────
function cacheKey(q: string) { return `fw_ac_${q.toLowerCase().trim()}`; }
function readCache(q: string): AirportSuggestion[] | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(q));
    return raw ? (JSON.parse(raw) as AirportSuggestion[]) : null;
  } catch { return null; }
}
function writeCache(q: string, data: AirportSuggestion[]) {
  try { sessionStorage.setItem(cacheKey(q), JSON.stringify(data)); } catch { /* quota */ }
}

// ─── types ───────────────────────────────────────────────────────────────────
type ACState =
  | 'idle' | 'typing' | 'fetching' | 'results'
  | 'no-results' | 'confirmed' | 'offline' | 'error';

interface Props {
  label: string;
  value: string;        // IATA code (confirmed)
  displayName: string;  // Full airport name (confirmed)
  onChange: (iata: string, name: string) => void;
  id?: string;
}

// ─── component ───────────────────────────────────────────────────────────────
export function AirportAutocomplete({ label, value, displayName, onChange, id: externalId }: Props) {
  const autoId      = useId();
  const inputId     = externalId ?? `airport-${autoId}`;
  const listboxId   = `${inputId}-listbox`;
  const optionBase  = `${inputId}-opt`;

  const [state,       setState]       = useState<ACState>(value ? 'confirmed' : 'idle');
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState<AirportSuggestion[]>([]);
  const [activeIdx,   setActiveIdx]   = useState(-1);
  const [online,      setOnline]      = useState(true);
  const [errorMsg,    setErrorMsg]    = useState('');

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  // Sync confirmed state when parent changes value externally (swap)
  useEffect(() => {
    if (value) { setState('confirmed'); setQuery(''); }
    else if (state === 'confirmed') { setState('idle'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Online / offline
  useEffect(() => {
    setOnline(navigator.onLine);
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (state === 'results' || state === 'no-results') {
          setState(query.length >= 2 ? 'typing' : 'idle');
        }
      }
    }
    document.addEventListener('mousedown',  handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown',  handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [state, query]);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async (q: string) => {
    if (!online) { setState('offline'); return; }

    const cached = readCache(q);
    if (cached) {
      setSuggestions(cached);
      setState(cached.length > 0 ? 'results' : 'no-results');
      setActiveIdx(-1);
      return;
    }

    setState('fetching');
    const apiKey = getApiKey();
    try {
      const res  = await fetch(`/api/autocomplete?q=${encodeURIComponent(q)}`, {
        headers: apiKey ? { 'x-serpapi-key': apiKey } : {},
        signal:  AbortSignal.timeout(5000),
      });
      const data = await res.json() as { suggestions?: AirportSuggestion[]; error?: string };
      const list = data.suggestions ?? [];
      writeCache(q, list);
      setSuggestions(list);
      setState(list.length > 0 ? 'results' : 'no-results');
      setActiveIdx(-1);
    } catch {
      setState('error');
      setErrorMsg('Search unavailable — enter IATA code directly.');
    }
  }, [online]);

  // ── input change ──────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    setErrorMsg('');
    if (!online)      { setState('offline'); return; }
    if (q.length === 0) { setState('idle');   setSuggestions([]); return; }
    if (q.length < 2)   { setState('typing'); return; }
    setState('fetching');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 300);
  };

  // ── select ────────────────────────────────────────────────────────────────
  const selectSuggestion = useCallback((s: AirportSuggestion) => {
    onChange(s.id, s.name);
    setState('confirmed');
    setQuery('');
    setSuggestions([]);
    setActiveIdx(-1);
  }, [onChange]);

  // ── clear ─────────────────────────────────────────────────────────────────
  const handleClear = () => {
    onChange('', '');
    setState('idle');
    setQuery('');
    setSuggestions([]);
    setActiveIdx(-1);
    setErrorMsg('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // ── keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setState(query.length >= 2 ? 'typing' : 'idle');
      setSuggestions([]);
      return;
    }
    if ((state !== 'results' && state !== 'no-results') || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp')  { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); selectSuggestion(suggestions[activeIdx]); }
  };

  // ── derived ───────────────────────────────────────────────────────────────
  const isOpen     = state === 'results' || state === 'no-results';
  const isFetching = state === 'fetching';
  const isOffline  = state === 'offline';
  const placeholder = isOffline ? 'Offline — enter IATA code (e.g. CEB)' : 'City, airport, or IATA code…';

  // ── render ────────────────────────────────────────────────────────────────
  return (
    // BUG FIX: min-w-0 prevents this flex-1 child from exceeding its allotted width
    <div className="flex-1 min-w-0 flex flex-col gap-1" ref={containerRef}>

      <label htmlFor={inputId} className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </label>

      {/*
        BUG FIX: wrap both the field AND the dropdown in a single `relative` div.
        This makes the dropdown's `top-full` position relative to this wrapper,
        so it appears directly below the field — not at the top of the whole component.
      */}
      <div className="relative">

        {/* ── confirmed display ── */}
        {state === 'confirmed' ? (
          <div
            className="flex items-start px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg min-h-[48px] cursor-pointer w-full overflow-hidden"
            role="button"
            tabIndex={0}
            aria-label={`Selected ${label.toLowerCase()}: ${displayName} (${value}). Tap to change.`}
            onClick={handleClear}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleClear(); }}
          >
            {/* BUG FIX: pr-7 leaves room for the X button; min-w-0 enables truncation */}
            <div className="flex-1 min-w-0 pr-7">
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-white block">{value}</span>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{displayName}</p>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); handleClear(); }}
              aria-label={`Clear ${label.toLowerCase()}`}
              className="flex-shrink-0 ml-1 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          /* ── text input ── */
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
              aria-controls={isOpen ? listboxId : undefined}
              aria-activedescendant={activeIdx >= 0 ? `${optionBase}-${activeIdx}` : undefined}
              aria-busy={isFetching}
              aria-label={label}
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoComplete="off"
              spellCheck={false}
              className={`w-full pl-8 pr-8 py-3 text-sm rounded-lg border
                bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                placeholder-slate-400 dark:placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent
                transition-colors
                ${isOffline
                  ? 'border-dashed border-slate-300 dark:border-slate-600'
                  : 'border-slate-200 dark:border-slate-600'}`}
            />
            {isFetching ? (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
            ) : isOffline ? (
              <WifiOff size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            ) : null}
          </div>
        )}

        {/* ── dropdown — positioned relative to the wrapper above ── */}
        {isOpen && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={`${label} suggestions`}
            className="absolute top-full z-50 mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-52 overflow-y-auto"
          >
            {state === 'no-results' ? (
              <li role="status" className="px-3 py-5 text-sm text-slate-400 dark:text-slate-500 text-center">
                No airports found. Try a different search.
              </li>
            ) : (
              suggestions.map((s, i) => (
                <li
                  key={s.id}
                  id={`${optionBase}-${i}`}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`px-3 py-2.5 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors
                    ${i === activeIdx ? 'bg-slate-50 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white flex-shrink-0">{s.id}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{s.name}</span>
                  </div>
                  {(s.city || s.country) && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {[s.city, s.country].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </div>{/* end relative wrapper */}

      {/* ── credit notice ── */}
      {!isOffline && !errorMsg && state !== 'confirmed' && state !== 'idle' && (
        <p className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
          <Info size={10} className="flex-shrink-0" />
          Airport search uses your SerpAPI credits
        </p>
      )}

      {/* ── error ── */}
      {errorMsg && (
        <p className="text-[10px] text-red-500 dark:text-red-400">{errorMsg}</p>
      )}
    </div>
  );
}
