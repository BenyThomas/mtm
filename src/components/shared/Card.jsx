import React from 'react';

// Simple card wrapper
const Card = ({ children }) => {
  return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        {children}
      </div>
  );
};
export default Card;
