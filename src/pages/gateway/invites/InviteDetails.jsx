import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy } from 'lucide-react';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Skeleton from '../../../components/Skeleton';
import Modal from '../../../components/Modal';
import SearchableSelectField from '../../../components/SearchableSelectField';
import { cancelInvite, deleteInvite, getInvite, getInviteOnboarding, acceptInviteOnBehalf } from '../../../api/gateway/invites';
import { useToast } from '../../../context/ToastContext';
import Can from '../../../components/Can';
import { getCenter, getGroup } from '../../../api/gateway/community';
import useStaff from '../../../hooks/useStaff';
import { listLoanProductsOps } from '../../../api/gateway/loanProducts';
import { applyGwLoanOnBehalf } from '../../../api/gateway/loans';
import { listBankNames } from '../../../api/gateway/bankNames';

const GENDER_OPTIONS = [
  { value: '', label: 'Select gender' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
];

const INCOME_SOURCE_OPTIONS = [
  { value: '', label: 'Select income source' },
  { value: 'SALARY', label: 'Salary' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'FARMING', label: 'Farming' },
  { value: 'CASUAL_WORK', label: 'Casual Work' },
  { value: 'OTHER', label: 'Other' },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: '', label: 'Select employment type' },
  { value: 'EMPLOYED', label: 'Employed' },
  { value: 'SELF_EMPLOYED', label: 'Self Employed' },
  { value: 'BUSINESS_OWNER', label: 'Business Owner' },
  { value: 'UNEMPLOYED', label: 'Unemployed' },
  { value: 'OTHER', label: 'Other' },
];

const copyToClipboard = async (text) => {
  const t = String(text || '');
  if (!t) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(t);
      return true;
    }
  } catch (_) {
    // fall through
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.setAttribute('readonly', 'true');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.left = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
};

const Field = ({ label, value, mono }) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}
    </div>
    <div className={`mt-1 text-sm ${mono ? 'font-mono break-all' : ''} text-slate-900 dark:text-slate-50`}>
      {value || '-'}
    </div>
  </div>
);

const timeAgo = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffMs = Date.now() - t;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const units = [
    { s: 60 * 60 * 24 * 365, label: 'y' },
    { s: 60 * 60 * 24 * 30, label: 'mo' },
    { s: 60 * 60 * 24 * 7, label: 'w' },
    { s: 60 * 60 * 24, label: 'd' },
    { s: 60 * 60, label: 'h' },
    { s: 60, label: 'm' },
    { s: 1, label: 's' },
  ];
  for (const u of units) {
    if (diffSec >= u.s) return `${Math.floor(diffSec / u.s)}${u.label} ago`;
  }
  return 'now';
};

const InviteDetails = () => {
  const { inviteId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { staff } = useStaff({ activeOnly: false });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [doc, setDoc] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [centerName, setCenterName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanProducts, setLoanProducts] = useState([]);
  const [bankOptions, setBankOptions] = useState([]);
  const [acceptSaving, setAcceptSaving] = useState(false);
  const [loanSaving, setLoanSaving] = useState(false);
  const [acceptForm, setAcceptForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dob: '',
    gender: '',
    nationalId: '',
    region: '',
    district: '',
    ward: '',
    street: '',
    nextOfKinName: '',
    nextOfKinPhone: '',
    employerName: '',
    employmentType: '',
    incomeSource: '',
    bankName: '',
    bankAccount: '',
    walletMsisdn: '',
  });
  const [loanForm, setLoanForm] = useState({ productCode: '', amount: '' });

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await getInvite(inviteId);
      setDoc(data);
      try {
        const onboardingData = await getInviteOnboarding(inviteId);
        setOnboarding(onboardingData);
      } catch (_) {
        setOnboarding(null);
      }
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to load invite');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (doc?.centerId) {
        try {
          const center = await getCenter(doc.centerId);
          if (!cancelled) setCenterName(center?.name || '');
        } catch {
          if (!cancelled) setCenterName('');
        }
      } else {
        setCenterName('');
      }

      if (doc?.groupId) {
        try {
          const group = await getGroup(doc.groupId);
          if (!cancelled) setGroupName(group?.name || '');
        } catch {
          if (!cancelled) setGroupName('');
        }
      } else {
        setGroupName('');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doc?.centerId, doc?.groupId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await listLoanProductsOps();
        if (!cancelled) {
          const normalized = Array.isArray(items) ? items : Array.isArray(items?.items) ? items.items : [];
          setLoanProducts(normalized.filter(Boolean));
        }
      } catch {
        if (!cancelled) setLoanProducts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listBankNames({ active: true, limit: 500, offset: 0, orderBy: 'name', sortOrder: 'asc' });
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        if (!cancelled) {
          setBankOptions(
            items
              .filter((item) => item?.name)
              .map((item) => ({ id: String(item.name), label: String(item.name) }))
          );
        }
      } catch {
        if (!cancelled) setBankOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setAcceptForm({
      firstName: doc?.prefill?.firstName || '',
      lastName: doc?.prefill?.lastName || '',
      phone: doc?.prefill?.phoneNumber || '',
      email: '',
      dob: '',
      gender: '',
      nationalId: '',
      region: '',
      district: '',
      ward: '',
      street: '',
      nextOfKinName: '',
      nextOfKinPhone: '',
      employerName: '',
      employmentType: '',
      incomeSource: '',
      bankName: '',
      bankAccount: '',
      walletMsisdn: doc?.prefill?.phoneNumber || '',
    });
  }, [doc?.inviteId, doc?.prefill?.firstName, doc?.prefill?.lastName, doc?.prefill?.phoneNumber]);

  const staffNameById = useMemo(() => {
    const map = {};
    for (const member of staff || []) {
      map[String(member.id)] = member.displayName || [member.firstname, member.lastname].filter(Boolean).join(' ');
    }
    return map;
  }, [staff]);

  const staffContactById = useMemo(() => {
    const map = {};
    for (const member of staff || []) {
      const contact = [member.mobileNo, member.email].filter(Boolean).join(' | ');
      map[String(member.id)] = contact;
    }
    return map;
  }, [staff]);

  const doCancel = async () => {
    setSaving(true);
    setErr('');
    try {
      const updated = await cancelInvite(inviteId);
      setDoc(updated);
      addToast('Invite cancelled', 'success');
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Cancel failed';
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!window.confirm('Delete this invite? This cannot be undone.')) return;
    setSaving(true);
    setErr('');
    try {
      await deleteInvite(inviteId);
      addToast('Invite deleted', 'success');
      navigate('/gateway/invites', { replace: true });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Delete failed';
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (label, value) => {
    const ok = await copyToClipboard(value);
    if (ok) addToast(`${label} copied`, 'success');
    else addToast(`Failed to copy ${label}`, 'error');
  };

  const referrerName = doc?.referrerId ? (staffNameById[String(doc.referrerId)] || '') : '';
  const referrerContact = doc?.referrerId ? (staffContactById[String(doc.referrerId)] || '') : '';
  const invitedByStaffName = doc?.invitedByStaffId ? (staffNameById[String(doc.invitedByStaffId)] || '') : '';
  const invitedByStaffContact = doc?.invitedByStaffId ? (staffContactById[String(doc.invitedByStaffId)] || '') : '';
  const inviteLabel = doc?.campaignCode || doc?.channel || 'Invite';
  const canAcceptOnBehalf = !!doc?.inviteId && !['ACCEPTED', 'CANCELLED', 'EXPIRED'].includes(String(doc?.status || '').toUpperCase());
  const canApplyLoan = !!(onboarding?.gatewayCustomerId || onboarding?.fineractClientId);
  const loanProductOptions = loanProducts.map((item) => ({
    id: String(item?.productCode || ''),
    label: `${item?.name || item?.productCode || 'Product'}${item?.productCode ? ` (${item.productCode})` : ''}`,
  })).filter((item) => item.id);

  const openAcceptModal = () => setAcceptOpen(true);

  const submitAcceptOnBehalf = async (e) => {
    e?.preventDefault?.();
    setAcceptSaving(true);
    setErr('');
    try {
      const payload = {
        authenticationMode: 'PASSWORD',
        profile: {
          firstName: acceptForm.firstName || null,
          lastName: acceptForm.lastName || null,
          phone: acceptForm.phone || null,
          email: acceptForm.email || null,
          dob: acceptForm.dob || null,
          gender: acceptForm.gender || null,
          nationalId: acceptForm.nationalId || null,
          region: acceptForm.region || null,
          district: acceptForm.district || null,
          ward: acceptForm.ward || null,
          street: acceptForm.street || null,
          nextOfKinName: acceptForm.nextOfKinName || null,
          nextOfKinPhone: acceptForm.nextOfKinPhone || null,
          employerName: acceptForm.employerName || null,
          employmentType: acceptForm.employmentType || null,
          incomeSource: acceptForm.incomeSource || null,
          bankName: acceptForm.bankName || null,
          bankAccount: acceptForm.bankAccount || null,
          walletMsisdn: acceptForm.walletMsisdn || null,
        },
      };
      const result = await acceptInviteOnBehalf(inviteId, payload);
      setOnboarding(result?.onboarding || null);
      setAcceptOpen(false);
      addToast(result?.profileComplete ? 'Onboarding completed and PIN sent by SMS' : 'Invite accepted and PIN sent by SMS', 'success');
      setRefreshRequested();
    } catch (e2) {
      const msg = e2?.response?.data?.errors?.[0]?.details || e2?.response?.data?.message || e2?.message || 'Assisted onboarding failed';
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setAcceptSaving(false);
    }
  };

  const submitLoanOnBehalf = async (e) => {
    e?.preventDefault?.();
    if (!onboarding?.gatewayCustomerId) {
      addToast('Customer mapping is missing', 'error');
      return;
    }
    setLoanSaving(true);
    setErr('');
    try {
      const loan = await applyGwLoanOnBehalf(onboarding.gatewayCustomerId, {
        productCode: loanForm.productCode,
        amount: Number(loanForm.amount),
      });
      setLoanOpen(false);
      addToast('Loan application submitted', 'success');
      navigate(`/gateway/loans/${encodeURIComponent(loan?.platformLoanId)}`);
    } catch (e2) {
      const msg = e2?.response?.data?.errors?.[0]?.details || e2?.response?.data?.message || e2?.message || 'Loan application failed';
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setLoanSaving(false);
    }
  };

  const setRefreshRequested = () => {
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Invite</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {doc?.inviteCode ? `Code: ${doc.inviteCode}` : inviteLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} disabled={loading || saving}>
            Refresh
          </Button>
          <Can any={['GW_OPS_WRITE']}>
            {canAcceptOnBehalf ? (
              <Button onClick={openAcceptModal} disabled={loading || saving || acceptSaving}>
                Accept On Behalf
              </Button>
            ) : null}
            {canApplyLoan ? (
              <Button onClick={() => setLoanOpen(true)} disabled={loading || saving || loanSaving}>
                Apply Loan On Behalf
              </Button>
            ) : null}
          </Can>
          <Can any={['GW_OPS_WRITE']}>
            <Button variant="secondary" onClick={doCancel} disabled={loading || saving}>
              Cancel Invite
            </Button>
            <Button variant="danger" onClick={doDelete} disabled={loading || saving}>
              Delete
            </Button>
          </Can>
        </div>
      </div>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      <div className="mt-4">
        {loading ? (
          <Card>
            <Skeleton height="14rem" />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Summary
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {inviteLabel}
                  </div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Agent: <strong>{referrerName || 'Unassigned'}</strong> | Status: <strong>{doc?.status || '-'}</strong>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                  <div title={doc?.createdAt || ''}>Created {timeAgo(doc?.createdAt)}</div>
                  <div title={doc?.updatedAt || ''}>Updated {timeAgo(doc?.updatedAt)}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Invite Code
                  </div>
                  <div className="mt-1 flex items-start gap-2">
                    <div className="text-sm font-mono break-all text-slate-900 dark:text-slate-50">
                      {doc?.inviteCode || '-'}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2"
                      onClick={() => copy('Invite code', doc?.inviteCode)}
                      disabled={!doc?.inviteCode}
                      aria-label="Copy invite code"
                      title="Copy invite code"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
                <Field label="Channel" value={doc?.channel} />
                <Field label="Campaign" value={doc?.campaignCode} />
                <Field label="Uses" value={`${Number(doc?.uses || 0)} / ${Number(doc?.maxUses || 0) === 0 ? 'Unlimited' : Number(doc?.maxUses || 0)}`} />
                <Field label="Expires At" value={doc?.expiresAt} />
                <Field label="Agent Contact" value={referrerContact} />
              </div>

              <div className="mt-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Invite Link
                  </div>
                  <div className="mt-1 flex items-start gap-2">
                    <div className="text-sm break-all text-slate-900 dark:text-slate-50">
                      {doc?.inviteUrl || '-'}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2"
                      onClick={() => copy('Invite link', doc?.inviteUrl)}
                      disabled={!doc?.inviteUrl}
                      aria-label="Copy invite link"
                      title="Copy invite link"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Recipient
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Phone" value={doc?.prefill?.phoneNumber} />
                <Field label="Name" value={`${(doc?.prefill?.firstName || '').trim()} ${(doc?.prefill?.lastName || '').trim()}`.trim()} />
                <Field label="Center" value={centerName || (doc?.centerId ? 'Assigned center' : '-')} />
                <Field label="Group" value={groupName || (doc?.groupId ? 'Assigned group' : '-')} />
                <Field label="Membership Role" value={doc?.membershipRole} />
                <Field label="Invited By Staff" value={invitedByStaffName} />
                <Field label="Staff Contact" value={invitedByStaffContact} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Opened At" value={doc?.openedAt} />
                <Field label="Accepted At" value={doc?.acceptedAt} />
              </div>
            </Card>

            <Card>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Onboarding
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Status" value={onboarding?.status || '-'} />
                <Field label="State" value={onboarding?.onboardingState || '-'} />
                <Field label="Login Phone" value={onboarding?.mobileNo || doc?.prefill?.phoneNumber || '-'} />
                <Field label="Account Ready" value={canApplyLoan ? 'Yes' : 'No'} />
                <Field label="Updated At" value={onboarding?.updatedAt || '-'} />
              </div>
            </Card>
          </div>
        )}
      </div>

      <Modal
        open={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        title="Accept Invite On Behalf"
        size="4xl"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setAcceptOpen(false)} disabled={acceptSaving}>Cancel</Button>
            <Button onClick={submitAcceptOnBehalf} disabled={acceptSaving}>{acceptSaving ? 'Saving...' : 'Complete Onboarding'}</Button>
          </>
        )}
      >
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={submitAcceptOnBehalf}>
          {[
            ['First Name', 'firstName'],
            ['Last Name', 'lastName'],
            ['Phone', 'phone'],
            ['Email', 'email'],
            ['National ID', 'nationalId'],
            ['Region', 'region'],
            ['District', 'district'],
            ['Ward', 'ward'],
            ['Street', 'street'],
            ['Next of Kin Name', 'nextOfKinName'],
            ['Next of Kin Phone', 'nextOfKinPhone'],
            ['Employer Name', 'employerName'],
            ['Bank Account', 'bankAccount'],
            ['Wallet MSISDN', 'walletMsisdn'],
          ].map(([label, key]) => (
            <label key={key} className="block text-sm text-slate-700 dark:text-slate-200">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
              <input
                value={acceptForm[key]}
                onChange={(e) => setAcceptForm((prev) => ({ ...prev, [key]: e.target.value }))}
                className="w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
              />
            </label>
          ))}
          <label className="block text-sm text-slate-700 dark:text-slate-200">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Date of Birth</span>
            <input
              type="date"
              value={acceptForm.dob}
              onChange={(e) => setAcceptForm((prev) => ({ ...prev, dob: e.target.value }))}
              className="w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            />
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-200">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Gender</span>
            <select
              value={acceptForm.gender}
              onChange={(e) => setAcceptForm((prev) => ({ ...prev, gender: e.target.value }))}
              className="w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            >
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-200">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Employment Type</span>
            <select
              value={acceptForm.employmentType}
              onChange={(e) => setAcceptForm((prev) => ({ ...prev, employmentType: e.target.value }))}
              className="w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            >
              {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-200">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Income Source</span>
            <select
              value={acceptForm.incomeSource}
              onChange={(e) => setAcceptForm((prev) => ({ ...prev, incomeSource: e.target.value }))}
              className="w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            >
              {INCOME_SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <SearchableSelectField
            label="Bank"
            value={acceptForm.bankName}
            onChange={(value) => setAcceptForm((prev) => ({ ...prev, bankName: String(value || '') }))}
            options={bankOptions}
            placeholder="Search bank"
          />
        </form>
      </Modal>

      <Modal
        open={loanOpen}
        onClose={() => setLoanOpen(false)}
        title="Apply Loan On Behalf"
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setLoanOpen(false)} disabled={loanSaving}>Cancel</Button>
            <Button onClick={submitLoanOnBehalf} disabled={loanSaving}>{loanSaving ? 'Submitting...' : 'Submit Loan'}</Button>
          </>
        )}
      >
        <form className="grid grid-cols-1 gap-4" onSubmit={submitLoanOnBehalf}>
          <SearchableSelectField
            label="Loan Product"
            value={loanForm.productCode}
            onChange={(value) => setLoanForm((prev) => ({ ...prev, productCode: value }))}
            options={loanProductOptions}
            placeholder="Select product"
          />
          <label className="block text-sm text-slate-700 dark:text-slate-200">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Amount</span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={loanForm.amount}
              onChange={(e) => setLoanForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
            />
          </label>
        </form>
      </Modal>
    </div>
  );
};

export default InviteDetails;
