import gatewayApi from '../gatewayAxios';

function unwrap(r) {
  const body = r?.data;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export async function listLoanProductsOps() {
  const r = await gatewayApi.get('/ops/loan-products');
  return unwrap(r);
}

export async function getLoanProductOps(productCode) {
  const r = await gatewayApi.get(`/ops/loan-products/${encodeURIComponent(productCode)}`);
  return unwrap(r);
}

export async function createLoanProductOps(payload) {
  const r = await gatewayApi.post('/ops/loan-products', payload);
  return unwrap(r);
}

export async function updateLoanProductOps(productCode, payload) {
  const r = await gatewayApi.put(`/ops/loan-products/${encodeURIComponent(productCode)}`, payload);
  return unwrap(r);
}

export async function setLoanProductDefaultOps(productCode, isDefault) {
  const r = await gatewayApi.patch(`/ops/loan-products/${encodeURIComponent(productCode)}/default`, { isDefault: !!isDefault });
  return unwrap(r);
}

export async function deleteLoanProductOps(productCode) {
  await gatewayApi.delete(`/ops/loan-products/${encodeURIComponent(productCode)}`);
}
