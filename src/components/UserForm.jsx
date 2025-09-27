import React, { useEffect, useMemo, useState } from 'react';
import Button from './Button';
import MiniCombobox from './MiniCombobox';
import MultiSelect from './MultiSelect';
import { getUserTemplate, fetchStaffByOffice } from '../api/users';
import { User, Mail, Shield, Building2, Users as UsersIcon } from 'lucide-react';

const UserForm = ({ initial, onSubmit, submitting, mode = 'create' }) => {
    // Basic
    const [username, setUsername] = useState('');
    const [firstname, setFirstname] = useState('');
    const [lastname, setLastname] = useState('');
    const [email, setEmail] = useState('');

    // Lookups
    const [officeId, setOfficeId] = useState(null);
    const [staffId, setStaffId] = useState(null);
    const [roleIds, setRoleIds] = useState([]); // number[]

    // Flags / optional
    const [sendPasswordToEmail, setSendPasswordToEmail] = useState(true);
    const [passwordNeverExpires, setPasswordNeverExpires] = useState(false);
    const [isSelfServiceUser, setIsSelfServiceUser] = useState(false);
    const [clientsCsv, setClientsCsv] = useState('');

    // Passwords (only used when sendPasswordToEmail === false)
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');

    // Options
    const [officeOpts, setOfficeOpts] = useState([]);
    const [staffOpts, setStaffOpts] = useState([]);
    const [roleOpts, setRoleOpts] = useState([]);

    // Load template (offices + roles)
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const tpl = await getUserTemplate();
                if (!alive) return;

                const offices = (tpl.allowedOffices || []).map(o => ({ id: o.id, label: o.name || `Office ${o.id}` }));
                const avail = (tpl.availableRoles || []).map(r => ({ id: r.id, name: r.name, isSelfService: false }));
                const self = (tpl.selfServiceRoles || []).map(r => ({ id: r.id, name: r.name, isSelfService: true }));
                const byId = new Map();
                [...avail, ...self].forEach(r => {
                    const prev = byId.get(r.id);
                    byId.set(r.id, prev ? { ...prev, isSelfService: prev.isSelfService || r.isSelfService } : r);
                });

                setOfficeOpts(offices);
                setRoleOpts(Array.from(byId.values()));
            } catch {}
        })();
        return () => { alive = false; };
    }, []);

    // Seed from initial (edit)
    useEffect(() => {
        if (initial) {
            setUsername(initial.username || '');
            setFirstname(initial.firstname || initial.firstName || '');
            setLastname(initial.lastname || initial.lastName || '');
            setEmail(initial.email || '');
            const initOffice = initial.officeId || initial.office?.id || null;
            setOfficeId(initOffice);
            setStaffId(initial.staffId || initial.staff?.id || null);
            setRoleIds(Array.isArray(initial.roles) ? initial.roles.map(r => r.id).filter(Boolean) : []);
            setSendPasswordToEmail(true);
            setPasswordNeverExpires(Boolean(initial.passwordNeverExpires));
            setIsSelfServiceUser(Boolean(initial.selfServiceUser || initial.isSelfServiceUser));
            setClientsCsv(Array.isArray(initial.clients) ? initial.clients.join(',') : '');
            setPassword('');
            setRepeatPassword('');
            if (initOffice) {
                (async () => {
                    const st = await fetchStaffByOffice(initOffice);
                    setStaffOpts(st.map(s => ({ id: s.id, label: s.displayName })));
                })();
            } else {
                setStaffOpts([]);
            }
        } else {
            setUsername(''); setFirstname(''); setLastname(''); setEmail('');
            setOfficeId(null); setStaffId(null); setRoleIds([]);
            setSendPasswordToEmail(true);
            setPasswordNeverExpires(false);
            setIsSelfServiceUser(false);
            setClientsCsv('');
            setPassword(''); setRepeatPassword('');
            setStaffOpts([]);
        }
    }, [initial]);

    // Office -> staff options
    useEffect(() => {
        let alive = true;
        (async () => {
            if (!officeId) { setStaffOpts([]); setStaffId(null); return; }
            const st = await fetchStaffByOffice(officeId);
            if (!alive) return;
            setStaffOpts(st.map(s => ({ id: s.id, label: s.displayName })));
            if (!st.some(s => s.id === staffId)) setStaffId(null);
        })();
        return () => { alive = false; };
    }, [officeId]);

    const parseClients = () => {
        const ids = (clientsCsv || '')
            .split(',').map(s => Number(String(s).trim()))
            .filter(n => Number.isFinite(n) && n > 0);
        return Array.from(new Set(ids));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Required fields (create spec)
        if (!username.trim() || !firstname.trim() || !lastname.trim() || !email.trim() || !officeId || roleIds.length === 0) {
            // Let parent toast a message; or add inline messages here if you prefer.
            return;
        }

        const payload = {
            username: username.trim(),
            firstname: firstname.trim(),
            lastname: lastname.trim(),
            email: email.trim(),
            officeId: Number(officeId),
            roles: roleIds.slice(), // array<number>
            sendPasswordToEmail: Boolean(sendPasswordToEmail),
            ...(staffId ? { staffId: Number(staffId) } : {}),
            ...(passwordNeverExpires ? { passwordNeverExpires: true } : {}),
            ...(isSelfServiceUser ? { isSelfServiceUser: true } : {}),
            ...(parseClients().length ? { clients: parseClients() } : {}),
        };

        // If NOT sending password to email, allow manual password entry
        if (!payload.sendPasswordToEmail) {
            if (password || repeatPassword) {
                payload.password = password;
                payload.repeatPassword = repeatPassword || password;
            }
        }

        await onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1 */}
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" /> Username <span className="text-red-600">*</span>
                    </label>
                    <input
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={submitting || mode === 'edit'}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" /> Email <span className="text-red-600">*</span>
                    </label>
                    <input
                        type="email"
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={submitting}
                        required
                    />
                </div>
            </div>

            {/* Row 2 */}
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">First name <span className="text-red-600">*</span></label>
                    <input
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        value={firstname}
                        onChange={(e) => setFirstname(e.target.value)}
                        disabled={submitting}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Last name <span className="text-red-600">*</span></label>
                    <input
                        className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                        value={lastname}
                        onChange={(e) => setLastname(e.target.value)}
                        disabled={submitting}
                        required
                    />
                </div>
            </div>

            {/* Row 3: Office & Staff comboboxes */}
            <div className="grid md:grid-cols-2 gap-4">
                <MiniCombobox
                    label={(<span className="inline-flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-500" /> Office</span>)}
                    value={officeId}
                    onChange={setOfficeId}
                    options={officeOpts}
                    placeholder="Type to search office…"
                    disabled={submitting}
                    required
                />
                <MiniCombobox
                    label={(<span className="inline-flex items-center gap-2"><UsersIcon className="w-4 h-4 text-gray-500" /> Staff (by office)</span>)}
                    value={staffId}
                    onChange={setStaffId}
                    options={staffOpts}
                    placeholder={officeId ? 'Type to search staff…' : 'Select office first'}
                    disabled={submitting || !officeId}
                />
            </div>

            <MultiSelect
                label="Roles"
                options={roleOpts}   // [{ id, name, isSelfService? }] from /v1/users/template
                value={roleIds}      // number[]
                onChange={setRoleIds}
                disabled={submitting}
                required
                size={8}
            />

            {/* Flags */}
            <div className="grid md:grid-cols-3 gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={sendPasswordToEmail}
                        onChange={(e) => setSendPasswordToEmail(e.target.checked)}
                        disabled={submitting}
                    />
                    <span>Send password to email</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={passwordNeverExpires}
                        onChange={(e) => setPasswordNeverExpires(e.target.checked)}
                        disabled={submitting}
                    />
                    <span>Password never expires</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={isSelfServiceUser}
                        onChange={(e) => setIsSelfServiceUser(e.target.checked)}
                        disabled={submitting}
                    />
                    <span>Self-service user</span>
                </label>
            </div>

            {/* Passwords appear only when NOT sending to email */}
            {!sendPasswordToEmail && (
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Password</label>
                        <input
                            type="password"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={submitting}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Repeat Password</label>
                        <input
                            type="password"
                            className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                            value={repeatPassword}
                            onChange={(e) => setRepeatPassword(e.target.value)}
                            disabled={submitting}
                        />
                    </div>
                </div>
            )}

            {/* Optional clients */}
            <div>
                <label className="block text-sm font-medium">Clients (IDs, comma-separated)</label>
                <input
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="e.g. 2,3"
                    value={clientsCsv}
                    onChange={(e) => setClientsCsv(e.target.value)}
                    disabled={submitting}
                />
            </div>

            <div className="pt-2">
                <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</Button>
            </div>
        </form>
    );
};

export default UserForm;
