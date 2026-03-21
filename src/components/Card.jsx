import React from 'react';

// Simple card wrapper
const Card = ({ children, className = '', ...rest }) => {
  return (
      <div
          className={`modern-enter rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-md p-4 shadow-[0_10px_30px_-16px_rgba(15,23,42,0.35)] dark:border-slate-700/70 dark:bg-slate-900/65 ${className}`}
          {...rest}
      >
        {children}
      </div>
  );
};
export default Card;
