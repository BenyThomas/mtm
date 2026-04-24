import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import SearchableSelectField from '../../../components/SearchableSelectField';
import { createInvite } from '../../../api/gateway/invites';
import useInviteCatalog from '../../../hooks/useInviteCatalog';
import useStaff from '../../../hooks/useStaff';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';

const InviteNew = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { catalog, loading: catalogLoading } = useInviteCatalog();
  const { staff, loading: staffLoading } = useStaff({ activeOnly: true });

  const [campaignCode, setCampaignCode] = useState('');
  const [referrerId, setReferrerId] = useState('');
  const [channel, setChannel] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [multiUse, setMultiUse] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const campaignOptions = (catalog?.campaigns || []).map((item) => ({ id: item.code, label: `${item.name || item.code} (${item.code})` }));
  const channelOptions = (catalog?.channels || []).map((item) => ({ id: item.code, label: `${item.name || item.code} (${item.code})` }));
  const staffOptions = staff.map((item) => ({ id: String(item.id), label: `${item.displayName}${item.officeName ? ` - ${item.officeName}` : ''} (${item.id})` }));
  const loggedInStaffId = String(user?.staffId || '');
  const isLoanOfficerUser = Boolean(user?.isGatewayOnlyLoanOfficer || user?.linkedStaffIsLoanOfficer || user?.isLoanOfficer);

  React.useEffect(() => {
    if (!campaignCode && campaignOptions.length) {
      setCampaignCode(String(campaignOptions[0].id));
    }
    if (!channel && channelOptions.length) {
      setChannel(String(channelOptions[0].id));
    }
    if (!referrerId && loggedInStaffId) {
      setReferrerId(loggedInStaffId);
    }
  }, [campaignCode, channel, referrerId, campaignOptions, channelOptions, loggedInStaffId]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErr('');
    try {
      if (!phoneNumber.trim() || !firstName.trim() || !middleName.trim() || !lastName.trim()) {
        throw new Error('Phone, first name, middle name, and last name are required');
      }
      const effectiveStaffId = isLoanOfficerUser && loggedInStaffId ? loggedInStaffId : referrerId;
      const payload = {
        campaignCode: campaignCode.trim(),
        referrerId: String(effectiveStaffId || '').trim() || null,
        channel: channel.trim() || null,
        maxUses: Number(maxUses) || null,
        multiUse: !!multiUse,
        prefill: {
          phoneNumber: phoneNumber.trim() || null,
          firstName: firstName.trim() || null,
          middleName: middleName.trim() || null,
          lastName: lastName.trim() || null,
        },
      };
      const created = await createInvite(payload);
      addToast('Invite created', 'success');
      navigate(`/gateway/invites/${encodeURIComponent(created?.inviteId)}`);
    } catch (e2) {
      const msg = e2?.response?.data?.errors?.[0]?.details || e2?.response?.data?.message || e2?.message || 'Create failed';
      setErr(msg);
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">New Invite</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Creates an invite using the backend policy (code/url/token generation).
      </p>

      <div className="mt-4">
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <SearchableSelectField
                  label="Campaign Code"
                  value={campaignCode}
                  onChange={(value) => setCampaignCode(String(value || ''))}
                  options={campaignOptions}
                  placeholder="Search campaign"
                  disabled={catalogLoading}
                  required
                />
              </div>
              <div>
                <SearchableSelectField
                  label="Channel"
                  value={channel}
                  onChange={(value) => setChannel(String(value || ''))}
                  options={channelOptions}
                  placeholder="Search channel"
                  disabled={catalogLoading}
                  required
                />
              </div>
              <div>
                <SearchableSelectField
                  label="Staff"
                  value={referrerId}
                  onChange={(value) => setReferrerId(String(value || ''))}
                  options={staffOptions}
                  placeholder="Search staff"
                  disabled={staffLoading || (isLoanOfficerUser && !!loggedInStaffId)}
                  helperText={isLoanOfficerUser
                    ? 'Your linked staff profile is used automatically for this invite.'
                    : 'Select the staff member responsible for this invite.'}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium">Max Uses</label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 p-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={multiUse}
                      onChange={(e) => setMultiUse(e.target.checked)}
                    />
                    Multi-use
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-sm font-medium">Prefill Phone</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 p-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="2557..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium">First Name</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 p-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Middle Name</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 p-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Last Name</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 p-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            {err ? <p className="text-sm text-red-600">{err}</p> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create'}
              </Button>
              <Button variant="secondary" type="button" onClick={() => navigate(-1)} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default InviteNew;
