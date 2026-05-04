import gatewayApi from '../gatewayAxios';

export async function listNotificationTemplates(params = {}) {
  const { data } = await gatewayApi.get('/ops/notifications/templates', { params });
  return data?.data || data;
}

export async function getNotificationTemplate(templateId) {
  const { data } = await gatewayApi.get(`/ops/notifications/templates/${templateId}`);
  return data?.data || data;
}

export async function createNotificationTemplate(payload) {
  const { data } = await gatewayApi.post('/ops/notifications/templates', payload);
  return data?.data || data;
}

export async function patchNotificationTemplate(templateId, payload) {
  const { data } = await gatewayApi.patch(`/ops/notifications/templates/${templateId}`, payload);
  return data?.data || data;
}

export async function listNotificationDispatches(params = {}) {
  const { data } = await gatewayApi.get('/ops/notifications/dispatches', { params });
  return data?.data || data;
}

export async function getNotificationDispatch(dispatchId) {
  const { data } = await gatewayApi.get(`/ops/notifications/dispatches/${dispatchId}`);
  return data?.data || data;
}

export async function retryNotificationDispatch(dispatchId) {
  const { data } = await gatewayApi.post(`/ops/notifications/dispatches/${dispatchId}/retry`);
  return data?.data || data;
}

export async function triggerRepaymentReminders() {
  const { data } = await gatewayApi.post('/ops/notifications/reminders/trigger');
  return data?.data || data;
}
