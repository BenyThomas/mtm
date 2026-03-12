import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import { createInvite } from '../../../api/gateway/invites';
import { useToast } from '../../../context/ToastContext';

const InviteNew = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [campaignCode, setCampaignCode] = useState('');
  const [referrerId, setReferrerId] = useState('');
  const [channel, setChannel] = useState('AGENT');
  const [maxUses, setMaxUses] = useState(1);
  const [multiUse, setMultiUse] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErr('');
    try {
      const payload = {
        campaignCode: campaignCode.trim(),
        referrerId: referrerId.trim() || null,
        channel: channel.trim() || null,
        maxUses: Number(maxUses) || null,
        multiUse: !!multiUse,
        prefill: {
          phoneNumber: phoneNumber.trim() || null,
          firstName: firstName.trim() || null,
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
                <label className="block text-sm font-medium">Campaign Code</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 p-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                  value={campaignCode}
                  onChange={(e) => setCampaignCode(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Channel</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 p-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Referrer Id</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 p-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                  value={referrerId}
                  onChange={(e) => setReferrerId(e.target.value)}
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Last Name</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 p-2 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
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

