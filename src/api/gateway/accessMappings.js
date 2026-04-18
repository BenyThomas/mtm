import gatewayApi from '../gatewayAxios';

function unwrap(r) {
  const body = r?.data;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export async function getAccessMappingsConfig() {
  const r = await gatewayApi.get('/ops/config/access-mappings');
  return unwrap(r);
}

export async function updateAccessMappingsConfig(payload) {
  const r = await gatewayApi.put('/ops/config/access-mappings', payload);
  return unwrap(r);
}
