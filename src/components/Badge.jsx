import React from 'react';

const tones = {
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
    green: 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100',
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-700 dark:text-emerald-100',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-700 dark:text-orange-100',
    red: 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100',
    cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-700 dark:text-cyan-100',
};

const Badge = ({ tone = 'gray', children }) => {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tones[tone] || tones.gray}`}>
      {children}
    </span>
    );
};

export default Badge;
