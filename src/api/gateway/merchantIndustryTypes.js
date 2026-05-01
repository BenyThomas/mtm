import gatewayApi from '../gatewayAxios';

const unwrap = (r) => (r?.data?.data != null ? r.data.data : r?.data);

export async function listMerchantIndustryTypesOps(params) {
  const r = await gatewayApi.get('/ops/merchant-industry-types', { params });
  return unwrap(r);
}

export async function createMerchantIndustryTypeOps(payload) {
  const r = await gatewayApi.post('/ops/merchant-industry-types', payload);
  return unwrap(r);
}

export async function updateMerchantIndustryTypeOps(merchantIndustryTypeId, payload) {
  const r = await gatewayApi.put(`/ops/merchant-industry-types/${encodeURIComponent(merchantIndustryTypeId)}`, payload);
  return unwrap(r);
}

export async function patchMerchantIndustryTypeOps(merchantIndustryTypeId, payload) {
  const r = await gatewayApi.patch(`/ops/merchant-industry-types/${encodeURIComponent(merchantIndustryTypeId)}`, payload);
  return unwrap(r);
}

export async function listMerchantIndustryTypeLookup(query) {
  const r = await gatewayApi.get('/lookups/merchant-industry-types', { params: query ? { q: query } : undefined });
  return unwrap(r);
}
