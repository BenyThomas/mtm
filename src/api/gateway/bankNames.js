import gatewayApi from '../gatewayAxios';

const unwrap = (r) => (r?.data?.data != null ? r.data.data : r?.data);

export async function listBankNames(params) {
  const r = await gatewayApi.get('/ops/bank-names', { params });
  return unwrap(r);
}

export async function createBankName(payload) {
  const r = await gatewayApi.post('/ops/bank-names', payload);
  return unwrap(r);
}

export async function updateBankName(bankNameId, payload) {
  const r = await gatewayApi.put(`/ops/bank-names/${encodeURIComponent(bankNameId)}`, payload);
  return unwrap(r);
}

export async function patchBankName(bankNameId, payload) {
  const r = await gatewayApi.patch(`/ops/bank-names/${encodeURIComponent(bankNameId)}`, payload);
  return unwrap(r);
}

export async function deleteBankName(bankNameId) {
  await gatewayApi.delete(`/ops/bank-names/${encodeURIComponent(bankNameId)}`);
}
