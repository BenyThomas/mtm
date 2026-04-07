import gatewayApi from '../gatewayAxios';

function unwrap(r) {
  const body = r?.data;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export async function getGroupLifecycleConfig() {
  const r = await gatewayApi.get('/ops/config/group-lifecycle');
  return unwrap(r);
}

export async function updateGroupLifecycleConfig(payload) {
  const r = await gatewayApi.put('/ops/config/group-lifecycle', payload);
  return unwrap(r);
}

export async function listCenters() {
  const r = await gatewayApi.get('/ops/centers');
  return unwrap(r);
}

export async function createCenter(payload) {
  const r = await gatewayApi.post('/ops/centers', payload);
  return unwrap(r);
}

export async function getCenter(centerId) {
  const r = await gatewayApi.get(`/ops/centers/${encodeURIComponent(centerId)}`);
  return unwrap(r);
}

export async function assignCenterAdmin(centerId, payload) {
  const r = await gatewayApi.post(`/ops/centers/${encodeURIComponent(centerId)}/admin`, payload);
  return unwrap(r);
}

export async function createGroup(centerId, payload) {
  const r = await gatewayApi.post(`/ops/centers/${encodeURIComponent(centerId)}/groups`, payload);
  return unwrap(r);
}

export async function getGroup(groupId) {
  const r = await gatewayApi.get(`/ops/groups/${encodeURIComponent(groupId)}`);
  return unwrap(r);
}

export async function updateGroup(groupId, payload) {
  const r = await gatewayApi.put(`/ops/groups/${encodeURIComponent(groupId)}`, payload);
  return unwrap(r);
}

export async function deactivateGroup(groupId) {
  const r = await gatewayApi.post(`/ops/groups/${encodeURIComponent(groupId)}/deactivate`);
  return unwrap(r);
}

export async function deleteGroup(groupId) {
  const r = await gatewayApi.delete(`/ops/groups/${encodeURIComponent(groupId)}`);
  return unwrap(r);
}

export async function assignGroupAdmin(groupId, payload) {
  const r = await gatewayApi.post(`/ops/groups/${encodeURIComponent(groupId)}/admin`, payload);
  return unwrap(r);
}

export async function createGroupInvite(groupId, payload) {
  const r = await gatewayApi.post(`/ops/groups/${encodeURIComponent(groupId)}/members/invite`, payload);
  return unwrap(r);
}

export async function createGroupInvitesBulk(groupId, payload) {
  const r = await gatewayApi.post(`/ops/groups/${encodeURIComponent(groupId)}/members/invite/bulk`, payload);
  return unwrap(r);
}

export async function deactivateGroupMember(groupId, customerId, payload) {
  const r = await gatewayApi.post(`/ops/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(customerId)}/deactivate`, payload || {});
  return unwrap(r);
}

export async function removeGroupMember(groupId, customerId, payload) {
  const r = await gatewayApi.post(`/ops/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(customerId)}/remove`, payload || {});
  return unwrap(r);
}
