import React, { useMemo, useState } from 'react';
import {
  BadgeAlert,
  Banknote,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Send,
  UserRound,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';
import Can from '../../../components/Can';

const value = (input, fallback = '-') => {
  if (input === null || input === undefined || input === '') return fallback;
  if (typeof input === 'object') return input.value || input.name || input.code || fallback;
  return String(input);
};

const customerId = (row) => row?.gatewayCustomerId || row?.platformCustomerId || row?.customerId || row?.id;
const customerNumber = (row) => row?.fineractClientId || '-';

const nameFor = (row) => {
  const profile = row?.profile || {};
  return [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ').trim()
    || row?.displayName
    || row?.username
    || value(customerId(row));
};

const initialsFor = (row) => nameFor(row).split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

const statusFor = (row) => value(row?.status || row?.onboardingState || (row?.active === false ? 'INACTIVE' : 'ACTIVE'), 'ACTIVE');

const statusClass = (status) => {
  const normalized = String(status).toUpperCase();
  if (normalized.includes('PHONE')) return 'phone';
  if (normalized.includes('INCOMPLETE')) return 'incomplete';
  if (normalized.includes('INVIT')) return 'invited';
  return '';
};

const money = (amount) => {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return '-';
  return `TSh ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numeric)}`;
};

const date = (input) => {
  if (!input) return '-';
  const parsed = new Date(Array.isArray(input) ? `${input[0]}-${input[1]}-${input[2]}` : input);
  if (Number.isNaN(parsed.getTime())) return value(input);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(parsed);
};

const CustomerDirectory = ({
  rows,
  total,
  loading,
  page,
  limit,
  search,
  status,
  onSearch,
  onStatus,
  onPage,
  onClear,
  onOpen,
  onInvite,
}) => {
  const [branch, setBranch] = useState('');
  const [onboarding, setOnboarding] = useState('');
  const [loanStatus, setLoanStatus] = useState('');

  const stats = useMemo(() => {
    const active = rows.filter((row) => statusFor(row).toUpperCase().includes('ACTIVE')).length;
    const incomplete = rows.filter((row) => statusFor(row).toUpperCase().includes('INCOMPLETE')).length;
    const pending = rows.filter((row) => statusFor(row).toUpperCase().includes('INVIT')).length;
    return { active, incomplete, pending };
  }, [rows]);

  const pages = Math.max(1, Math.ceil(total / limit));
  const start = total ? page * limit + 1 : 0;
  const end = Math.min((page + 1) * limit, total);
  const pageNumbers = Array.from(new Set([0, 1, 2, 3, 4, pages - 1])).filter((item) => item >= 0 && item < pages);

  const reset = () => {
    setBranch('');
    setOnboarding('');
    setLoanStatus('');
    onClear();
  };

  return (
    <div className="customer-directory-page">
      <div className="customer-page-header">
        <div>
          <h1 className="customer-page-title">Customers</h1>
          <div className="customer-breadcrumb"><strong>/gateway</strong><span>/</span><span>customers</span></div>
        </div>
      </div>

      <section className="customer-panel customer-filter-panel">
        <div className="customer-filter-row">
          <label className="customer-search-box">
            <Search size={19} color="#5c6a86" />
            <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search by Customer Number, Name, Phone or Wallet No." />
          </label>
          <label className="customer-select">
            <select value={status} onChange={(event) => onStatus(event.target.value)}>
              <option value="">Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PHONE_VERIFIED">Phone Verified</option>
              <option value="PROFILE_INCOMPLETE">Profile Incomplete</option>
              <option value="INVITED">Invited</option>
            </select>
            <ChevronDown size={16} />
          </label>
          <label className="customer-select">
            <select value={branch} onChange={(event) => setBranch(event.target.value)}>
              <option value="">Branch</option>
              <option>Head Office</option>
              <option>Kane Branch</option>
            </select>
            <ChevronDown size={16} />
          </label>
          <label className="customer-select optional-filter">
            <select value={onboarding} onChange={(event) => setOnboarding(event.target.value)}>
              <option value="">Onboarding State</option>
              <option>Complete</option>
              <option>Incomplete</option>
            </select>
            <ChevronDown size={16} />
          </label>
          <label className="customer-select optional-filter">
            <select value={loanStatus} onChange={(event) => setLoanStatus(event.target.value)}>
              <option value="">Loan Status</option>
              <option>Active</option>
              <option>None</option>
            </select>
            <ChevronDown size={16} />
          </label>
          <button type="button" className="customer-reset" onClick={reset}><RefreshCw size={16} />Reset</button>
          <Can any={['GW_OPS_WRITE']}>
            <button type="button" className="customer-primary-button" onClick={onInvite}><Plus size={18} />Add Customer</button>
          </Can>
        </div>

        <div className="customer-stat-grid">
          <div className="customer-stat-card">
            <div className="customer-stat-icon cyan"><UsersRound /></div>
            <div><div className="customer-stat-label">Total Customers</div><div className="customer-stat-value">{total.toLocaleString()}</div><div className="customer-stat-note">All registered customers</div></div>
          </div>
          <div className="customer-stat-card">
            <div className="customer-stat-icon green"><UserRoundCheck /></div>
            <div><div className="customer-stat-label">Active Customers</div><div className="customer-stat-value">{stats.active.toLocaleString()}</div><div className="customer-stat-note">Currently active on this page</div></div>
          </div>
          <div className="customer-stat-card">
            <div className="customer-stat-icon orange"><BadgeAlert /></div>
            <div><div className="customer-stat-label">Incomplete Profiles</div><div className="customer-stat-value">{stats.incomplete.toLocaleString()}</div><div className="customer-stat-note">Need profile completion</div></div>
          </div>
          <div className="customer-stat-card">
            <div className="customer-stat-icon purple"><Send /></div>
            <div><div className="customer-stat-label">Pending Invites</div><div className="customer-stat-value">{stats.pending.toLocaleString()}</div><div className="customer-stat-note">Invites not yet accepted</div></div>
          </div>
        </div>
      </section>

      <section className="customer-panel customer-directory-card">
        <div className="customer-section-title">Customer Directory</div>
        <div className="customer-table-scroll">
          <table className="customer-directory-table">
            <thead>
              <tr>
                <th>Customer</th><th>Customer No.</th><th>Phone</th><th>Branch</th><th>Gateway Status</th><th>Active Loan</th><th>Savings</th><th>Joined Date</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9">Loading customers...</td></tr>
              ) : rows.length ? rows.map((row) => {
                const id = customerId(row);
                const profile = row?.profile || {};
                const statusText = statusFor(row);
                const loan = row?.activeLoan || row?.loanProductName || row?.productName || '-';
                const savings = row?.savingsBalance ?? row?.totalSavings ?? row?.savings;
                return (
                  <tr key={id} onClick={() => onOpen(row)}>
                    <td>
                      <div className="customer-identity">
                        <div className="customer-initials">{initialsFor(row)}</div>
                        <div>
                          <div className="customer-name">{nameFor(row)}</div>
                          <div className="customer-wallet">Wallet: {value(profile.walletMsisdn || row?.walletMsisdn || profile.phone)}</div>
                          <div className="customer-row-links">
                            <span className="customer-mini-link"><UserRound size={10} />Details</span>
                            {loan !== '-' ? <span className="customer-mini-link"><Banknote size={10} />Loans</span> : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{value(customerNumber(row))}</td>
                    <td>{value(profile.phone || row?.phone || row?.mobileNo)}</td>
                    <td>{value(row?.officeName || row?.branchName || row?.branch || 'Head Office')}</td>
                    <td><span className={`customer-status-badge ${statusClass(statusText)}`}>{statusText.replaceAll('_', ' ')}</span></td>
                    <td>{loan}</td>
                    <td className={savings != null ? 'customer-money' : ''}>{money(savings)}</td>
                    <td>{date(row?.joinedDate || row?.createdAt || row?.submittedOnDate)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button type="button" className="customer-view-button" onClick={(event) => { event.stopPropagation(); onOpen(row); }}>View</button>
                        <MoreVertical size={17} />
                      </div>
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan="9">No customers found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="customer-directory-footer">
          <span>Showing {start} to {end} of {total.toLocaleString()} customers</span>
          <div className="customer-pagination">
            <button className="customer-page-button" disabled={page === 0} onClick={() => onPage(page - 1)}><ChevronLeft size={16} /></button>
            {pageNumbers.map((number, index) => (
              <React.Fragment key={number}>
                {index > 0 && number - pageNumbers[index - 1] > 1 ? <span>...</span> : null}
                <button className={`customer-page-button ${number === page ? 'active' : ''}`} onClick={() => onPage(number)}>{number + 1}</button>
              </React.Fragment>
            ))}
            <button className="customer-page-button" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CustomerDirectory;
