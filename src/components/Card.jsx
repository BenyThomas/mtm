import React from 'react';

// Simple card wrapper
const Card = ({ children, className = '', ...rest }) => {
  return (
      <div
          className={`app-card modern-enter rounded-[10px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 ${className}`}
          {...rest}
      >
        {children}
      </div>
  );
};
export default Card;
