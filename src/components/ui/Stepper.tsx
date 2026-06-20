
'use client';

interface StepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}

export function Stepper({ label, value, min = 0, max = 9, onChange }: StepperProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-lg font-light text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all"
          aria-label={`Decrease ${label}`}
        >−</button>
        <span className="text-sm font-medium w-4 text-center text-slate-900 dark:text-white">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-600 flex items-center justify-center text-lg font-light text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all"
          aria-label={`Increase ${label}`}
        >+</button>
      </div>
    </div>
  );
}
