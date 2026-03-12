import gatewayApi from '../gatewayAxios';

function unwrap(r) {
  // Gateway APIs commonly return { status, code, message, data, meta }
  const body = r?.data;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export async function listInvites(params) {
  const r = await gatewayApi.get('/ops/invites', { params });
  return unwrap(r);
}

export async function getInvite(inviteId) {
  const r = await gatewayApi.get(`/ops/invites/${encodeURIComponent(inviteId)}`);
  return unwrap(r);
}

export async function createInvite(payload) {
  const r = await gatewayApi.post('/ops/invites', payload);
  return unwrap(r);
}

export async function replaceInvite(inviteId, payload) {
  const r = await gatewayApi.put(`/ops/invites/${encodeURIComponent(inviteId)}`, payload);
  return unwrap(r);
}

export async function patchInvite(inviteId, patch) {
  const r = await gatewayApi.patch(`/ops/invites/${encodeURIComponent(inviteId)}`, patch);
  return unwrap(r);
}

export async function deleteInvite(inviteId) {
  await gatewayApi.delete(`/ops/invites/${encodeURIComponent(inviteId)}`);
}

export async function cancelInvite(inviteId) {
  const r = await gatewayApi.post(`/ops/invites/${encodeURIComponent(inviteId)}/cancel`);
  return unwrap(r);
}
