import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Tabs = ({ tabs, initial = tabs?.[0]?.key, active: controlledActive, onChange, children }) => {
    const [internalActive, setInternalActive] = useState(initial);
    const active = controlledActive ?? internalActive;
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const map = useMemo(() => {
        const obj = {};
        React.Children.forEach(children, (child) => {
            if (!React.isValidElement(child)) return;
            const k = child.props['data-tab'];
            if (k) obj[k] = child;
        });
        return obj;
    }, [children]);

    const updateScrollState = () => {
        const el = scrollRef.current;
        if (!el) {
            setCanScrollLeft(false);
            setCanScrollRight(false);
            return;
        }
        const maxLeft = el.scrollWidth - el.clientWidth;
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(maxLeft - el.scrollLeft > 4);
    };

    useEffect(() => {
        updateScrollState();
        const onResize = () => updateScrollState();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [tabs]);

    useEffect(() => {
        updateScrollState();
    }, [active]);

    const scrollTabs = (direction) => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollBy({ left: direction * 220, behavior: 'smooth' });
    };

    return (
        <div>
            <div className="relative mb-4">
                {canScrollLeft ? (
                    <>
                        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white to-transparent dark:from-gray-950" />
                        <button
                            type="button"
                            onClick={() => scrollTabs(-1)}
                            className="absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-gray-200 bg-white/90 p-1 text-gray-600 shadow-sm transition hover:text-primary dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300"
                            aria-label="Scroll tabs left"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    </>
                ) : null}

                {canScrollRight ? (
                    <>
                        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent dark:from-gray-950" />
                        <button
                            type="button"
                            onClick={() => scrollTabs(1)}
                            className="absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-gray-200 bg-white/90 p-1 text-gray-600 shadow-sm transition hover:text-primary dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300"
                            aria-label="Scroll tabs right"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </>
                ) : null}

                <div
                    ref={scrollRef}
                    onScroll={updateScrollState}
                    className="overflow-x-auto border-b border-gray-200 pr-10 dark:border-gray-700"
                >
                    <div className="flex min-w-max gap-2">
                        {tabs.map((t) => {
                            const isActive = t.key === active;
                            return (
                                <button
                                    key={t.key}
                                    onClick={() => {
                                        if (controlledActive === undefined) setInternalActive(t.key);
                                        onChange?.(t.key);
                                    }}
                                    className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm -mb-px border-b-2 ${
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
                </div>
            </div>
            <div>{map[active] || null}</div>
        </div>
    );
};

export default Tabs;
