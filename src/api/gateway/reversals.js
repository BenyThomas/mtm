import gatewayApi from '../gatewayAxios';

const unwrap = (response) => (response?.data?.data != null ? response.data.data : response?.data);

export async function previewReversal(payload) {
  const response = await gatewayApi.post('/ops/reversals/preview', payload);
  return unwrap(response);
}

export async function createReversal(payload) {
  const response = await gatewayApi.post('/ops/reversals', payload);
  return unwrap(response);
}

export async function listReversals(params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const response = await gatewayApi.get('/ops/reversals', { params: cleanParams });
  return unwrap(response);
}

export async function getReversal(reversalId) {
  const response = await gatewayApi.get(`/ops/reversals/${encodeURIComponent(reversalId)}`);
  return unwrap(response);
}

export async function approveReversal(reversalId) {
  const response = await gatewayApi.post(`/ops/reversals/${encodeURIComponent(reversalId)}/approve`);
  return unwrap(response);
}

export async function executeReversal(reversalId) {
  const response = await gatewayApi.post(`/ops/reversals/${encodeURIComponent(reversalId)}/execute`);
  return unwrap(response);
}

export async function createApproveExecuteReversal(payload) {
  const request = await createReversal(payload);
  const id = request?.id;
  if (!id) return request;
  await approveReversal(id);
  return executeReversal(id);
}
