import React from 'react';

// Skeleton placeholder for loading states
const Skeleton = ({ width = '100%', height = '1rem', rounded = false, className = '' }) => {
  return (
      <div
          className={`bg-gray-200 dark:bg-gray-700 animate-pulse ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
          style={{ width, height }}
      />
  );
};
export default Skeleton;
