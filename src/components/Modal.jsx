import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
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
        const currentCount = Number(document.body.dataset.modalOpenCount || '0');
        document.body.dataset.modalOpenCount = String(currentCount + 1);
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        return () => {
            const nextCount = Math.max(0, Number(document.body.dataset.modalOpenCount || '1') - 1);
            document.body.dataset.modalOpenCount = String(nextCount);
            if (nextCount === 0) {
                document.body.classList.remove('modal-open');
                delete document.body.dataset.modalOpenCount;
            }
            document.body.style.overflow = prev;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    const modal = (
        <div
            className="fixed inset-0 z-[1000]"
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
            <div className="absolute inset-0 flex items-end justify-center p-2 sm:items-center sm:p-6">
                <div
                    className={clsx(
                        'w-full',
                        sizeMap[size] || sizeMap['4xl'],
                        'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl ring-1 ring-black/5',
                        'transition-all duration-200 ease-out',
                        // Prefer dynamic viewport units when supported to avoid mobile "100vh" issues.
                        // `!` ensures `dvh` wins when valid; when unsupported the declaration is ignored.
                        'max-h-[calc(100vh-1rem)] !max-h-[calc(100dvh-1rem)]',
                        'sm:max-h-[85vh] sm:!max-h-[85dvh]',
                        'flex flex-col overflow-hidden',
                        panelClassName
                    )}
                >
                    {/* Header */}
                    {(title || !hideClose) && (
                        <div className="shrink-0 px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                            {!hideClose && (
                                <button
                                    onClick={onClose}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                                    aria-label="Close"
                                >
                                    <span className="text-2xl leading-none">&times;</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Body */}
                    <div className={clsx('flex-1 min-h-0 px-4 py-4 sm:px-5 sm:py-5 overflow-y-auto overscroll-contain', bodyClassName)}>
                        {children}
                    </div>

                    {/* Footer */}
                    {footer !== null && (
                        <div className={clsx(
                            // Safe-area padding keeps actions visible on devices with a home indicator.
                            'shrink-0 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-end gap-2',
                            footerClassName
                        )}>
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
