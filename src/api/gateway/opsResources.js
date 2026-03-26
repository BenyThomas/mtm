import gatewayApi from '../gatewayAxios';

function unwrap(r) {
  const body = r?.data;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export async function listOpsResources(type, params) {
  const r = await gatewayApi.get(`/ops/resources/${encodeURIComponent(type)}`, { params });
  return unwrap(r);
}

export async function getOpsResource(type, id) {
  const r = await gatewayApi.get(`/ops/resources/${encodeURIComponent(type)}/${encodeURIComponent(id)}`);
  return unwrap(r);
}

export async function createOpsResource(type, payload) {
  const r = await gatewayApi.post(`/ops/resources/${encodeURIComponent(type)}`, payload);
  return unwrap(r);
}

export async function deleteOpsResource(type, id) {
  await gatewayApi.delete(`/ops/resources/${encodeURIComponent(type)}/${encodeURIComponent(id)}`);
}
