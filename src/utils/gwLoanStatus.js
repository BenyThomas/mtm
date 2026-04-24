export const getGwLoanStatusCode = (loan) => {
  const code = String(loan?.statusCode || loan?.status || '').trim().toUpperCase();
  return code || '';
};

export const getGwLoanStatusLabel = (loan) => {
  const label = String(loan?.statusLabel || '').trim();
  if (label) return label;

  const code = getGwLoanStatusCode(loan);
  if (!code) return '-';

  const normalized = code.replace(/_/g, ' ').toLowerCase();
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getGwLoanStatusTone = (loanOrStatus) => {
  const status = typeof loanOrStatus === 'string'
    ? loanOrStatus
    : getGwLoanStatusCode(loanOrStatus);
  const code = String(status || '').trim().toUpperCase();

  if (['PENDING_APPROVAL', 'PENDING_UPSTREAM', 'CREATED_IN_FINERACT', 'SUBMITTED', 'PENDING'].includes(code)) return 'yellow';
  if (['APPROVED', 'PENDING_DISBURSEMENT'].includes(code)) return 'cyan';
  if (['ACTIVE', 'DISBURSED'].includes(code)) return 'green';
  if (code === 'OVERDUE') return 'red';
  if (code === 'OVERPAID') return 'emerald';
  if (code === 'CLOSED') return 'gray';
  if (['UPSTREAM_FAILED', 'REJECTED', 'WITHDRAWN', 'WITHDRAWN_BY_APPLICANT'].includes(code)) return 'red';
  return 'blue';
};

export const isGwLoanBlockingStatus = (loanOrStatus) => {
  const status = typeof loanOrStatus === 'string'
    ? loanOrStatus
    : getGwLoanStatusCode(loanOrStatus);
  const code = String(status || '').trim().toUpperCase();
  return Boolean(code) && !['CLOSED', 'REJECTED', 'DECLINED', 'CANCELLED', 'CANCELED', 'WITHDRAWN', 'WITHDRAWN_BY_APPLICANT', 'UPSTREAM_FAILED', 'OVERPAID'].includes(code);
};
