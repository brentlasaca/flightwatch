'use client';
import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

type BaseInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'>;

interface InputProps extends BaseInputProps {
  label?: string;
  error?: string;
  helper?: string;
  suffix?: ReactNode;
  prefix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, suffix, prefix, className = '', id, ...rest }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && <span className="absolute left-3 text-slate-400 dark:text-slate-500 text-sm pointer-events-none">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500
              text-sm px-3 py-3 transition-colors
              border-slate-200 dark:border-slate-600
              focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}
              ${prefix ? 'pl-8' : ''}
              ${suffix ? 'pr-10' : ''}
              ${className}`}
            {...rest}
          />
          {suffix && <span className="absolute right-3 text-slate-400 dark:text-slate-500 pointer-events-none">{suffix}</span>}
        </div>
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        {helper && !error && <p className="text-xs text-slate-400 dark:text-slate-500">{helper}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
