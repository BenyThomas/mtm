import gatewayApi from '../gatewayAxios';

function unwrap(r) {
  const body = r?.data;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export async function listLoanPurposesOps(params) {
  const r = await gatewayApi.get('/ops/loan-purposes', { params });
  return unwrap(r);
}

export async function patchLoanPurposeOps(loanPurposeId, payload) {
  const r = await gatewayApi.patch(`/ops/loan-purposes/${encodeURIComponent(loanPurposeId)}`, payload);
  return unwrap(r);
}

export async function syncLoanPurposesOps() {
  const r = await gatewayApi.post('/ops/loan-purposes/sync');
  return unwrap(r);
}
