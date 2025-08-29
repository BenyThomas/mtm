import React, { createContext, useContext, useState, useCallback } from 'react';

const LoadingContext = createContext(undefined);

// Global loading bar provider; multiple concurrent start calls increment the counter
export const LoadingProvider = ({ children }) => {
  const [count, setCount] = useState(0);
  const start = useCallback(() => setCount((c) => c + 1), []);
  const finish = useCallback(() => setCount((c) => Math.max(c - 1, 0)), []);
  const isLoading = count > 0;
  return (
      <LoadingContext.Provider value={{ start, finish }}>
        <div
            className={`fixed top-0 left-0 right-0 h-0.5 z-50 transition-opacity duration-200 ${
                isLoading ? 'opacity-100' : 'opacity-0'
            }`}
        >
          <div className="h-full w-full overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary-light to-primary-dark animate-shimmer" />
          </div>
        </div>
        {children}
      </LoadingContext.Provider>
  );
};

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useLoading must be used within a LoadingProvider');
  return ctx;
}
