import React from 'react';
import { Loader2, Phone, ReceiptText, ShieldCheck } from 'lucide-react';
import Badge from './Badge';
import Button from './Button';
import Modal from './Modal';

const initials = (name) => String(name || 'Customer')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase();

const numberValue = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const money = (value, currency = 'TZS') => {
  const numeric = numberValue(value);
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(numeric || 0);
  return currency === 'TZS' ? `TSh ${formatted}` : `${currency} ${formatted}`;
};

const normalizeProvider = (value) => String(value || '').trim().toUpperCase();

const RepaymentPaymentModal = ({
  open,
  busy,
  onClose,
  onSubmit,
  customerName,
  customerNumber,
  loanNumber,
  statusLabel,
  statusTone = 'green',
  amount,
  onAmountChange,
  outstandingAmount,
  dueAmount,
  quickAmounts = [],
  currency = 'TZS',
  provider,
  onProviderChange,
  providers = [],
  cashProvider = 'EPIKPAY',
  msisdn,
  onMsisdnChange,
  reference,
  onReferenceChange,
  note,
  onNoteChange,
  transactionDate,
  onTransactionDateChange,
  paymentTypeId,
  onPaymentTypeChange,
  paymentTypeOptions = [],
  savingsAccounts = [],
  savingsAccountId,
  onSavingsAccountChange,
  savingsLoading = false,
  warning,
}) => {
  const resolvedProvider = normalizeProvider(provider);
  const isCash = resolvedProvider === normalizeProvider(cashProvider);
  const isFromSavings = resolvedProvider === 'FROM_SAVINGS';
  const quickValues = Array.from(new Set(
    [...quickAmounts, dueAmount]
      .map(numberValue)
      .filter((value) => value != null && value > 0)
  ));

  return (
    <Modal
      open={open}
      onClose={() => (busy ? null : onClose?.())}
      title="Post Payment"
      size="sm"
      panelClassName="sm:max-w-[420px]"
      bodyClassName="sm:px-4 sm:py-4"
      footerClassName="sm:px-4 sm:py-3"
      footer={(
        <div className="grid w-full grid-cols-[auto_1fr] gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={onSubmit} disabled={busy}>
            {busy
              ? <><Loader2 size={16} className="animate-spin" /> Posting...</>
              : <><ReceiptText size={16} /> Post Payment</>}
          </Button>
        </div>
      )}
    >
      <div className="space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-[color:var(--tenant-primary)]/12 to-[color:var(--tenant-accent)]/8 p-3 ring-1 ring-inset ring-[color:var(--tenant-primary)]/15">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--tenant-primary)] text-xs font-bold text-white shadow-sm">
              {initials(customerName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-slate-950 dark:text-white">{customerName || 'Customer'}</div>
              <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {customerNumber ? `Customer No. ${customerNumber}` : 'Customer number unavailable'}
                {loanNumber ? ` Ã‚Â· Loan ${loanNumber}` : ''}
              </div>
            </div>
            {statusLabel ? <Badge tone={statusTone}>{statusLabel}</Badge> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-700/70 dark:bg-slate-800/40">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Amount to collect</div>
              <div className="mt-1 text-xs text-slate-500">Outstanding {money(outstandingAmount, currency)}</div>
            </div>
            <div className="flex min-w-[170px] items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-500">{currency === 'TZS' ? 'TSh' : currency}</span>
              <input
                value={amount}
                onChange={(event) => onAmountChange?.(event.target.value)}
                inputMode="decimal"
                className="h-11 min-w-0 flex-1 border-0 bg-transparent text-right text-lg font-bold shadow-none focus:ring-0"
              />
            </div>
          </div>
          {quickValues.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickValues.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onAmountChange?.(String(value))}
                  className="rounded-lg border border-[color:var(--tenant-primary)]/25 bg-white px-2.5 py-1.5 text-[11px] font-bold text-[var(--tenant-primary)] hover:bg-[color:var(--tenant-primary)]/5 dark:bg-slate-900"
                >
                  {numberValue(dueAmount) === value ? 'Full due' : money(value, currency)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {onProviderChange ? (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Payment method</label>
            <select value={provider} onChange={(event) => onProviderChange(event.target.value)} className="mt-1 h-10 w-full rounded-xl border px-3 text-sm">
              {(providers.length ? providers : ['SELCOM', cashProvider]).map((item) => (
                <option key={item} value={item}>{normalizeProvider(item) === 'FROM_SAVINGS' ? 'From Savings' : normalizeProvider(item) === normalizeProvider(cashProvider) ? 'Cash / Direct Payment' : `${item} Mobile Push`}</option>
              ))}
            </select>
          </div>
        ) : null}

        {onSavingsAccountChange && isFromSavings ? (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Savings account</label>
            <select value={savingsAccountId || ''} onChange={(event) => onSavingsAccountChange(event.target.value)} disabled={savingsLoading || !savingsAccounts.length} className="mt-1 h-10 w-full rounded-xl border px-3 text-sm">
              <option value="">{savingsLoading ? 'Loading savings accounts...' : 'Select savings account'}</option>
              {savingsAccounts.map((account) => (
                <option key={account.id} value={account.id}>{account.label}</option>
              ))}
            </select>
          </div>
        ) : null}

        {onMsisdnChange && !isCash && !isFromSavings ? (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Customer wallet</label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input value={msisdn} onChange={(event) => onMsisdnChange(event.target.value)} className="h-10 w-full rounded-xl border pl-9 pr-3 text-sm" />
            </div>
          </div>
        ) : null}

        {onTransactionDateChange ? (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Transaction date *</label>
            <input type="date" value={transactionDate} onChange={(event) => onTransactionDateChange(event.target.value)} className="mt-1 h-10 w-full rounded-xl border px-3 text-sm" />
          </div>
        ) : null}

        {onPaymentTypeChange ? (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Payment type</label>
            <select value={paymentTypeId} onChange={(event) => onPaymentTypeChange(event.target.value)} className="mt-1 h-10 w-full rounded-xl border px-3 text-sm">
              <option value="">Select payment type</option>
              {paymentTypeOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
        ) : null}

        {onReferenceChange && !isFromSavings ? (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Transaction reference *</label>
            <input
              value={reference}
              onChange={(event) => onReferenceChange(event.target.value)}
              placeholder="Enter transaction reference"
              required
              className="mt-1 h-10 w-full rounded-xl border px-3 font-mono text-sm"
            />
          </div>
        ) : null}

        {onNoteChange ? (
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{isFromSavings ? 'Description' : 'Note'} <span className="font-normal normal-case">(optional)</span></label>
              <span className="text-[10px] text-slate-400">{String(note || '').length}/200</span>
            </div>
            <textarea value={note} onChange={(event) => onNoteChange(event.target.value.slice(0, 200))} rows={2} placeholder={isFromSavings ? 'Description for savings transfer' : 'Add a short payment note'} className="mt-1 w-full resize-none rounded-xl border px-3 py-2 text-sm" />
          </div>
        ) : null}

        {warning ? (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            {warning}
          </div>
        ) : null}

        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
          <ShieldCheck size={14} /> Secure posting with duplicate prevention
        </div>
      </div>
    </Modal>
  );
};

export default RepaymentPaymentModal;
