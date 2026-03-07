import React from 'react';

// Reusable button with variant & size options
export const Button = ({
                         variant = 'primary',
                         size = 'md',
                         className = '',
                         children,
                         ...rest
                       }) => {
  const base = 'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50';
  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  }[size];
  const variantClasses = {
    primary: 'border-transparent bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 text-white shadow-[0_12px_24px_-14px_rgba(13,148,136,0.9)] hover:-translate-y-[1px] hover:from-cyan-500 hover:via-teal-500 hover:to-emerald-500 hover:shadow-[0_16px_28px_-14px_rgba(13,148,136,0.95)] ring-offset-white dark:ring-offset-gray-900',
    secondary: 'border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-[1px] hover:bg-slate-100 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 ring-offset-white dark:ring-offset-gray-900',
    danger: 'border-transparent bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-[0_12px_24px_-14px_rgba(225,29,72,0.85)] hover:-translate-y-[1px] hover:from-rose-500 hover:to-red-500 hover:shadow-[0_16px_28px_-14px_rgba(225,29,72,0.95)] ring-offset-white dark:ring-offset-gray-900',
    ghost: 'border-transparent bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 ring-offset-white dark:ring-offset-gray-900',
  }[variant];
  return (
      <button
          className={`${base} ${sizeClasses} ${variantClasses} ${className}`}
          {...rest}
      >
        {children}
      </button>
  );
};
export default Button;
