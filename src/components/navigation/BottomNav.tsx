
'use client';
import { Radar, Plus, Settings } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { Screen } from '@/types';

interface BottomNavProps { onAddTracker: () => void; }

export function BottomNav({ onAddTracker }: BottomNavProps) {
  const { screen, navigate } = useApp();

  const navTo = (s: Screen) => {
    if (s !== screen) navigate(s);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom)]"
      aria-label="Main navigation">
      <button onClick={() => navTo('home')}
        className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition-colors ${screen === 'home' || screen === 'detail' ? 'text-sky-500' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
        <Radar size={22} />
        <span className="text-[10px] font-medium">Trackers</span>
      </button>

      <button onClick={onAddTracker} aria-label="Track a flight"
        className="flex items-center justify-center w-14 h-10 rounded-full bg-sky-500 hover:bg-sky-600 active:bg-sky-700 active:scale-95 transition-all shadow-lg shadow-sky-500/30">
        <Plus size={22} className="text-white" />
      </button>

      <button onClick={() => navTo('settings')}
        className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition-colors ${screen === 'settings' ? 'text-sky-500' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
        <Settings size={22} />
        <span className="text-[10px] font-medium">Settings</span>
      </button>
    </nav>
  );
}
