import gatewayApi from '../gatewayAxios';

function unwrap(response) {
  const body = response?.data;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export async function getCollectionsQueue(params) {
  const response = await gatewayApi.get('/ops/collections', { params });
  return unwrap(response);
}

export async function getCollectionCustomerPosition(customerNumber) {
  const response = await gatewayApi.get(`/ops/collections/customers/${encodeURIComponent(customerNumber)}`);
  return unwrap(response);
}

export async function getCollectionsPaymentConfig() {
  const response = await gatewayApi.get('/ops/config/loan-automation');
  return unwrap(response);
}
