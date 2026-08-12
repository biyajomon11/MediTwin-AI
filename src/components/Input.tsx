import React, { forwardRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, rightElement, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-gray-300 uppercase tracking-wider"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-gray-400 pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full py-3 text-sm text-white placeholder-gray-400 bg-white/5 border border-white/15 rounded-xl transition-all duration-200 focus:outline-none focus:bg-white/10 focus:border-accent focus:ring-2 focus:ring-accent/30',
                icon ? 'pl-10' : 'pl-4',
                rightElement ? 'pr-11' : 'pr-4',
                error && 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30 bg-rose-500/5',
                className
              )
            )}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-3.5 flex items-center justify-center">
              {rightElement}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-xs text-rose-400 font-medium flex items-center gap-1 animate-fadeIn">
            <span>⚠</span> {error}
          </p>
        ) : helperText ? (
          <p className="text-[11px] text-gray-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
