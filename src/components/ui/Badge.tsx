
'use client';
import { ReactNode } from 'react';

type BadgeVariant = 'active' | 'paused' | 'alert' | 'error' | 'neutral';

const styles: Record<BadgeVariant, string> = {
  active:  'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
  paused:  'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
  alert:   'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  error:   'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
  neutral: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
};

export function Badge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${styles[variant]}`}>
      {children}
    </span>
  );
}
