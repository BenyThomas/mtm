import gatewayApi from '../gatewayAxios';

function unwrap(r) {
  const body = r?.data;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export async function listGwLoans(params) {
  const r = await gatewayApi.get('/ops/loans', { params });
  return unwrap(r);
}

export async function listGwArrearsLoans(params) {
  const r = await gatewayApi.get('/ops/loans/arrears', { params });
  return unwrap(r);
}

export async function listGwBotArrearsLoans(params) {
  const r = await gatewayApi.get('/ops/loans/arrears/bot', { params });
  return unwrap(r);
}

export async function getGwLoan(platformLoanId) {
  const r = await gatewayApi.get(`/ops/loans/${encodeURIComponent(platformLoanId)}`);
  return unwrap(r);
}

export async function createGwLoan(payload) {
  const r = await gatewayApi.post('/ops/loans', payload);
  return unwrap(r);
}

export async function applyGwLoanOnBehalf(customerId, payload) {
  const r = await gatewayApi.post(`/ops/loans/customers/${encodeURIComponent(customerId)}/apply`, payload);
  return unwrap(r);
}

export async function getGwLoanEligibilityForCustomer(customerId, payload) {
  const r = await gatewayApi.post(`/ops/loans/customers/${encodeURIComponent(customerId)}/eligibility`, payload || {});
  return unwrap(r);
}

export async function replaceGwLoan(platformLoanId, payload) {
  const r = await gatewayApi.put(`/ops/loans/${encodeURIComponent(platformLoanId)}`, payload);
  return unwrap(r);
}

export async function patchGwLoan(platformLoanId, patch) {
  const r = await gatewayApi.patch(`/ops/loans/${encodeURIComponent(platformLoanId)}`, patch);
  return unwrap(r);
}

export async function deleteGwLoan(platformLoanId) {
  await gatewayApi.delete(`/ops/loans/${encodeURIComponent(platformLoanId)}`);
}

export async function approveGwLoan(platformLoanId, payload) {
  const r = await gatewayApi.post(`/ops/loans/${encodeURIComponent(platformLoanId)}/approve`, payload);
  return unwrap(r);
}

export async function disburseGwLoan(platformLoanId, payload) {
  const r = await gatewayApi.post(`/ops/loans/${encodeURIComponent(platformLoanId)}/disburse`, payload);
  return unwrap(r);
}

export async function getGwLoanWorkflow(platformLoanId) {
  const r = await gatewayApi.get(`/ops/loans/${encodeURIComponent(platformLoanId)}/workflow`);
  return unwrap(r);
}

export async function getGwLoanSchedule(platformLoanId) {
  const r = await gatewayApi.get(`/ops/loans/${encodeURIComponent(platformLoanId)}/schedule`);
  return unwrap(r);
}

export async function downloadGwLoanSchedule(platformLoanId, format = 'pdf') {
  const r = await gatewayApi.get(`/ops/loans/${encodeURIComponent(platformLoanId)}/schedule/export`, {
    params: { format },
    responseType: 'blob',
  });
  return r;
}

export async function getGwLoanTransactions(platformLoanId) {
  const r = await gatewayApi.get(`/ops/loans/${encodeURIComponent(platformLoanId)}/transactions`);
  return unwrap(r);
}

export async function getGwLoanTransaction(platformLoanId, transactionId) {
  const r = await gatewayApi.get(`/ops/loans/${encodeURIComponent(platformLoanId)}/transactions/${encodeURIComponent(transactionId)}`);
  return unwrap(r);
}

export async function adjustGwLoanTransaction(platformLoanId, transactionId, payload) {
  const r = await gatewayApi.post(`/ops/loans/${encodeURIComponent(platformLoanId)}/transactions/${encodeURIComponent(transactionId)}`, payload);
  return unwrap(r);
}

export async function reverseGwLoanTransaction(platformLoanId, transactionId, payload) {
  const r = await gatewayApi.post(`/ops/loans/${encodeURIComponent(platformLoanId)}/transactions/${encodeURIComponent(transactionId)}/reverse`, payload || {});
  return unwrap(r);
}

export async function runGwLoanAction(platformLoanId, action, payload) {
  const r = await gatewayApi.post(`/ops/loans/${encodeURIComponent(platformLoanId)}/actions/${encodeURIComponent(action)}`, payload || {});
  return unwrap(r);
}

export async function repayGwLoanMobile(platformLoanId, payload) {
  const r = await gatewayApi.post(`/ops/loans/${encodeURIComponent(platformLoanId)}/repayments/mobile`, payload);
  return unwrap(r);
}

export async function repayGwLoanViaSelcomUssdPush(platformLoanId, payload) {
  const r = await gatewayApi.post(`/ops/loans/${encodeURIComponent(platformLoanId)}/repayments/selcom-ussd-push`, payload);
  return unwrap(r);
}
