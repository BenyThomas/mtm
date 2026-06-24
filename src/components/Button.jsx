import React from 'react';

// Reusable button with variant & size options
export const Button = ({
                         variant = 'primary',
                         size = 'md',
                         className = '',
                         children,
                         ...rest
                       }) => {
  const base = 'app-button inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold rounded-lg border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50';
  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  }[size];
  const variantClasses = {
    primary: 'border-transparent bg-[var(--tenant-primary)] text-white shadow-sm hover:opacity-90 ring-offset-white dark:ring-offset-gray-900',
    secondary: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 ring-offset-white dark:ring-offset-gray-900',
    danger: 'border-transparent bg-red-600 text-white hover:bg-red-700 ring-offset-white dark:ring-offset-gray-900',
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
