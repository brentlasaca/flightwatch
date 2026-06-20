'use client';
import { useEffect, useRef } from 'react';

interface SplashScreenProps {
  onDone: () => void;
}

/**
 * Animated splash screen with radar animation.
 * Total duration: ~1780ms (1480ms + 300ms fade-out).
 * Respects prefers-reduced-motion via CSS.
 */
export function SplashScreen({ onDone }: SplashScreenProps) {
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    // Wait for the CSS splash-exit animation to complete (1480ms delay + 300ms duration)
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="splash-screen fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0F172A]"
      role="status"
      aria-label="Flightwatch loading"
    >
      {/* Animated Logo SVG — 120×120px */}
      <div className="relative" style={{ width: 120, height: 120 }}>
        {/* Conic sweep overlay */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg, rgba(96,165,250,0.18) 0deg 60deg, transparent 60deg 360deg)',
            animation: 'splash-sweep 700ms linear 350ms both',
          }}
        />

        <svg
          viewBox="0 0 240 240"
          width="120"
          height="120"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Outer arc — faded */}
          <path
            d="M 60,180 A 84.85,84.85 0 0,1 180,60"
            stroke="#FFFFFF"
            strokeWidth="12"
            opacity="0.15"
            pathLength="100"
            strokeDasharray="100"
            className="splash-outer-arc-faded"
          />
          {/* Outer arc — solid */}
          <path
            d="M 180,60 A 84.85,84.85 0 0,1 180,180"
            stroke="#FFFFFF"
            strokeWidth="12"
            pathLength="100"
            strokeDasharray="100"
            className="splash-outer-arc-solid"
          />
          {/* Inner arc — faded */}
          <path
            d="M 84,156 A 50.91,50.91 0 0,1 156,84"
            stroke="#FFFFFF"
            strokeWidth="12"
            opacity="0.35"
            pathLength="100"
            strokeDasharray="100"
            className="splash-inner-arc-faded"
          />
          {/* Inner arc — solid */}
          <path
            d="M 156,84 A 50.91,50.91 0 0,1 156,156"
            stroke="#FFFFFF"
            strokeWidth="12"
            pathLength="100"
            strokeDasharray="100"
            className="splash-inner-arc-solid"
          />
          {/* Center circle */}
          <circle
            cx="120" cy="120" r="14"
            stroke="#FFFFFF"
            strokeWidth="12"
            className="splash-center-circle"
          />
          {/* Flight path */}
          <path
            d="M 36,204 L 96,144 L 144,144 L 204,84"
            stroke="#60A5FA"
            strokeWidth="14"
            pathLength="100"
            strokeDasharray="100"
            className="splash-flight-path"
          />
          {/* Blip dot */}
          <circle
            cx="204" cy="84" r="10"
            fill="#60A5FA"
            className="splash-blip"
          />
        </svg>
      </div>

      {/* Wordmark */}
      <p
        className="splash-wordmark mt-6 text-xl font-semibold text-white tracking-tight select-none"
      >
        Flightwatch
      </p>
    </div>
  );
}
