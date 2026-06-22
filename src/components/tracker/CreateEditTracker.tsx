
'use client';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, Info } from 'lucide-react';
import { getDB } from '@/lib/db';
import { estimateDailyApiCalls } from '@/lib/serpapi';
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY, getCurrencySymbol } from '@/data/currencies';
import { AirportAutocomplete } from './AirportAutocomplete';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Stepper } from '@/components/ui/Stepper';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { v4 as uuidv4 } from 'uuid';
import type { Tracker, FlightParams, TripType, TravelClass, FetchFrequency } from '@/types';

interface CreateEditTrackerProps {
  open: boolean;
  onClose: () => void;
  editTracker?: Tracker;
  onSaved: () => void;
}

const FREQUENCIES: { label: string; value: FetchFrequency }[] = [
  { label: 'Hourly',       value: 'hourly' },
  { label: 'Every 3h',    value: '3h'     },
  { label: 'Every 6h',    value: '6h'     },
  { label: 'Every 12h',   value: '12h'    },
  { label: 'Daily',       value: 'daily'  },
];

const CLASS_OPTIONS = [
  { label: 'Economy',    value: 1 as TravelClass },
  { label: 'Prem. Eco', value: 2 as TravelClass },
  { label: 'Business',  value: 3 as TravelClass },
  { label: 'First',     value: 4 as TravelClass },
];

const STOPS_OPTIONS = [
  { label: 'Any stops',       value: 0 },
  { label: 'Nonstop only',    value: 1 },
  { label: '1 stop or fewer', value: 2 },
];

interface FormState {
  name:                string;
  tripType:            TripType;
  departureId:         string;
  departureName:       string;
  arrivalId:           string;
  arrivalName:         string;
  outboundDate:        string;
  returnDate:          string;
  adults:              number;
  children:            number;
  infantsSeat:         number;
  infantsLap:          number;
  travelClass:         TravelClass;
  stops:               number;
  currency:            string;
  targetPrice:         string;
  alertDirection:      'below' | 'above';
  frequency:           FetchFrequency;
}

function nextWeek() { const d = new Date(); d.setDate(d.getDate() + 7);  return d.toISOString().split('T')[0]; }
function twoWeeks() { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0]; }
function today()    { return new Date().toISOString().split('T')[0]; }

const DEFAULT_FORM: FormState = {
  name: '', tripType: 1,
  departureId: '', departureName: '', arrivalId: '', arrivalName: '',
  outboundDate: nextWeek(), returnDate: twoWeeks(),
  adults: 1, children: 0, infantsSeat: 0, infantsLap: 0,
  travelClass: 1, stops: 0, currency: DEFAULT_CURRENCY,
  targetPrice: '', alertDirection: 'below',
  frequency: '6h',
};

export function CreateEditTracker({ open, onClose, editTracker, onSaved }: CreateEditTrackerProps) {
  const [form,   setForm]   = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!open) return;
    if (editTracker) {
      const p = editTracker.params;
      setForm({
        name: editTracker.name || '',
        tripType: p.type,
        departureId: p.departure_id, departureName: p.departure_name || '',
        arrivalId:   p.arrival_id,   arrivalName:   p.arrival_name   || '',
        outboundDate: p.outbound_date,
        returnDate:   p.return_date || twoWeeks(),
        adults: p.adults, children: p.children,
        infantsSeat: p.infants_in_seat, infantsLap: p.infants_on_lap,
        travelClass: p.travel_class, stops: p.stops,
        currency: editTracker.currency,
        targetPrice: String(editTracker.targetPrice),
        alertDirection: editTracker.alertDirection,
        frequency: editTracker.schedule.frequency,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setErrors({});
  }, [open, editTracker]);

  const set = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  }, []);

  const handleSwap = useCallback(() => {
    setForm(prev => ({
      ...prev,
      departureId:   prev.arrivalId,   departureName: prev.arrivalName,
      arrivalId:     prev.departureId, arrivalName:   prev.departureName,
    }));
  }, []);

  const validate = () => {
    const e: typeof errors = {};
    if (!form.departureId) e.departureId = 'Select an origin airport';
    if (!form.arrivalId)   e.arrivalId   = 'Select a destination airport';
    if (form.departureId && form.departureId === form.arrivalId)
      e.arrivalId = 'Destination must differ from origin';
    if (!form.outboundDate)          e.outboundDate = 'Select an outbound date';
    if (form.outboundDate < today()) e.outboundDate = 'Date must be in the future';
    if (form.tripType === 1 && !form.returnDate)
      e.returnDate = 'Select a return date';
    if (form.tripType === 1 && form.returnDate && form.returnDate <= form.outboundDate)
      e.returnDate = 'Return must be after outbound';
    const tp = parseFloat(form.targetPrice);
    if (!form.targetPrice || isNaN(tp) || tp <= 0)
      e.targetPrice = 'Enter a target fare greater than 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const db  = getDB();
      const now = new Date().toISOString();
      const params: FlightParams = {
        departure_id:    form.departureId,
        departure_name:  form.departureName,
        arrival_id:      form.arrivalId,
        arrival_name:    form.arrivalName,
        outbound_date:   form.outboundDate,
        return_date:     form.tripType === 1 ? form.returnDate : undefined,
        type:            form.tripType,
        adults:          form.adults,
        children:        form.children,
        infants_in_seat: form.infantsSeat,
        infants_on_lap:  form.infantsLap,
        travel_class:    form.travelClass,
        stops:           form.stops as 0 | 1 | 2,
        hl:              'en',
      };
      if (editTracker) {
        await db.trackers.update(editTracker.id, {
          name: form.name, params,
          targetPrice: parseFloat(form.targetPrice),
          alertDirection: form.alertDirection,
          currency: form.currency,
          schedule: { frequency: form.frequency },
          updatedAt: now,
        });
      } else {
        await db.trackers.add({
          id: uuidv4(), name: form.name, params,
          targetPrice: parseFloat(form.targetPrice),
          alertDirection: form.alertDirection,
          currency: form.currency,
          schedule: { frequency: form.frequency },
          status: 'active', createdAt: now, updatedAt: now,
        });
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const dailyCalls = estimateDailyApiCalls(form.frequency);
  const canSave    = !!form.departureId && !!form.arrivalId && !!form.outboundDate && !!form.targetPrice;
  const currSymbol = getCurrencySymbol(form.currency);

  return (
    <BottomSheet open={open} onClose={onClose} title={editTracker ? 'Edit tracker' : 'Track a flight'} height="full">
      <div className="flex flex-col gap-0 pb-32">

        {/* ── Name ── */}
        <div className="px-4 pt-4">
          <Input label="Name (optional)" placeholder="e.g. NYC → Tokyo Summer"
            value={form.name} onChange={e => set('name', e.target.value)} />
        </div>

        {/* ── Route ── */}
        <div className="px-4 pt-5">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Route</p>
          <SegmentedControl
            options={[
              { label: 'Round Trip', value: 1 as TripType },
              { label: 'One Way',    value: 2 as TripType },
            ]}
            value={form.tripType}
            onChange={v => set('tripType', v)}
          />
        </div>

        {/* ── Airport fields ── */}
        <div className="px-4 pt-3">
          {/*
            BUG FIX: The swap button is now a sibling element between the two
            AirportAutocomplete instances, not buried inside one of them.
            - `items-end` aligns the button with the bottom of the input fields
              (below the label text on top of each field).
            - Each autocomplete is wrapped in min-w-0 to prevent width overflow.
          */}
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <AirportAutocomplete
                label="From"
                value={form.departureId}
                displayName={form.departureName}
                onChange={(iata, name) => { set('departureId', iata); set('departureName', name); }}
              />
            </div>

            <button
              type="button"
              onClick={handleSwap}
              disabled={!form.departureId && !form.arrivalId}
              aria-label="Swap origin and destination airports"
              className="flex-shrink-0 mb-[2px] w-9 h-9 rounded-full
                bg-slate-100 dark:bg-slate-700
                border border-slate-200 dark:border-slate-600
                flex items-center justify-center
                text-slate-500 dark:text-slate-400
                hover:bg-slate-200 dark:hover:bg-slate-600
                active:scale-95
                disabled:opacity-30 disabled:cursor-not-allowed
                transition-all shadow-sm"
            >
              <ArrowLeftRight size={14} />
            </button>

            <div className="flex-1 min-w-0">
              <AirportAutocomplete
                label="To"
                value={form.arrivalId}
                displayName={form.arrivalName}
                onChange={(iata, name) => { set('arrivalId', iata); set('arrivalName', name); }}
              />
            </div>
          </div>

          {errors.departureId && <p className="text-xs text-red-500 mt-1">{errors.departureId}</p>}
          {errors.arrivalId   && <p className="text-xs text-red-500 mt-1">{errors.arrivalId}</p>}
        </div>

        {/* ── Dates ── */}
        <div className="px-4 pt-3 flex gap-3">
          <div className="flex-1">
            <Input label="Outbound" type="date" value={form.outboundDate} min={today()}
              onChange={e => set('outboundDate', e.target.value)} error={errors.outboundDate} />
          </div>
          {form.tripType === 1 && (
            <div className="flex-1">
              <Input label="Return" type="date" value={form.returnDate} min={form.outboundDate || today()}
                onChange={e => set('returnDate', e.target.value)} error={errors.returnDate} />
            </div>
          )}
        </div>

        {/* ── Passengers ── */}
        <div className="px-4 pt-5">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Passengers</p>
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl px-3 divide-y divide-slate-100 dark:divide-slate-700">
            <Stepper label="Adults"            value={form.adults}      min={1} onChange={v => set('adults',      v)} />
            <Stepper label="Children"          value={form.children}    min={0} onChange={v => set('children',    v)} />
            <Stepper label="Infants (in seat)" value={form.infantsSeat} min={0} onChange={v => set('infantsSeat', v)} />
            <Stepper label="Infants (on lap)"  value={form.infantsLap}  min={0} onChange={v => set('infantsLap',  v)} />
          </div>
        </div>

        {/* ── Preferences ── */}
        <div className="px-4 pt-5">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Preferences</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 block mb-1">Class</label>
              <select value={form.travelClass}
                onChange={e => set('travelClass', Number(e.target.value) as TravelClass)}
                className="w-full px-3 py-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                {CLASS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 block mb-1">Max stops</label>
              <select value={form.stops} onChange={e => set('stops', Number(e.target.value))}
                className="w-full px-3 py-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                {STOPS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 block mb-1">Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)}
                className="w-full px-3 py-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                {CURRENCY_OPTIONS.map((c, i) => (
                  <option key={c.code} value={c.code} disabled={i === 1}>
                    {i === 1 ? '──────────' : `${c.code} — ${c.name}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Alert ── */}
        <div className="px-4 pt-5">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Alert</p>
          <div className="flex gap-2 items-start">
            <div className="w-36">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200 block mb-1">Alert when fare is</label>
              <select value={form.alertDirection}
                onChange={e => set('alertDirection', e.target.value as 'below' | 'above')}
                className="w-full px-3 py-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option value="below">At or below</option>
                <option value="above">At or above</option>
              </select>
            </div>
            <div className="flex-1">
              <Input label="Target price" type="number" inputMode="decimal" placeholder="800"
                prefix={currSymbol}
                value={form.targetPrice} onChange={e => set('targetPrice', e.target.value)}
                error={errors.targetPrice} />
            </div>
          </div>
        </div>

        {/* ── Recheck Interval ── */}
        <div className="px-4 pt-5">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Recheck Interval</p>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200 block mb-1">Check every</label>
          <select value={form.frequency} onChange={e => set('frequency', e.target.value as FetchFrequency)}
            className="w-full px-3 py-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 mb-2">
            {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <div className="flex items-start gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed mb-2">
            <Info size={12} className="flex-shrink-0 mt-0.5" />
            Checked when you open this tracker, open Home, or tap Check now — not on a timer in the background.
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Up to ~{dailyCalls} API call{dailyCalls !== 1 ? 's' : ''}/day
          </p>
        </div>

        <div className="h-4" />
      </div>

      {/* ── Sticky save ── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur border-t border-slate-100 dark:border-slate-700">
        <Button variant="primary" size="lg" className="w-full"
          loading={saving} disabled={!canSave} onClick={handleSave}>
          {editTracker ? 'Save changes' : 'Track this flight'}
        </Button>
      </div>
    </BottomSheet>
  );
}
