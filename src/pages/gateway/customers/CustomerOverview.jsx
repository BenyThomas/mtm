import React from 'react';
import {
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CarFront,
  CircleDollarSign,
  Clock3,
  FilePenLine,
  FolderOpen,
  Mail,
  MapPin,
  Phone,
  PiggyBank,
  ShieldCheck,
  UserRound,
  WalletCards,
} from 'lucide-react';

const text = (input, fallback = '-') => {
  if (input === null || input === undefined || input === '') return fallback;
  if (typeof input === 'object') return input.value || input.name || input.code || fallback;
  return String(input);
};

const displayDate = (input) => {
  if (!input) return '-';
  const parsed = new Date(Array.isArray(input) ? `${input[0]}-${input[1]}-${input[2]}` : input);
  if (Number.isNaN(parsed.getTime())) return text(input);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(parsed);
};

const amount = (input) => {
  const numeric = Number(input);
  if (!Number.isFinite(numeric)) return 'TSh 0';
  return `TSh ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numeric)}`;
};

const InfoCard = ({ icon: Icon, title, rows }) => (
  <section className="customer-info-card">
    <div className="customer-info-title"><Icon size={19} />{title}</div>
    <dl>
      {rows.map(([label, value, className]) => (
        <div className="customer-info-row" key={label}><dt>{label}</dt><dd className={className || ''}>{text(value)}</dd></div>
      ))}
    </dl>
  </section>
);

const CustomerOverview = ({
  customer,
  onboarding,
  fineractClient,
  loans,
  vehicles,
  savingsAccounts,
  invites,
  missingFields,
  customerDisplayName,
  customerStatus,
  gatewayCustomerStatus,
  fineractStatus,
  onboardingStatus,
  readOnly = false,
  onOpenLoan,
  onEditProfile,
}) => {
  const profile = customer?.profile || {};
  const customerNo = customer?.fineractClientId || fineractClient?.id || '-';
  const activeLoans = loans.filter((loan) => !String(loan?.status || '').toUpperCase().match(/CLOSED|REJECT|WITHDRAW|FAIL/));
  const loanOutstanding = activeLoans.reduce((sum, loan) => sum + Number(loan?.outstandingBalance ?? loan?.totalOutstanding ?? loan?.principal ?? 0), 0);
  const savingsBalance = savingsAccounts.reduce((sum, account) => sum + Number(account?.summary?.accountBalance ?? account?.accountBalance ?? account?.balance ?? 0), 0);
  const primaryLoan = activeLoans[0] || loans[0] || null;
  const primarySavings = savingsAccounts[0] || null;

  const personalRows = [
    ['Display Name', customerDisplayName],
    ['Customer Number', customerNo],
    ['Username', customer?.username],
    ['Phone', profile.phone || onboarding?.mobileNo],
    ['Email', profile.email || onboarding?.email],
    ['Gender', profile.gender],
    ['Date of Birth', displayDate(profile.dob)],
    ['National ID', profile.nationalId],
  ];
  const operationalRows = [
    ['Customer Status', customerStatus, 'green'],
    ['Gateway Customer Status', gatewayCustomerStatus],
    ['Fineract Client Status', fineractStatus],
    ['Onboarding State', onboardingStatus],
    ['Office', fineractClient?.officeName || customer?.officeName],
    ['Staff / Relationship Officer', fineractClient?.staffName],
    ['Joined Date', displayDate(fineractClient?.submittedOnDate || onboarding?.createdAt || customer?.createdAt)],
    ['Activated Date', displayDate(fineractClient?.activationDate || onboarding?.updatedAt)],
  ];
  const addressRows = [
    ['Region', profile.region],
    ['District', profile.district],
    ['Ward', profile.ward],
    ['Street', profile.street],
    ['Next of Kin', profile.nextOfKinName],
    ['Next of Kin Phone', profile.nextOfKinPhone],
    ['Employment Type', profile.employmentType],
    ['Employer', profile.employerName],
    ['Income Source', profile.incomeSource],
  ];

  return (
    <div className="customer-detail-content">
      <div className="customer-overview-main">
        <div className="customer-kpi-grid">
          {[
            [WalletCards, 'Active Loans', activeLoans.length, 'cyan'],
            [CircleDollarSign, 'Total Outstanding', amount(loanOutstanding), 'orange'],
            [PiggyBank, 'Savings Balance', amount(savingsBalance), 'green'],
            [CarFront, 'Vehicle Records', vehicles.length, 'purple'],
            [Mail, 'Pending Invites', invites.length, 'blue'],
          ].map(([Icon, label, value, tone]) => (
            <div className="customer-kpi" key={label}>
              <div className={`customer-kpi-icon customer-stat-icon ${tone}`}><Icon size={21} /></div>
              <div><div className="customer-kpi-label">{label}</div><div className="customer-kpi-value">{value}</div></div>
            </div>
          ))}
        </div>

        <div className="customer-info-grid">
          <InfoCard icon={UserRound} title="Personal Information" rows={personalRows} />
          <InfoCard icon={BriefcaseBusiness} title="Operational Information" rows={operationalRows} />
          <InfoCard icon={MapPin} title="Address & Other Information" rows={addressRows} />
        </div>

        <section className="customer-related">
          <div className="customer-related-title">Related Data Preview</div>
          <div className="customer-related-tabs">
            <button className="customer-related-tab active">Loans&nbsp; {loans.length}</button>
            <button className="customer-related-tab">Vehicles&nbsp; {vehicles.length}</button>
            <button className="customer-related-tab">Savings&nbsp; {savingsAccounts.length}</button>
            <button className="customer-related-tab">Invites&nbsp; {invites.length}</button>
          </div>
          <table className="customer-related-table">
            <thead><tr><th>Loan Account No.</th><th>Product Name</th><th>Loan Amount</th><th>Outstanding Balance</th><th>Status</th><th>Next Repayment</th><th>Action</th></tr></thead>
            <tbody>
              {primaryLoan ? (
                <tr>
                  <td style={{ color: 'var(--customer-primary)', fontWeight: 700 }}>{text(primaryLoan?.loanAccount || primaryLoan?.accountNo || primaryLoan?.platformLoanId)}</td>
                  <td>{text(primaryLoan?.productName || primaryLoan?.productCode)}</td>
                  <td>{amount(primaryLoan?.principal)}</td>
                  <td style={{ color: '#f01a28', fontWeight: 700 }}>{amount(primaryLoan?.outstandingBalance ?? primaryLoan?.totalOutstanding ?? primaryLoan?.principal)}</td>
                  <td><span className="customer-status-badge">{text(primaryLoan?.status)}</span></td>
                  <td>{displayDate(primaryLoan?.nextRepaymentDate || primaryLoan?.nextDueDate)}</td>
                  <td><button className="customer-action-button" style={{ height: 30 }} onClick={onOpenLoan}>View Loan</button></td>
                </tr>
              ) : <tr><td colSpan="7">No loan records found.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>

      <aside className="customer-position-card">
        <div>
          <div className="customer-position-title">Customer Position</div>
          <div className="customer-position-group">
            {[
              [UserRound, 'Customer', customerDisplayName],
              [FolderOpen, 'Customer No.', customerNo],
              [Phone, 'Phone', profile.phone || onboarding?.mobileNo],
              [Building2, 'Office', fineractClient?.officeName || customer?.officeName],
              [Clock3, 'Status', customerStatus],
            ].map(([Icon, label, value]) => <div className="customer-position-row" key={label}><Icon size={15} /><span>{label}</span><strong>{text(value)}</strong></div>)}
          </div>
          <div className="customer-position-group">
            <div className="customer-position-row"><Banknote size={15} /><span>Active Loan Product</span><strong>{text(primaryLoan?.productName || primaryLoan?.productCode)}</strong></div>
            <div className="customer-position-row"><CircleDollarSign size={15} /><span>Loan Outstanding</span><strong className="red">{amount(loanOutstanding)}</strong></div>
            <div className="customer-position-row"><PiggyBank size={15} /><span>Savings</span><strong className="green">{amount(savingsBalance)}</strong></div>
            <div className="customer-position-row"><WalletCards size={15} /><span>Wallet Status</span><strong>{primarySavings ? 'Active' : text(customer?.walletStatus || customerStatus)}</strong></div>
            <div className="customer-position-row"><ShieldCheck size={15} /><span>Profile Completeness</span><strong className="orange">{missingFields.length ? `${missingFields.length} field(s) missing` : 'Complete'}</strong></div>
          </div>
        </div>
          <div className="customer-quick-actions">
            <div className="customer-quick-title">Quick Actions</div>
          <button className="customer-quick-button" onClick={onOpenLoan}><FolderOpen size={16} />View Loan</button>
          {!readOnly ? <button className="customer-quick-button green"><PiggyBank size={16} />Open Savings</button> : null}
          {!readOnly ? <button className="customer-quick-button purple" onClick={onEditProfile}><FilePenLine size={16} />Edit Profile</button> : null}
        </div>
      </aside>
    </div>
  );
};

export default CustomerOverview;
