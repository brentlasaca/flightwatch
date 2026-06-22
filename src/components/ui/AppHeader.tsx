'use client';
import { ReactNode } from 'react';
import { FlightwatchLogoMark } from './FlightwatchLogo';

interface AppHeaderProps {
  /** Optional element rendered in the right slot (overflow menu, contextual actions, etc.) */
  right?: ReactNode;
}

/**
 * Persistent app header bar with logo mark + wordmark.
 * Renders at 48px height. Shown on Home, TrackerDetail, and Settings.
 * NOT shown on Onboarding or Splash screens.
 */
export function AppHeader({ right }: AppHeaderProps) {
  return (
    <header className="h-12 px-4 flex items-center justify-between bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <FlightwatchLogoMark size={24} />
        <span className="text-base font-semibold text-slate-900 dark:text-white select-none">
          Flightwatch
        </span>
      </div>
      {right && (
        <div className="flex items-center">
          {right}
        </div>
      )}
    </header>
  );
}
