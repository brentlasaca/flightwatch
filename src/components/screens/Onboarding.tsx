'use client';
import { useState } from 'react';
import { KeyRound, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { validateApiKey } from '@/lib/serpapi';
import { saveApiKey } from '@/lib/crypto';
import { Button } from '@/components/ui/Button';
import { FlightwatchLogoMark } from '@/components/ui/FlightwatchLogo';
import { useApp } from '@/context/AppContext';

export function Onboarding() {
  const { navigate } = useApp();
  const [key, setKey]         = useState('');
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleConnect = async () => {
    if (!key.trim()) return;
    setLoading(true);
    setError('');
    const result = await validateApiKey(key.trim());
    setLoading(false);
    if (result.valid) {
      saveApiKey(key.trim());
      navigate('home');
    } else if (result.quotaExhausted) {
      setError('This key has no remaining credits. Add credits at serpapi.com, then try again.');
    } else {
      setError(result.error || "That key didn't work. Check it and try again.");
    }
  };

  return (
    <div className="min-h-dvh bg-slate-900 flex flex-col items-center justify-center px-6 py-12">
      {/* Brand — logo mark + wordmark with entrance animation */}
      <div className="flex flex-col items-center mb-10 logo-entrance">
        <div className="w-24 h-24 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-5 shadow-xl">
          {/* Dark logo mark at 80px, centered in container */}
          <FlightwatchLogoMark size={60} className="dark" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Flightwatch</h1>
        <p className="text-slate-400 text-sm mt-2 text-center leading-relaxed">
          Track fares. Fly smart.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-2xl">
        <p className="text-sm text-slate-400 mb-1 leading-relaxed">
          To get started, enter your{' '}
          <a
            href="https://serpapi.com/manage-api-key"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 underline underline-offset-2 inline-flex items-center gap-0.5"
          >
            SerpAPI key <ExternalLink size={11} />
          </a>
          . Your key is stored only on this device.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor="apikey" className="text-sm font-medium text-slate-300 block mb-1.5">
              Your API key
            </label>
            <div className="relative">
              <input
                id="apikey"
                type={show ? 'text' : 'password'}
                value={key}
                placeholder="Paste your SerpAPI key…"
                onChange={e => { setKey(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
                autoComplete="off"
                className={`w-full px-3 py-3 pr-10 text-sm rounded-lg bg-slate-900 border text-white placeholder-slate-600
                  focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-colors
                  ${error ? 'border-red-500' : 'border-slate-600'}`}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <KeyRound size={12} className="flex-shrink-0" />
            Stored securely on your device only
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={!key.trim()}
            onClick={handleConnect}
          >
            Connect Flightwatch
          </Button>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-600 text-center">
        No account required · Works offline · Free to install
      </p>
    </div>
  );
}
