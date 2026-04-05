import gatewayApi from '../gatewayAxios';

function unwrap(r) {
  const body = r?.data;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export async function listGwLoans(params) {
  const r = await gatewayApi.get('/ops/loans', { params });
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

export async function getGwLoanTransactions(platformLoanId) {
  const r = await gatewayApi.get(`/ops/loans/${encodeURIComponent(platformLoanId)}/transactions`);
  return unwrap(r);
}

export async function runGwLoanAction(platformLoanId, action, payload) {
  const r = await gatewayApi.post(`/ops/loans/${encodeURIComponent(platformLoanId)}/actions/${encodeURIComponent(action)}`, payload || {});
  return unwrap(r);
}

export async function repayGwLoanViaSelcomUssdPush(platformLoanId, payload) {
  const r = await gatewayApi.post(`/ops/loans/${encodeURIComponent(platformLoanId)}/repayments/selcom-ussd-push`, payload);
  return unwrap(r);
}
