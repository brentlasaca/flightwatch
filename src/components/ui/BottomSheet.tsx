
'use client';
import { ReactNode, useEffect } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: 'full' | 'auto';
}

export function BottomSheet({ open, onClose, title, children, height = 'auto' }: BottomSheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl flex flex-col ${height === 'full' ? 'h-[95dvh]' : 'max-h-[95dvh]'}`}>
        <div className="flex-shrink-0 flex flex-col items-center pt-3 pb-0">
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mb-3" />
          {title && (
            <div className="w-full flex items-center justify-between px-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
              <button onClick={onClose} className="text-sky-500 text-sm font-medium p-1">Cancel</button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
