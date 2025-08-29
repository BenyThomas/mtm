import React, { useMemo } from 'react';

const Sparkline = ({ data = [], width = 160, height = 36, strokeWidth = 2 }) => {
    // Build SVG points
    const d = useMemo(() => {
        if (!data || data.length < 2) return null;

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const step = width / (data.length - 1);

        const points = data.map((v, i) => {
            const x = i * step;
            // In SVG, y=0 is top; we want higher values up => invert
            const y = height - ((v - min) / range) * height;
            return `${x},${y}`;
        });

        return points.join(' ');
    }, [data, width, height]);

    // If no usable data, render a faint baseline
    const noData = !d;

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="overflow-visible"
            aria-hidden="true"
        >
            {noData ? (
                <line
                    x1="0"
                    y1={height - 2}
                    x2={width}
                    y2={height - 2}
                    className="stroke-current text-gray-300 dark:text-gray-600"
                    strokeWidth={strokeWidth}
                    strokeDasharray="4,4"
                />
            ) : (
                <polyline
                    fill="none"
                    className="stroke-current text-secondary"
                    points={d}
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            )}
        </svg>
    );
};

export default Sparkline;
