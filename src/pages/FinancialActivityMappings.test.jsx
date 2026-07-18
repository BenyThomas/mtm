import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import api from '../api/axios';
import FinancialActivityMappings from './FinancialActivityMappings';
import FinancialActivityMappingDetails from './FinancialActivityMappingDetails';

const testState = vi.hoisted(() => ({
    permissions: new Set(),
    addToast: vi.fn(),
}));

vi.mock('../api/axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        can: (code) => testState.permissions.has(code) || testState.permissions.has('ALL_FUNCTIONS'),
    }),
}));

vi.mock('../context/ToastContext', () => ({
    useToast: () => ({ addToast: testState.addToast }),
}));

const template = {
    financialActivityOptions: [
        { id: 200, name: 'Loan Disbursement' },
        { id: 201, name: 'Repayment Recovery' },
    ],
    glAccountOptions: {
        assetAccountOptions: [{ id: 10, glCode: '1000', name: 'Cash on Hand', type: { value: 'ASSET' } }],
        incomeAccountOptions: [{ id: 11, glCode: '4000', name: 'Fee Income', type: { value: 'INCOME' } }],
    },
};

const glAccounts = [
    { id: 10, glCode: '1000', name: 'Cash on Hand' },
    { id: 11, glCode: '4000', name: 'Fee Income' },
];

const renderList = () => render(
    <MemoryRouter initialEntries={['/accounting/financial-activity-mappings']}>
        <Routes>
            <Route path="/accounting/financial-activity-mappings" element={<FinancialActivityMappings />} />
        </Routes>
    </MemoryRouter>
);

const renderDetails = (path = '/accounting/financial-activity-mappings/200') => render(
    <MemoryRouter initialEntries={[path]}>
        <Routes>
            <Route path="/accounting/financial-activity-mappings/:id" element={<FinancialActivityMappingDetails />} />
            <Route path="/accounting/financial-activity-mappings" element={<div>Mappings index</div>} />
        </Routes>
    </MemoryRouter>
);

const mockListApis = ({ mappings = [{ id: 7, financialActivityId: 200, glAccountId: 10 }] } = {}) => {
    api.get.mockImplementation((url) => {
        if (url === '/financialactivityaccounts') return Promise.resolve({ data: mappings });
        if (url === '/financialactivityaccounts/template') return Promise.resolve({ data: template });
        if (url === '/glaccounts') return Promise.resolve({ data: glAccounts });
        return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
};

beforeEach(() => {
    vi.clearAllMocks();
    testState.addToast.mockClear();
    testState.permissions = new Set([
        'CREATE_FINANCIALACTIVITYACCOUNT',
        'UPDATE_FINANCIALACTIVITYACCOUNT',
        'DELETE_FINANCIALACTIVITYACCOUNT',
    ]);
    api.post.mockResolvedValue({ data: { resourceId: 8 } });
    api.put.mockResolvedValue({ data: {} });
    api.delete.mockResolvedValue({ data: {} });
});

afterEach(() => {
    cleanup();
});

describe('Financial activity mapping behavior', () => {
    it('normalizes template activity and GL account names in the mapping list', async () => {
        mockListApis();

        renderList();

        const activity = await screen.findByText('Loan Disbursement');
        const row = activity.closest('tr');

        expect(within(row).getByText('7')).toBeInTheDocument();
        expect(within(row).getByText('200')).toBeInTheDocument();
        expect(within(row).getByText('10')).toBeInTheDocument();
        expect(within(row).getByText(/1000.*Cash on Hand/)).toBeInTheDocument();
    });

    it('posts the expected create payload from selected template options', async () => {
        const user = userEvent.setup();
        mockListApis({ mappings: [] });

        renderList();

        await user.click(await screen.findByRole('button', { name: /new mapping/i }));

        const activitySelect = await screen.findByRole('combobox', { name: /financial activity/i });
        await user.click(activitySelect);
        await user.click(await screen.findByRole('option', { name: /200.*Loan Disbursement/i }));

        const glSelect = screen.getByRole('combobox', { name: /gl account/i });
        await user.click(glSelect);
        await user.click(await screen.findByRole('option', { name: /1000.*Cash on Hand/i }));

        await user.click(screen.getByRole('button', { name: /create mapping/i }));

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/financialactivityaccounts', {
                financialActivityId: 200,
                glAccountId: 10,
            });
        });
    });
    it('expands a mapping row for view and opens edit in a modal', async () => {
        const user = userEvent.setup();
        mockListApis();

        renderList();

        await screen.findByText('Loan Disbursement');

        await user.click(screen.getByRole('button', { name: /^view$/i }));
        expect(screen.getByText('GL Type')).toBeInTheDocument();
        expect(screen.getByText('ASSET')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /^edit$/i }));
        const activitySelect = await screen.findByRole('combobox', { name: /financial activity/i });
        const glSelect = await screen.findByRole('combobox', { name: /gl account/i });

        expect(activitySelect).toHaveValue('200 - Loan Disbursement');
        expect(glSelect).toHaveValue('1000 - Cash on Hand (ASSET)');
    });

    it('shows clear 404 details and a missing-mapping create path', async () => {
        api.get.mockImplementation((url) => {
            if (url === '/financialactivityaccounts/200') {
                return Promise.reject({
                    response: {
                        status: 404,
                        data: {
                            defaultUserMessage: 'The requested resource is not available.',
                            errors: [{
                                defaultUserMessage: 'Financial Activity account with for the financial Activity with Id 200 does not exist',
                                args: [{ value: 200 }],
                            }],
                        },
                    },
                });
            }
            if (url === '/financialactivityaccounts/template') return Promise.resolve({ data: template });
            if (url === '/glaccounts') return Promise.resolve({ data: glAccounts });
            return Promise.reject(new Error(`Unexpected GET ${url}`));
        });

        renderDetails();

        expect(await screen.findByText('Mapping not found')).toBeInTheDocument();
        expect(screen.getByText(/financial Activity with Id 200 does not exist/i)).toBeInTheDocument();
        expect(screen.getByText('Requested Mapping ID')).toBeInTheDocument();
        expect(screen.getByText('Detected Financial Activity ID')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create mapping for activity 200/i })).toBeInTheDocument();
    });

    it('hides create and delete actions and downgrades edit labels without write permissions', async () => {
        testState.permissions = new Set();
        mockListApis();

        renderList();

        await screen.findByText('Loan Disbursement');

        expect(screen.queryByRole('button', { name: /new mapping/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^view$/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /view \/ edit/i })).not.toBeInTheDocument();
    });
});
