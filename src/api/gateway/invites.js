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

export async function getInviteOnboarding(inviteId) {
  const r = await gatewayApi.get(`/ops/invites/${encodeURIComponent(inviteId)}/onboarding`);
  return unwrap(r);
}

export async function createInvite(payload) {
  const r = await gatewayApi.post('/ops/invites', payload);
  return unwrap(r);
}

export async function getInviteCatalogConfig() {
  const r = await gatewayApi.get('/ops/config/invite-catalog');
  return unwrap(r);
}

export async function updateInviteCatalogConfig(payload) {
  const r = await gatewayApi.put('/ops/config/invite-catalog', payload);
  return unwrap(r);
}

export async function listInviteCampaigns(params) {
  const r = await gatewayApi.get('/ops/invite-campaigns', { params });
  return unwrap(r);
}

export async function createInviteCampaign(payload) {
  const r = await gatewayApi.post('/ops/invite-campaigns', payload);
  return unwrap(r);
}

export async function updateInviteCampaign(inviteCampaignId, payload) {
  const r = await gatewayApi.put(`/ops/invite-campaigns/${encodeURIComponent(inviteCampaignId)}`, payload);
  return unwrap(r);
}

export async function deleteInviteCampaign(inviteCampaignId) {
  await gatewayApi.delete(`/ops/invite-campaigns/${encodeURIComponent(inviteCampaignId)}`);
}

export async function listInviteChannels(params) {
  const r = await gatewayApi.get('/ops/invite-channels', { params });
  return unwrap(r);
}

export async function createInviteChannel(payload) {
  const r = await gatewayApi.post('/ops/invite-channels', payload);
  return unwrap(r);
}

export async function updateInviteChannel(inviteChannelId, payload) {
  const r = await gatewayApi.put(`/ops/invite-channels/${encodeURIComponent(inviteChannelId)}`, payload);
  return unwrap(r);
}

export async function deleteInviteChannel(inviteChannelId) {
  await gatewayApi.delete(`/ops/invite-channels/${encodeURIComponent(inviteChannelId)}`);
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

export async function acceptInviteOnBehalf(inviteId, payload) {
  const r = await gatewayApi.post(`/ops/invites/${encodeURIComponent(inviteId)}/accept-on-behalf`, payload);
  return unwrap(r);
}
