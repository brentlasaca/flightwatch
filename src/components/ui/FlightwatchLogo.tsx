'use client';

/**
 * Inline SVG logo mark — theme-aware via Tailwind dark: classes.
 * Use for header (size=24), onboarding (size=80), empty states (size=64 + opacity).
 * For the splash screen animation, see SplashScreen.tsx which renders its own
 * inline SVG with per-element animation classes.
 */

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function FlightwatchLogoMark({ size = 24, className = '' }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* Outer arc — faded */}
      <path
        d="M 60,180 A 84.85,84.85 0 0,1 180,60"
        className="stroke-slate-900 dark:stroke-white"
        strokeWidth="12"
        opacity="0.15"
      />
      {/* Outer arc — solid */}
      <path
        d="M 180,60 A 84.85,84.85 0 0,1 180,180"
        className="stroke-slate-900 dark:stroke-white"
        strokeWidth="12"
      />
      {/* Inner arc — faded */}
      <path
        d="M 84,156 A 50.91,50.91 0 0,1 156,84"
        className="stroke-slate-900 dark:stroke-white"
        strokeWidth="12"
        opacity="0.4"
      />
      {/* Inner arc — solid */}
      <path
        d="M 156,84 A 50.91,50.91 0 0,1 156,156"
        className="stroke-slate-900 dark:stroke-white"
        strokeWidth="12"
      />
      {/* Center circle */}
      <circle
        cx="120" cy="120" r="14"
        className="stroke-slate-900 dark:stroke-white"
        strokeWidth="12"
      />
      {/* Flight path */}
      <path
        d="M 36,204 L 96,144 L 144,144 L 204,84"
        className="stroke-sky-500 dark:stroke-sky-400"
        strokeWidth="14"
      />
      {/* Blip dot */}
      <circle cx="204" cy="84" r="10" className="fill-sky-500 dark:fill-sky-400" />
    </svg>
  );
}
