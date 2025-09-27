import React, { useEffect } from 'react';
import clsx from 'clsx';

const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-[96vw]',
};

export default function Modal({
                                  open,
                                  onClose,
                                  title,
                                  children,
                                  footer,
                                  size = '4xl',                  // default wider
                                  panelClassName = '',
                                  bodyClassName = '',
                                  footerClassName = '',
                                  hideClose = false,
                              }) {
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => (document.body.style.overflow = prev);
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50"
            aria-modal="true"
            role="dialog"
            onMouseDown={(e) => {
                // close when clicking backdrop
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-100 transition-opacity" />

            {/* Panel */}
            <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
                <div
                    className={clsx(
                        'w-full',
                        sizeMap[size] || sizeMap['4xl'],
                        'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl ring-1 ring-black/5',
                        'transition-all duration-200 ease-out',
                        'max-h-[85vh] flex flex-col',
                        panelClassName
                    )}
                >
                    {/* Header */}
                    {(title || !hideClose) && (
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                            {!hideClose && (
                                <button
                                    onClick={onClose}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                                    aria-label="Close"
                                >
                                    <span className="text-2xl leading-none">×</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Body */}
                    <div className={clsx('px-5 py-5 overflow-y-auto', bodyClassName)}>
                        {children}
                    </div>

                    {/* Footer */}
                    {footer !== null && (
                        <div className={clsx(
                            'px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2',
                            footerClassName
                        )}>
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
