import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarDays, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../pages/gateway/customers/gateway-customers.css';

/** Add perm codes as needed for your deployment */
const NAV_GROUPS = [
  {
    title: 'Gateway',
    items: [
      { to: '/gateway', label: 'Overview', icon: 'G', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/invite-campaigns', label: 'Invite Campaigns', icon: 'IC', any: ['GW_OPS_WRITE', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/invite-channels', label: 'Invite Channels', icon: 'CH', any: ['GW_OPS_WRITE', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/data/customers', label: 'Customers', icon: 'Cu', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CLIENT', 'READ_CONFIGURATION'] },
      { to: '/gateway/loans', label: 'GW Loans', icon: 'L', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_LOAN'] },
      { to: '/gateway/loans/arrears', label: 'Arrears Loans', icon: 'AR', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_LOAN'] },
      { to: '/gateway/collections', label: 'Collections', icon: 'Co', any: ['GW_OPS_READ', 'GW_OPS_WRITE', 'GW_OPS_ALL', 'READ_LOAN', 'READ_CLIENT'] },
      { to: '/gateway/reports', label: 'Gateway Reports', icon: 'GR', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_LOAN'] },
      { to: '/gateway/performance', label: 'Performance KPIs', icon: 'KP', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_REPORT', 'READ_LOAN'] },
      { to: '/gateway/notifications/templates', label: 'Notif Templates', icon: 'NT', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/notifications/dispatches', label: 'Notif History', icon: 'NH', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/queues', label: 'Queues', icon: 'Q', any: ['GW_OPS_READ', 'GW_OPS_WRITE', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/product-catalog', label: 'Product Catalog', icon: 'P', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/access-mappings', label: 'Access Mappings', icon: 'AM', perm: ['READ_CONFIGURATION','GW_OPS_ALL'] },
      { to: '/gateway/loan-automation', label: 'Loan Automation', icon: 'A', any: ['GW_OPS_WRITE', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/group-lifecycle', label: 'Group Lifecycle', icon: 'GL', any: ['GW_OPS_WRITE', 'GW_OPS_ALL', 'READ_CONFIGURATION'] },
      { to: '/gateway/centers', label: 'Centers', icon: 'C', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CENTER', 'READ_GROUP'] },
      { to: '/gateway/merchant/companies', label: 'Merchant Companies', icon: 'MC', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION', 'READ_CLIENT'] },
      { to: '/gateway/merchant/customers', label: 'Merchant Customers', icon: 'MU', any: ['GW_OPS_READ', 'GW_OPS_ALL', 'READ_CONFIGURATION', 'READ_CLIENT'] },
      { to: '/gateway/merchant-industry-types', label: 'Merchant Industry Types', icon: 'MI', any: ['GW_OPS_WRITE', 'GW_OPS_ALL', 'READ_CONFIGURATION', 'UPDATE_CONFIGURATION'] },
      { to: '/gateway/selcom-sync', label: 'Selcom Repayments Sync', icon: 'RS', any: ['GW_OPS_WRITE', 'GW_OPS_ALL'] },
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
      { to: '/collateral-management', label: 'Collateral Types', icon: '🧱', perm: 'READ_COLLATERAL' },
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

const navigationGlyph = (label) => String(label || '')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase();

const singularize = (label) => {
  const value = String(label || '').trim();
  if (/ies$/i.test(value)) return `${value.slice(0, -3)}y`;
  if (/s$/i.test(value) && !/ss$/i.test(value)) return value.slice(0, -1);
  return value;
};

const humanizeSegment = (value) => String(value || '')
  .replace(/[-_]+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const Layout = () => {
  const [open, setOpen] = useState(false);
  const { can, user, tenantConfig, logout } = useAuth();
  const location = useLocation();
  const isGatewayOnlyLoanOfficer = Boolean(user?.isGatewayOnlyLoanOfficer);
  const isCustomerWorkspace = location.pathname === '/gateway/data/customers'
    || location.pathname.startsWith('/gateway/customers/')
    || location.pathname === '/gateway/loans'
    || location.pathname.startsWith('/gateway/loans/');

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

  const pageMeta = useMemo(() => {
    const pathname = location.pathname.replace(/\/+$/, '') || '/';
    const candidates = visibleGroups.flatMap((group) =>
      group.items.map((item) => ({ ...item, groupTitle: group.title }))
    );
    const matched = candidates
      .filter((item) => pathname === item.to || (item.to !== '/' && pathname.startsWith(`${item.to}/`)))
      .sort((left, right) => right.to.length - left.to.length)[0];

    const pathSegments = pathname.split('/').filter(Boolean);
    const meaningfulSegment = [...pathSegments]
      .reverse()
      .find((segment) => !/^\d+$/.test(segment) && !['new', 'edit'].includes(segment.toLowerCase()));
    const fallbackLabel = pathname === '/' ? 'Dashboard' : humanizeSegment(meaningfulSegment);
    const isGatewayCustomerDetail = /^\/gateway\/customers\/[^/]+$/.test(pathname);
    const baseLabel = isGatewayCustomerDetail ? 'Customers' : matched?.label || fallbackLabel || 'Dashboard';
    const entityLabel = singularize(baseLabel);
    const remainder = matched && pathname !== matched.to
      ? pathname.slice(matched.to.length).split('/').filter(Boolean)
      : [];

    let title = baseLabel;
    if (isGatewayCustomerDetail) {
      title = 'Customer Details';
    } else if (remainder.includes('new')) {
      title = `New ${entityLabel}`;
    } else if (remainder.includes('edit')) {
      title = `Edit ${entityLabel}`;
    } else if (remainder.length > 0) {
      title = `${entityLabel} Details`;
    }

    return {
      title,
      group: isGatewayCustomerDetail
        ? 'Gateway'
        : matched?.groupTitle || humanizeSegment(pathSegments[0]) || 'Main',
      baseLabel,
    };
  }, [location.pathname, visibleGroups]);

  {
    const branding = tenantConfig || {};
    const displayName = user?.staffDisplayName || user?.username || 'User';
    const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'US';
    const dateLabel = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(new Date());

    return (
      <div className="customer-portal">
        <div className="customer-portal-shell">
          <aside className={`customer-portal-sidebar ${open ? 'open' : ''}`}>
            <div className="customer-brand">
              {branding.logoUrl ? (
                <img className="customer-brand-logo" src={branding.logoUrl} alt={branding.name || 'Tenant logo'} />
              ) : (
                <div className="customer-brand-mark">{branding.shortName?.[0] || 'T'}</div>
              )}
              <div>
                <div className="customer-brand-name">{branding.name || 'Trust Management'}</div>
                <div className="customer-brand-subtitle">{branding.portalName || 'Customer Management'}</div>
              </div>
            </div>
            <nav className="customer-nav">
              {visibleGroups.map((group) => (
                <div className="customer-nav-group" key={group.title}>
                  <div className="customer-nav-heading">{group.title}</div>
                  <div className="customer-nav-items">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/' || item.to === '/gateway'}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}
                      >
                        <span className="customer-nav-icon">{navigationGlyph(item.label)}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="customer-version-card">
              <span className="customer-online-dot" />
              <strong>{branding.shortName || branding.name || 'Gateway'} Portal</strong>
              Fineract 1.10.0.12
              <div className="customer-brand-copyright">© 2026 {branding.name || 'Gateway Technologies'}</div>
            </div>
          </aside>
          {open ? <button type="button" className="customer-sidebar-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} /> : null}
          <div className="customer-portal-main">
            <header className="customer-portal-topbar">
              <div className="customer-topbar-left">
                <button type="button" className="customer-menu-button" onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation">
                  <Menu className="customer-topbar-menu" size={25} />
                </button>
                <div className="customer-shell-heading">
                  <h1>{pageMeta.title}</h1>
                  <div className="customer-shell-breadcrumb">
                    <strong>/{pageMeta.group.toLowerCase().replace(/\s+/g, '-')}</strong>
                    {pageMeta.baseLabel !== pageMeta.title ? <><span>/</span><span>{pageMeta.baseLabel}</span></> : null}
                  </div>
                </div>
              </div>
              <div className="customer-topbar-right">
                <div className="customer-date-pill"><CalendarDays size={17} />{dateLabel}</div>
                <div className="customer-user">
                  <div className="customer-user-avatar">{initials}</div>
                  <div><div className="customer-user-name">{displayName}</div><div className="customer-user-role">{user?.officeName || 'Field Operations'}</div></div>
                </div>
                <button type="button" className="customer-logout-button" onClick={logout}>Logout</button>
              </div>
            </header>
            <main className={`customer-page-frame ${isCustomerWorkspace ? '' : 'standard-page'}`}><Outlet /></main>
          </div>
        </div>
      </div>
    );
  }
};

export default Layout;
