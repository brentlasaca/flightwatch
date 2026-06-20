
'use client';
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { Screen } from '@/types';
import { hasApiKey } from '@/lib/crypto';

interface AppCtx {
  screen: Screen;
  activeTrackerId: string | null;
  quotaExhausted: boolean;
  navigate: (screen: Screen, trackerId?: string) => void;
  goBack: () => void;
  setQuotaExhausted: (v: boolean) => void;
}

const AppContext = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [activeTrackerId, setActiveTrackerId] = useState<string | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [history, setHistory] = useState<Screen[]>([]);

  useEffect(() => {
    if (hasApiKey()) setScreen('home');
  }, []);

  const navigate = useCallback((s: Screen, trackerId?: string) => {
    setHistory(prev => [...prev, screen]);
    setScreen(s);
    if (trackerId !== undefined) setActiveTrackerId(trackerId);
  }, [screen]);

  const goBack = useCallback(() => {
    setHistory(prev => {
      const next = [...prev];
      const prev_screen = next.pop();
      if (prev_screen) setScreen(prev_screen);
      return next;
    });
  }, []);

  return (
    <AppContext.Provider value={{ screen, activeTrackerId, quotaExhausted, navigate, goBack, setQuotaExhausted }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
