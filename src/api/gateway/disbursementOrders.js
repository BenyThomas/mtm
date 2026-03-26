import gatewayApi from '../gatewayAxios';

const unwrap = (r) => (r?.data?.data != null ? r.data.data : r?.data);

export async function listDisbursementOrders(params) {
  const r = await gatewayApi.get('/ops/disbursement-orders', { params });
  return unwrap(r);
}

export async function getDisbursementOrder(orderId) {
  const r = await gatewayApi.get(`/ops/disbursement-orders/${encodeURIComponent(orderId)}`);
  return unwrap(r);
}

export async function getDisbursementOrderStatus(orderId) {
  const r = await gatewayApi.get(`/ops/disbursement-orders/${encodeURIComponent(orderId)}/status-check`);
  return unwrap(r);
}

export async function refreshDisbursementOrderStatus(orderId) {
  const r = await gatewayApi.post(`/ops/disbursement-orders/${encodeURIComponent(orderId)}/status-check`);
  return unwrap(r);
}

export async function retryDisbursementOrder(orderId) {
  const r = await gatewayApi.post('/ops/actions/retry-disbursement', { orderId });
  return unwrap(r);
}
