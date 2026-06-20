
'use client';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import type { ToastMessage } from '@/types';

const icons: Record<NonNullable<ToastMessage['type']>, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};
const colors: Record<NonNullable<ToastMessage['type']>, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-sky-500',
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map(t => {
        const type = t.type || 'success';
        const Icon = icons[type];
        return (
          <div key={t.id}
            className="pointer-events-auto flex items-center gap-2 bg-white dark:bg-slate-800 shadow-xl rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 max-w-xs w-full"
            onClick={() => dismiss(t.id)}
          >
            <Icon size={16} className={colors[type]} />
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
