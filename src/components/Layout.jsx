import React, { useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Header from './Header';
import { useAuth } from '../context/AuthContext';

const ButtonLike = ({ children, className = '', ...props }) => (
    <button
        className={`rounded-xl p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ${className}`}
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
            `flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
       focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
       ring-offset-white dark:ring-offset-gray-900
       ${isActive
                ? 'bg-cyan-100 text-cyan-800 shadow-sm dark:bg-cyan-900/40 dark:text-cyan-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'}`
        }
    >
      <span className="w-5 text-center">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
);

/** Add perm codes as needed for your deployment */
const NAV_GROUPS = [
  {
    title: 'Gateway',
    items: [
      { to: '/gateway', label: 'Overview', icon: 'G', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/invites', label: 'Invites', icon: 'I', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CLIENT', 'CREATE_CLIENT', 'UPDATE_CLIENT', 'DELETE_CLIENT'] },
      { to: '/gateway/invite-campaigns', label: 'Invite Campaigns', icon: 'IC', any: ['GW_OPS_WRITE', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/invite-channels', label: 'Invite Channels', icon: 'CH', any: ['GW_OPS_WRITE', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/loans', label: 'Gw Loans', icon: 'GL', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_LOAN'] },
      { to: '/gateway/loans/arrears', label: 'Arrears Loans', icon: 'AR', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_LOAN'] },
      { to: '/gateway/product-catalog', label: 'Product Catalog', icon: 'P', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/access-mappings', label: 'Access Mappings', icon: 'AM', perm: ['READ_CONFIGURATION','GW_OPS_ALL'] },
      { to: '/gateway/loan-automation', label: 'Loan Automation', icon: 'A', any: ['GW_OPS_WRITE', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/group-lifecycle', label: 'Group Lifecycle', icon: 'GL', any: ['GW_OPS_WRITE', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/centers', label: 'Centers', icon: 'C', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CENTER', 'READ_GROUP'] },
      { to: '/gateway/bank-names', label: 'Bank Names', icon: 'B', any: ['GW_OPS_WRITE', 'GW_OPS_ALL', 'READ_CONFIGURATION', 'UPDATE_CONFIGURATION'] },
      { to: '/gateway/loan-purposes', label: 'Loan Purposes', icon: 'LP', any: ['GW_OPS_WRITE', 'GW_OPS_ALL', 'READ_CONFIGURATION', 'UPDATE_CONFIGURATION', 'READ_LOANPRODUCT'] },
      { to: '/gateway/disbursements', label: 'Disbursements', icon: 'D', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/kyc', label: 'KYC Ops', icon: 'K', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
    ],
  },
  {
    title: 'Gateway Data',
    items: [
      { to: '/gateway/data/onboarding_records', label: 'Onboarding', icon: 'O', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/data/prospects', label: 'Prospects', icon: 'Pr', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/data/customers', label: 'Customers', icon: 'Cu', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/data/auth_accounts', label: 'Auth Accounts', icon: 'AA', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/data/auth_sessions', label: 'Auth Sessions', icon: 'AS', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/data/auth_refresh_tokens', label: 'Refresh Tokens', icon: 'RT', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/data/auth_otp_challenges', label: 'OTP Challenges', icon: 'OT', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/data/loans', label: 'Platform Loans', icon: 'L', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/data/disbursement_orders', label: 'Disbursement Orders', icon: 'DO', any: ['GW_OPS_READ', 'GW_OPS_ALL'] },
      { to: '/gateway/data/products', label: 'Products', icon: 'Pd', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/data/product_snapshots', label: 'Product Snapshots', icon: 'PS', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/data/score_band_policies', label: 'Score Bands', icon: 'SB', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/data/loan_product_policies', label: 'Loan Policies', icon: 'LP', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/data/borrower_scores', label: 'Borrower Scores', icon: 'BS', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/data/borrower_eligibility_results', label: 'Eligibility Results', icon: 'ER', any: ['GW_OPS_READ', 'GW_OPS_ALL','READ_CONFIGURATION'] },
      { to: '/gateway/data/schedule_preview_cache', label: 'Schedule Cache', icon: 'SC', any: ['GW_OPS_READ', 'GW_OPS_ALL'] },
      { to: '/gateway/data/consent_documents', label: 'Consent Docs', icon: 'CD', any: ['GW_OPS_READ', 'GW_OPS_ALL'] },
      { to: '/gateway/data/audit_events', label: 'Audit Events', icon: 'Au', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_AUDIT', 'READ_CONFIGURATION'] },
    ],
  },
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
  const { can, user } = useAuth();
  const isGatewayOnlyLoanOfficer = Boolean(user?.isGatewayOnlyLoanOfficer);

  // filter items by single 'perm' or permission groups
  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map(g => ({
      ...g,
      hidden: isGatewayOnlyLoanOfficer && !g.title.startsWith('Gateway'),
      items: g.items.filter((it) => {
        if (Array.isArray(it.all) && it.all.length > 0) return it.all.every((code) => can(code));
        if (Array.isArray(it.any) && it.any.length > 0) return it.any.some((code) => can(code));
        if (it.perm) return can(it.perm);
        return true;
      }),
    })).filter(g => !g.hidden && g.items.length > 0);
  }, [can, isGatewayOnlyLoanOfficer]);

  return (
      <div className="min-h-screen text-slate-900 dark:text-slate-100">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-28 -left-24 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/15" />
          <div className="absolute top-0 right-0 h-[26rem] w-[26rem] rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/10" />
        </div>
        {/* Top bar with logout + theme toggle */}
        <Header onToggleSidebar={() => setOpen(v => !v)} />

        <div className="mx-auto flex max-w-[1600px] gap-4 px-2 py-3 sm:px-4">
          {/* Sidebar */}
          <aside
              data-app-chrome="true"
              className={`fixed left-0 top-16 z-20 w-72 shrink-0 md:sticky md:top-[4.75rem]
            border border-slate-200/70 bg-white/85 shadow-xl backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/75
            h-[calc(100vh-4rem)] md:rounded-2xl
            ${open ? 'block' : 'hidden md:block'}`}
          >
            <nav className="h-full overflow-y-auto overscroll-contain px-3 py-3 space-y-6">
              {visibleGroups.map((group) => (
                  <div key={group.title}>
                    <div className="mb-2 px-3 text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
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
          <main className="modern-enter min-w-0 flex-1 md:ml-0">
            <div className="mx-auto w-full max-w-7xl rounded-2xl border border-slate-200/70 bg-white/55 p-4 backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/35 sm:p-5">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
  );
};

export default Layout;
