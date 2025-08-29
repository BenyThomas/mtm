import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(undefined);

// Toast provider with auto-dismiss and three types (info, success, error)
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);
  return (
      <ToastContext.Provider value={{ addToast }}>
        {children}
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map((toast) => (
              <div
                  key={toast.id}
                  className={`px-4 py-2 rounded shadow text-sm text-white transform transition-all duration-300
              ${toast.type === 'success' && 'bg-green-600'}
              ${toast.type === 'error' && 'bg-red-600'}
              ${toast.type === 'info' && 'bg-blue-600'}
            `}
              >
                {toast.message}
              </div>
          ))}
        </div>
      </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
