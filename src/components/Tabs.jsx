import React, { useMemo, useState } from 'react';

const Tabs = ({ tabs, initial = tabs?.[0]?.key, active: controlledActive, onChange, children }) => {
    const [internalActive, setInternalActive] = useState(initial);
    const active = controlledActive ?? internalActive;
    const map = useMemo(() => {
        const obj = {};
        React.Children.forEach(children, (child) => {
            if (!React.isValidElement(child)) return;
            const k = child.props['data-tab'];
            if (k) obj[k] = child;
        });
        return obj;
    }, [children]);

    return (
        <div>
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-4">
                {tabs.map((t) => {
                    const isActive = t.key === active;
                    return (
                        <button
                            key={t.key}
                            onClick={() => {
                                if (controlledActive === undefined) setInternalActive(t.key);
                                onChange?.(t.key);
                            }}
                            className={`px-3 py-2 text-sm -mb-px border-b-2 ${
                                isActive
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-primary'
                            }`}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>
            <div>{map[active] || null}</div>
        </div>
    );
};

export default Tabs;
