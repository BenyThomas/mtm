import gatewayApi from '../gatewayAxios';

function unwrap(r) {
  const body = r?.data;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export async function getGwCustomerSummary(customerId) {
  const r = await gatewayApi.get(`/ops/customers/${encodeURIComponent(customerId)}/summary`);
  return unwrap(r);
}

export async function updateGwCustomerProfile(customerId, payload) {
  const r = await gatewayApi.put(`/ops/customers/${encodeURIComponent(customerId)}/profile`, payload);
  return unwrap(r);
}
