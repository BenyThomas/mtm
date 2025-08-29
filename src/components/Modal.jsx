import React, { useEffect } from 'react';

const Modal = ({ open, title, children, footer, onClose }) => {
    useEffect(() => {
        const onEsc = (e) => e.key === 'Escape' && onClose?.();
        if (open) document.addEventListener('keydown', onEsc);
        return () => document.removeEventListener('keydown', onEsc);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-lg p-4">
                {title ? <h3 className="text-lg font-semibold mb-3">{title}</h3> : null}
                <div className="max-h-[70vh] overflow-y-auto">{children}</div>
                {footer ? <div className="mt-4 flex justify-end gap-2">{footer}</div> : null}
            </div>
        </div>
    );
};

export default Modal;
