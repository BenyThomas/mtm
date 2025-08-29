import React from 'react';

// Reusable button with variant & size options
export const Button = ({
                         variant = 'primary',
                         size = 'md',
                         className = '',
                         children,
                         ...rest
                       }) => {
  const base = 'inline-flex items-center justify-center font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2';
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }[size];
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-secondary text-white hover:bg-secondary-dark',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-primary hover:bg-primary-light',
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
