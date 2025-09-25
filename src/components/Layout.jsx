import React, { useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Header from './Header';
import { useAuth } from '../context/AuthContext';

const ButtonLike = ({ children, className = '', ...props }) => (
    <button
        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ${className}`}
        {...props}
    >
      {children}
    </button>
);

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

/** Add perm codes as needed for your deployment */
const NAV_GROUPS = [
  {
    title: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: '🏠' },
      { to: '/clients', label: 'Clients', icon: '👥', perm: 'READ_CLIENT' },
      { to: '/loans', label: 'Loans', icon: '💳', perm: 'READ_LOAN' },
      { to: '/reports', label: 'Reports', icon: '📊', perm: 'READ_REPORT' },
      { to: '/collection-sheet', label: 'Collection Sheet', icon: '🗓️', perm: 'COLLECTION_SHEET' },
      { to: '/search', label: 'Search', icon: '🔎' },
    ],
  },
  {
    title: 'Teller',
    items: [{ to: '/tellers', label: 'Tellers', icon: '🏧', perm: 'READ_TELLER' }],
  },
  {
    title: 'Organization',
    items: [
      { to: '/offices', label: 'Offices', icon: '🏢', perm: 'READ_OFFICE' },
      { to: '/staff', label: 'Staff', icon: '🧑‍💼', perm: 'READ_STAFF' },
      { to: '/users', label: 'Users', icon: '👤', perm: 'READ_USER' },
      { to: '/admin/roles', label: 'Roles', icon: '👥', perm: 'READ_ROLE' },
      { to: '/admin/permissions', label: 'Permissions', icon: '🛡️', perm: 'READ_PERMISSION' },
      { to: '/config/business-dates', label: 'Business Dates', icon: '📅', perm: 'READ_BUSINESS_DATE' },
      { to: '/config/holidays', label: 'Holidays', icon: '🎌', perm: 'READ_HOLIDAY' },
      { to: '/organization/working-days', label: 'Working Days', icon: '📅', perm: 'READ_WORKINGDAYS' },
      { to: '/collateral-management', label: 'Collateral Catalog', icon: '🧱', perm: 'READ_COLLATERAL' },
    ],
  },
  {
    title: 'Products',
    items: [
      { to: '/products/charges', label: 'Charges', icon: '💸', perm: 'READ_CHARGE' },
      { to: '/loan-products', label: 'Loan Products', icon: '🔖', perm: 'READ_LOANPRODUCT' },
    ],
  },
  {
    title: 'Accounting',
    items: [
      { to: '/accounting/gl-accounts', label: 'GL Accounts', icon: '🧾', perm: 'READ_GLACCOUNT' },
      { to: '/accounting/journal-entries', label: 'Journal Entries', icon: '📒', perm: 'READ_JOURNALENTRY' },
      { to: '/accounting/accounting-rules', label: 'Accounting Rules', icon: '🧩', perm: 'READ_ACCOUNTINGRULE' },
      { to: '/accounting/closures', label: 'GL Closures', icon: '🔒', perm: 'READ_GLCLOSURE' },
      { to: '/accounting/provisioning-criteria', label: 'Provisioning Criteria', icon: '🧮', perm: 'READ_PROVISION_CRITERIA' },
      { to: '/accounting/financial-activity-mappings', label: 'FA ↔ GL Mapping', icon: '🔗', perm: 'READ_FINANCIALACTIVITYACCOUNT' },
      { to: '/accounting/accruals', label: 'Run Accruals', icon: '⏱️', perm: 'EXECUTE_ACCRUAL' },
      { to: '/accounting/transfers', label: 'Account Transfers', icon: '🔁', perm: 'READ_ACCOUNTTRANSFER' },
      { to: '/accounting/standing-instructions', label: 'Standing Instructions', icon: '📜', perm: 'READ_STANDINGINSTRUCTION' },
      { to: '/accounting/standing-instructions-history', label: 'Standing Instr. History', icon: '🕘', perm: 'READ_STANDINGINSTRUCTIONHISTORY' },
      { to: '/delinquency/ranges', label: 'Delinquency Ranges', icon: '📊', perm: 'READ_DELINQUENCY_RANGE' },
      { to: '/delinquency/buckets', label: 'Delinquency Buckets', icon: '🧺', perm: 'READ_DELINQUENCY_BUCKET' },
      { to: '/accounting/tax-groups', label: 'Tax Groups', icon: '🧾', perm: 'READ_TAXGROUP' },
      { to: '/accounting/funds', label: 'Funds', icon: '💰', perm: 'READ_FUND' },
    ],
  },
  {
    title: 'SyS Config',
    items: [
      { to: '/config/currencies', label: 'Currencies', icon: '💱', perm: 'READ_CURRENCY' },
      { to: '/config/codes', label: 'Codes', icon: '🏷️', perm: 'READ_CODE' },
      { to: '/config/datatables', label: 'Data Tables', icon: '📋', perm: 'READ_DATATABLE' },
      { to: '/config/entity-datatable-checks', label: 'Entity Datatable Checks', icon: '✅', perm: 'READ_ENTITYDATATABLECHECK' },
      { to: '/config/external-services', label: 'External Services', icon: '🔌', perm: 'READ_EXTERNALSERVICE' },
      { to: '/config/externalevents', label: 'External Events', icon: '📡', perm: 'READ_EXTERNALEVENT' },
      { to: '/config/global-config', label: 'Global Config', icon: '⚙️', perm: 'READ_CONFIGURATION' },
      { to: '/config/audits', label: 'Audits', icon: '🔍', perm: 'READ_AUDIT' },
      { to: '/config/reports', label: 'Reports', icon: '🧾', perm: 'READ_REPORT' },
      { to: '/config/hooks', label: 'Hooks', icon: '🪝', perm: 'READ_HOOK' },
      { to: '/config/instance-mode', label: 'Instance Mode', icon: '🧭', perm: 'READ_INSTANCE_MODE' },
      { to: '/config/jobs', label: 'Scheduler Jobs', icon: '⏲️', perm: 'READ_SCHEDULER' },
      { to: '/config/report-mailing-jobs', label: 'Report Mailing', icon: '✉️', perm: 'READ_REPORT_MAILING_JOB' },
      { to: '/config/field-config', label: 'Entity Field Config', icon: '🧩', perm: 'READ_FIELD_CONFIGURATION' },
    ],
  },
];

const Layout = () => {
  const [open, setOpen] = useState(false);
  const { can } = useAuth();

  // filter items by single 'perm' (add support for 'any'/'all' if you want later)
  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map(g => ({
      ...g,
      items: g.items.filter(it => !it.perm || can(it.perm)),
    })).filter(g => g.items.length > 0);
  }, [can]);

  return (
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {/* Top bar with logout + theme toggle */}
        <Header onToggleSidebar={() => setOpen(v => !v)} />

        <div className="flex">
          {/* Sidebar */}
          <aside
              className={`fixed md:sticky top-14 md:top-14 z-20 w-72 shrink-0
            bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
            h-[calc(100vh-3.5rem)]
            ${open ? 'block' : 'hidden md:block'}`}
          >
            <nav className="h-full overflow-y-auto overscroll-contain px-3 py-3 space-y-6">
              {visibleGroups.map((group) => (
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
