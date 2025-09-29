import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const labelFor = (seg, prev) => {
    // Static labels
    const map = {
        '': 'Home',
        'clients': 'Clients',
        'loans': 'Loans',
        'loan-products': 'Loan Products',
        'savings': 'Savings',
        'offices': 'Offices',
        'staff': 'Staff',
        'settings': 'Settings',
        'reports': 'Reports',
        'new': 'New',
        'edit': 'Edit',
        'apply': 'Apply',
    };

    if (map[seg]) return map[seg];

    // Heuristic: numeric-like means an entity ID
    if (/^\d+$/.test(seg)) {
        if (prev === 'clients') return `Client #${seg}`;
        if (prev === 'loans') return `Loan #${seg}`;
        if (prev === 'savings') return `Savings #${seg}`;
        if (prev === 'loan-products') return `Product #${seg}`;
        return `#${seg}`;
    }

    // Fallback: title case
    return seg
        .split('-')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
};

const Breadcrumbs = () => {
    const { pathname } = useLocation();
    const parts = pathname.split('/').filter(Boolean);

    const crumbs = [];
    let acc = '';
    for (let i = 0; i < parts.length; i++) {
        const seg = parts[i];
        acc += `/${seg}`;
        const prev = i > 0 ? parts[i - 1] : '';
        crumbs.push({
            to: acc,
            label: labelFor(seg, prev),
            isLast: i === parts.length - 1,
        });
    }

    // Home (/) prefix
    crumbs.unshift({ to: '/', label: 'Home', isLast: parts.length === 0 });

    return (
        <nav aria-label="Breadcrumb" className="text-sm">
            <ol className="flex flex-wrap items-center gap-1 text-gray-600 dark:text-gray-300">
                {crumbs.map((c, idx) => (
                    <li key={c.to} className="flex items-center">
                        {idx > 0 && <span className="mx-2">/</span>}
                        {c.isLast ? (
                            <span className="font-medium text-gray-900 dark:text-gray-100">{c.label}</span>
                        ) : (
                            <Link
                                to={c.to}
                                className="hover:underline hover:text-primary-600 dark:hover:text-primary-400"
                            >
                                {c.label}
                            </Link>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;
