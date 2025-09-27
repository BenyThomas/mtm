import api from './axios';

/** Generate collection sheet (individual) for an office for a given meeting date */
export const generateCollectionSheet = async ({ officeId, transactionDate, locale = 'en', dateFormat = 'yyyy-MM-dd' }) => {
    const payload = { officeId, transactionDate, locale, dateFormat };
    const { data } = await api.post('/collectionsheet', payload, {
        params: { command: 'generateCollectionSheet' },
    });
    return data || {};
};

/** Save (bulk) repayments & savings from the sheet */
export const saveCollectionSheet = async ({
                                              officeId,
                                              transactionDate,
                                              locale = 'en',
                                              dateFormat = 'yyyy-MM-dd',
                                              bulkRepaymentTransactions = [],
                                              bulkSavingsDueTransactions = [],
                                              actualDisbursementDate, // optional
                                          }) => {
    const payload = {
        officeId,
        transactionDate,
        locale,
        dateFormat,
        ...(actualDisbursementDate ? { actualDisbursementDate } : {}),
        bulkDisbursementTransactions: {
            bulkRepaymentTransactions,
            bulkSavingsDueTransactions,
        },
    };

    const { data } = await api.post('/collectionsheet', payload, {
        params: { command: 'saveCollectionSheet' },
    });
    return data || {};
};
