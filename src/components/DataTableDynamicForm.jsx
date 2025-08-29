import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Button from './Button';
import Card from './Card';
import Skeleton from './Skeleton';
import { useToast } from '../context/ToastContext';

/**
 * columns: array of column meta from GET /datatables/{datatable}
 * initial: row data object (for edit) or {}
 * onSubmit(payload): called with { colName: value, ... }
 * submitting: boolean
 */
const DataTableDynamicForm = ({ columns, initial, onSubmit, submitting }) => {
    const { addToast } = useToast();

    const [values, setValues] = useState({});
    const [errors, setErrors] = useState({});
    const [codeOptions, setCodeOptions] = useState({}); // { colName: [{id,name}], ... }
    const [loadingCodes, setLoadingCodes] = useState(false);

    const normCols = useMemo(() => {
        return (Array.isArray(columns) ? columns : []).map((c) => {
            const name = c.columnName || c.name;
            const type = (c.columnType || c.type || c.dataType || '').toString();
            const lower = type.toLowerCase();
            const mandatory = !!(c.mandatory || c.isMandatory === true || c.nullable === false);
            const length = c.length || c.size || undefined;
            const code = c.code || c.codeName || c.code_id || c.codeId || null; // best-effort
            return { raw: c, name, type, lower, mandatory, length, code };
        }).filter((c) => !!c.name);
    }, [columns]);

    useEffect(() => {
        const v = {};
        normCols.forEach((c) => {
            let val = initial?.[c.name];
            if (val == null) {
                if (c.lower.includes('boolean')) val = false;
                else val = '';
            }
            // Dates normalize to yyyy-MM-dd
            if ((c.lower.includes('date') || c.lower.includes('time')) && Array.isArray(val) && val.length >= 3) {
                const [y,m,d] = val;
                val = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            }
            v[c.name] = val;
        });
        setValues(v);
        setErrors({});
    }, [normCols, initial]);

    // Load code values for columns with code info
    useEffect(() => {
        const colsWithCode = normCols.filter((c) => c.code);
        if (!colsWithCode.length) return;
        let cancelled = false;
        (async () => {
            setLoadingCodes(true);
            const map = {};
            for (const c of colsWithCode) {
                try {
                    // Code can be id or name; try name then id
                    let res;
                    try {
                        res = await api.get(`/codes/${encodeURIComponent(c.code)}`);
                    } catch {
                        res = await api.get(`/codes/${Number(c.code)}`);
                    }
                    const codeId = res?.data?.id ?? c.code;
                    const vals = await api.get(`/codes/${codeId}/codevalues`);
                    const list = Array.isArray(vals.data) ? vals.data : (vals.data?.pageItems || []);
                    map[c.name] = list.map((v) => ({ id: v.id, name: v.name }));
                } catch (e) {
                    map[c.name] = [];
                }
            }
            if (!cancelled) setCodeOptions(map);
            setLoadingCodes(false);
        })();
        return () => { cancelled = true; };
    }, [normCols]);

    const setVal = (name, val) => {
        setValues((prev) => ({ ...prev, [name]: val }));
        if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
    };

    const validate = () => {
        const e = {};
        normCols.forEach((c) => {
            const v = values[c.name];
            if (c.mandatory && (v === '' || v == null)) e[c.name] = 'Required';
            if (c.length && typeof v === 'string' && v.length > c.length) {
                e[c.name] = `Max length ${c.length}`;
            }
        });
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        if (!validate()) {
            addToast('Please fix validation errors', 'error');
            return;
        }
        await onSubmit(values);
    };

    const inputFor = (c) => {
        const v = values[c.name];
        if (codeOptions[c.name]) {
            return (
                <select
                    value={v ?? ''}
                    onChange={(e) => setVal(c.name, e.target.value)}
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                    disabled={loadingCodes}
                >
                    <option value="">{loadingCodes ? 'Loading…' : 'Select…'}</option>
                    {codeOptions[c.name].map((o) => (
                        <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                </select>
            );
        }

        if (c.lower.includes('boolean')) {
            return (
                <label className="inline-flex items-center gap-2 mt-2">
                    <input
                        type="checkbox"
                        checked={!!v}
                        onChange={(e) => setVal(c.name, e.target.checked)}
                    />
                    <span>Yes</span>
                </label>
            );
        }
        if (c.lower.includes('date')) {
            return (
                <input
                    type="date"
                    value={v ?? ''}
                    onChange={(e) => setVal(c.name, e.target.value)}
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                />
            );
        }
        if (c.lower.includes('decimal') || c.lower.includes('number') || c.lower.includes('int')) {
            return (
                <input
                    type="number"
                    value={v ?? ''}
                    onChange={(e) => setVal(c.name, e.target.value)}
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                />
            );
        }
        if (c.lower.includes('text') || c.length > 255) {
            return (
                <textarea
                    rows={3}
                    value={v ?? ''}
                    onChange={(e) => setVal(c.name, e.target.value)}
                    className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
                />
            );
        }
        return (
            <input
                value={v ?? ''}
                onChange={(e) => setVal(c.name, e.target.value)}
                className="mt-1 w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"
            />
        );
    };

    if (!normCols.length) {
        return <Card><Skeleton height="6rem" /></Card>;
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    {normCols.map((c) => (
                        <div key={c.name}>
                            <label className="block text-sm font-medium">
                                {c.name} {c.mandatory ? '*' : ''}
                            </label>
                            {inputFor(c)}
                            {errors[c.name] ? (
                                <p className="text-xs text-red-500 mt-1">{errors[c.name]}</p>
                            ) : null}
                        </div>
                    ))}
                </div>
            </Card>
            <div className="flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : 'Save'}
                </Button>
            </div>
        </form>
    );
};

export default DataTableDynamicForm;
