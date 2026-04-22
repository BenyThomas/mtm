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
import { applyGwLoanOnBehalf, getGwLoanEligibilityForCustomer } from '../../../api/gateway/loans';
import { listBankNames } from '../../../api/gateway/bankNames';
import { listLoanPurposesOps } from '../../../api/gateway/loanPurposes';

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
const INVITE_READ_PERMISSIONS = ['READ_CLIENT', 'CREATE_CLIENT', 'UPDATE_CLIENT', 'DELETE_CLIENT'];

const normalizeText = (value) => String(value || '').trim().toUpperCase();

const resolveEligibilityMatch = (data, productCode) => {
  const products = Array.isArray(data?.eligibleProducts) ? data.eligibleProducts : [];
  const normalizedCode = normalizeText(productCode);
  const match = products.find((item) => normalizeText(item?.productCode) === normalizedCode) || null;
  if (match) {
    return match;
  }
  if (products.length === 1) {
    return {
      ...products[0],
      allowedTenures: Array.isArray(products[0]?.allowedTenures)
        ? products[0].allowedTenures
        : Array.isArray(data?.eligibility?.allowedTenures)
        ? data.eligibility.allowedTenures
        : [],
      tenureUnit: products[0]?.tenureUnit || data?.tenureUnit || data?.eligibility?.tenureUnit,
    };
  }
  return null;
};

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
  const [loanPurposes, setLoanPurposes] = useState([]);
  const [bankOptions, setBankOptions] = useState([]);
  const [loanProductsLoading, setLoanProductsLoading] = useState(false);
  const [loanProductsReady, setLoanProductsReady] = useState(false);
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
  const [loanForm, setLoanForm] = useState({ productCode: '', amount: '', tenure: '', loanPurposeId: '' });
  const [loanEligibility, setLoanEligibility] = useState(null);
  const [loanEligibilityLoading, setLoanEligibilityLoading] = useState(false);

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
    const customerId = onboarding?.gatewayCustomerId;
    if (!customerId) {
      setLoanProducts([]);
      setLoanProductsLoading(false);
      setLoanProductsReady(false);
      return () => {
        cancelled = true;
      };
    }

    setLoanProductsLoading(true);
    (async () => {
      try {
        const data = await getGwLoanEligibilityForCustomer(customerId, {});
        if (cancelled) return;
        const items = Array.isArray(data?.eligibleProducts) ? data.eligibleProducts : [];
        const normalizedItems = items.filter((item) => item?.productCode);
        setLoanProducts(normalizedItems);
        setLoanProductsReady(true);
        setLoanForm((prev) => {
          const stillExists = normalizedItems.some((item) => String(item?.productCode || '') === String(prev.productCode || ''));
          const nextProductCode = stillExists
            ? prev.productCode
            : (normalizedItems[0]?.productCode ? String(normalizedItems[0].productCode) : '');
          return {
            ...prev,
            productCode: nextProductCode,
            tenure: stillExists ? prev.tenure : '',
          };
        });
      } catch {
        if (!cancelled) {
          setLoanProducts([]);
          setLoanProductsReady(true);
        }
      } finally {
        if (!cancelled) setLoanProductsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onboarding?.gatewayCustomerId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listLoanPurposesOps({
          active: true,
          limit: 500,
          offset: 0,
          orderBy: 'name',
          sortOrder: 'asc',
        });
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        if (!cancelled) {
          setLoanPurposes(items.filter((item) => item?.fineractCodeValueId || item?.loanPurposeId));
        }
      } catch {
        if (!cancelled) setLoanPurposes([]);
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

  useEffect(() => {
    let cancelled = false;
    const customerId = onboarding?.gatewayCustomerId;
    const amount = Number(loanForm.amount);
    const productCode = String(loanForm.productCode || '').trim();

    if (!loanOpen || !customerId || !productCode || !(amount > 0)) {
      setLoanEligibility(null);
      setLoanEligibilityLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoanEligibilityLoading(true);
    (async () => {
      try {
        const requestPayload = {
          productCode,
          requestedAmount: amount,
        };
        let data = await getGwLoanEligibilityForCustomer(customerId, requestPayload);
        if (cancelled) return;
        let resolvedEligibility = resolveEligibilityMatch(data, productCode);
        if (!resolvedEligibility) {
          data = await getGwLoanEligibilityForCustomer(customerId, { productCode });
          if (cancelled) return;
          resolvedEligibility = resolveEligibilityMatch(data, productCode);
        }
        setLoanEligibility(resolvedEligibility);
      } catch (_) {
        if (!cancelled) {
          setLoanEligibility(null);
        }
      } finally {
        if (!cancelled) setLoanEligibilityLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loanOpen, onboarding?.gatewayCustomerId, loanForm.productCode, loanForm.amount]);

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
  const agentName = referrerName || invitedByStaffName;
  const agentContact = referrerContact || invitedByStaffContact;
  const inviteLabel = doc?.campaignCode || doc?.channel || 'Invite';
  const canAcceptOnBehalf = !!doc?.inviteId && !['ACCEPTED', 'CANCELLED', 'EXPIRED'].includes(String(doc?.status || '').toUpperCase());
  const canApplyLoan = !!(onboarding?.gatewayCustomerId || onboarding?.fineractClientId);
  const loanProductOptions = loanProducts.map((item) => ({
    id: String(item?.productCode || ''),
    label: `${item?.productName || item?.name || item?.productCode || 'Product'}${item?.productCode ? ` (${item.productCode})` : ''}`,
  })).filter((item) => item.id);
  const loanPurposeOptions = loanPurposes.map((item) => ({
    id: String(item?.fineractCodeValueId || item?.loanPurposeId || ''),
    label: `${item?.name || item?.code || 'Purpose'}${item?.code ? ` (${item.code})` : ''}`,
  })).filter((item) => item.id);

  const openAcceptModal = () => setAcceptOpen(true);
  const openLoanModal = () => {
    if (onboarding?.gatewayCustomerId && !loanProductsReady && !loanProductsLoading) {
      setLoanProductsReady(false);
    }
    setLoanOpen(true);
  };

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
    if (!loanForm.productCode || !(Number(loanForm.amount) > 0)) {
      addToast('Select a product and enter a valid amount', 'error');
      return;
    }
    if (!loanForm.tenure || !(Number(loanForm.tenure) > 0)) {
      addToast('Enter a valid tenure', 'error');
      return;
    }
    setLoanSaving(true);
    setErr('');
    try {
      const eligibilityData = await getGwLoanEligibilityForCustomer(onboarding.gatewayCustomerId, {
        productCode: loanForm.productCode,
        requestedAmount: Number(loanForm.amount),
      });
      const resolvedEligibility = resolveEligibilityMatch(eligibilityData, loanForm.productCode)
        || resolveEligibilityMatch(await getGwLoanEligibilityForCustomer(onboarding.gatewayCustomerId, {
          productCode: loanForm.productCode,
        }), loanForm.productCode);
      const allowedTenures = Array.isArray(resolvedEligibility?.allowedTenures)
        ? resolvedEligibility.allowedTenures
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0)
        : [];
      const requestedTenure = Number(loanForm.tenure);
      if (allowedTenures.length > 0 && !allowedTenures.includes(requestedTenure)) {
        addToast(`Tenure ${requestedTenure} is not allowed. Allowed: ${allowedTenures.join(', ')}`, 'error');
        return;
      }
      const loan = await applyGwLoanOnBehalf(onboarding.gatewayCustomerId, {
        productCode: loanForm.productCode,
        amount: Number(loanForm.amount),
        tenure: requestedTenure,
        tenureUnit: resolvedEligibility?.tenureUnit || loanEligibility?.tenureUnit || undefined,
        loanPurposeId: loanForm.loanPurposeId ? Number(loanForm.loanPurposeId) : undefined,
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

  const tenureOptions = Array.isArray(loanEligibility?.allowedTenures)
    ? loanEligibility.allowedTenures
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => ({
          value: String(value),
          label: `${value} ${loanEligibility?.tenureUnit || 'Tenure'}`,
        }))
    : [];

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
          <Can any={INVITE_READ_PERMISSIONS}>
            <Button variant="secondary" onClick={load} disabled={loading || saving}>
              Refresh
            </Button>
          </Can>
          <Can any={['UPDATE_CLIENT']}>
            {canAcceptOnBehalf ? (
              <Button onClick={openAcceptModal} disabled={loading || saving || acceptSaving}>
                Accept On Behalf
              </Button>
            ) : null}
          </Can>
          <Can any={['CREATE_LOAN']}>
            {canApplyLoan ? (
              <Button onClick={openLoanModal} disabled={loading || saving || loanSaving || (canApplyLoan && loanProductsLoading && !loanProducts.length)}>
                Apply Loan On Behalf
              </Button>
            ) : null}
          </Can>
          <Can any={['UPDATE_CLIENT']}>
            <Button variant="secondary" onClick={doCancel} disabled={loading || saving}>
              Cancel Invite
            </Button>
          </Can>
          <Can any={['DELETE_CLIENT']}>
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
                    Agent: <strong>{agentName || 'Unassigned'}</strong> | Status: <strong>{doc?.status || '-'}</strong>
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
                <Field label="Agent Contact" value={agentContact} />
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
            onChange={(value) => setLoanForm((prev) => ({ ...prev, productCode: value, tenure: '' }))}
            options={loanProductOptions}
            placeholder={loanProductsLoading ? 'Loading eligible products...' : 'Select product'}
          />
          {!loanProductsLoading && !loanProducts.length ? (
            <div className="text-xs text-amber-600 dark:text-amber-300">
              No eligible loan offers were found for this customer.
            </div>
          ) : null}
          <SearchableSelectField
            label="Loan Purpose"
            value={loanForm.loanPurposeId}
            onChange={(value) => setLoanForm((prev) => ({ ...prev, loanPurposeId: String(value || '') }))}
            options={loanPurposeOptions}
            placeholder="Select purpose"
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
          <label className="block text-sm text-slate-700 dark:text-slate-200">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tenure</span>
            <input
              type="number"
              min="1"
              step="1"
              value={loanForm.tenure}
              onChange={(e) => setLoanForm((prev) => ({ ...prev, tenure: e.target.value }))}
              className="w-full rounded-xl border p-2.5 dark:border-gray-600 dark:bg-gray-700"
              placeholder={loanEligibilityLoading ? 'Loading tenures...' : 'Enter tenure'}
            />
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {loanEligibilityLoading
                ? 'Checking allowed tenures for the selected amount.'
                : tenureOptions.length
                ? `Allowed: ${tenureOptions.map((option) => option.value).join(', ')} ${loanEligibility?.tenureUnit || ''}`.trim()
                : loanEligibility?.recommended?.tenure
                ? `Recommended: ${loanEligibility.recommended.tenure} ${loanEligibility?.tenureUnit || ''}`.trim()
                : loanEligibility?.tenureUnit
                ? `Tenure unit: ${loanEligibility.tenureUnit}`
                : 'Select product and amount to load allowed tenures.'}
            </div>
          </label>
        </form>
      </Modal>
    </div>
  );
};

export default InviteDetails;
