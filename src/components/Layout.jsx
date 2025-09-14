// src/components/Layout.jsx
import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

/** Reusable button styles via utility classes (Windi/Tailwind) */
const ButtonLike = ({ children, className = '', ...props }) => (
    <button
        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ${className}`}
        {...props}
    >
      {children}
    </button>
);

/** Sidebar link with active styling */
const SideLink = ({ to, icon, label, onClick }) => (
    <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-md text-sm
       focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
       ring-offset-white dark:ring-offset-gray-900
       ${isActive
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'}`
        }
    >
      <span className="w-5 text-center">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
);

/**
 * NAV GROUPS
 * - Added "Organization" group as requested.
 * - Kept existing Main, Accounting, and Config groups.
 * - Update paths if your routes differ.
 */
const NAV_GROUPS = [
  {
    title: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: '🏠' },
      { to: '/clients', label: 'Clients', icon: '👥' },
      { to: '/loans', label: 'Loans', icon: '💳' },
      { to: '/reports', label: 'Reports', icon: '📊' },
    ],
  },
  {
    title: 'Teller', // NEW GROUP
    items: [
      { to: '/tellers', label: 'Tellers', icon: '🏧' },
    ],
  },
  {
    title: 'Organization', // ← NEW GROUP
    items: [
      { to: '/offices', label: 'Offices', icon: '🏢' },
      { to: '/staff', label: 'Staff', icon: '🧑‍💼' },
      { to: '/config/business-dates', label: 'Business Dates', icon: '📅' },
      { to: '/config/holidays', label: 'Holidays', icon: '🎌' },
      { to: '/organization/working-days', label: 'Working Days', icon: '📅' },
      { to: '/collateral-management', label: 'Collateral Catalog', icon: '🧱' }

    ],
  },
  {
    title: 'Products',
    items: [
      { to: '/products/charges', label: 'Charges', icon: '💸' }, // NEW
      { to: '/loan-products', label: 'Products', icon: '🔖' }, // NEW
    ],
  },
  {
    title: 'Accounting',
    items: [
      { to: '/accounting/gl-accounts', label: 'GL Accounts', icon: '🧾' },
      { to: '/accounting/journal-entries', label: 'Journal Entries', icon: '📒' },
      { to: '/accounting/accounting-rules', label: 'Accounting Rules', icon: '🧩' },
      { to: '/accounting/closures', label: 'GL Closures', icon: '🔒' },
      { to: '/accounting/provisioning-criteria', label: 'Provisioning Criteria', icon: '🧮' },
      { to: '/accounting/financial-activity-mappings', label: 'FA ↔ GL Mapping', icon: '🔗' },
      { to: '/accounting/accruals', label: 'Run Accruals', icon: '⏱️' },
      { to: '/accounting/transfers', label: 'Account Transfers', icon: '🔁' }, // NEW
      { to: '/accounting/standing-instructions', label: 'Standing Instructions', icon: '📜' },
      { to: '/accounting/standing-instructions-history', label: 'Standing Instr. History', icon: '🕘' },
      { to: '/delinquency/ranges',  label: 'Delinquency Ranges',  icon: '📊' },
      { to: '/delinquency/buckets', label: 'Delinquency Buckets', icon: '🧺' },
      { to: '/accounting/tax-groups', label: 'Tax Groups', icon: '🧾' },
    ],
  },
  {
    title: 'Shares',
    items: [
      { to: '/shares', label: 'Share Accounts', icon: '📈' }, // NEW
    ],
  },

  {
    title: 'SyS Config',
    items: [
      { to: '/config/currencies', label: 'Currencies', icon: '💱' },
      { to: '/config/codes', label: 'Codes', icon: '🏷️' },
      { to: '/config/code-values', label: 'Code Values', icon: '🧷' },
      { to: '/config/datatables', label: 'Data Tables', icon: '📋' },
      { to: '/config/entity-datatable-checks', label: 'Entity Datatable Checks', icon: '✅' },
      { to: '/config/external-services', label: 'External Services', icon: '🔌' },
      { to: '/config/externalevents', label: 'External Events', icon: '📡' },
      { to: '/config/global-config', label: 'Global Config', icon: '⚙️' },
      { to: '/config/audits', label: 'Audits', icon: '🔍' },
      { to: '/config/reports', label: 'Reports', icon: '🧾' },
      { to: '/config/hooks', label: 'Hooks', icon: '🪝' },
      { to: '/config/instance-mode', label: 'Instance Mode', icon: '🧭' },
      { to: '/config/jobs', label: 'Scheduler Jobs', icon: '⏲️' },
      { to: '/config/report-mailing-jobs', label: 'Report Mailing', icon: '✉️' },
      { to: '/config/field-config', label: 'Entity Field Config', icon: '🧩' },
    ],
  },
];

const Layout = () => {
  const [open, setOpen] = useState(false);

  return (
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <ButtonLike
                  className="md:hidden"
                  aria-label="Toggle Menu"
                  onClick={() => setOpen((v) => !v)}
              >
                ☰
              </ButtonLike>
              <div className="font-semibold truncate">Money Trust Microfinance</div>
            </div>
            <div className="flex items-center gap-2">
              {/* space for theme toggle / tenant switcher / user menu */}
            </div>
          </div>
        </header>

        {/* Content area with sidebar */}
        <div className="flex">
          {/* Sidebar */}
          <aside
              className={`fixed md:sticky top-14 md:top-14 z-20 w-72 shrink-0
                      bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
                      h-[calc(100vh-3.5rem)]
                      ${open ? 'block' : 'hidden md:block'}`}
          >
            {/* Scrollable nav */}
            <nav className="h-full overflow-y-auto overscroll-contain px-3 py-3 space-y-6">
              {NAV_GROUPS.map((group) => (
                  <div key={group.title}>
                    <div className="px-3 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                      {group.title}
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                          <SideLink
                              key={item.to}
                              to={item.to}
                              icon={item.icon}
                              label={item.label}
                              onClick={() => setOpen(false)}
                          />
                      ))}
                    </div>
                  </div>
              ))}
            </nav>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0 md:ml-0">
            <div className="max-w-7xl mx-auto w-full p-4">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
  );
};

export default Layout;
