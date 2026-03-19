import gatewayApi from '../gatewayAxios';

function unwrap(r) {
  const body = r?.data;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export async function listKycQuestions(context = 'FUEL') {
  const r = await gatewayApi.get('/ops/kyc/questions', { params: { context } });
  return unwrap(r);
}

export async function createKycQuestion(payload) {
  const r = await gatewayApi.post('/ops/kyc/questions', payload);
  return unwrap(r);
}

export async function updateKycQuestion(questionId, payload) {
  const r = await gatewayApi.put(`/ops/kyc/questions/${encodeURIComponent(questionId)}`, payload);
  return unwrap(r);
}

export async function deleteKycQuestion(questionId) {
  const r = await gatewayApi.delete(`/ops/kyc/questions/${encodeURIComponent(questionId)}`);
  return unwrap(r);
}

export async function getKycPolicy(context = 'FUEL') {
  const r = await gatewayApi.get('/ops/kyc/policy', { params: { context } });
  return unwrap(r);
}

export async function upsertKycPolicy(context = 'FUEL', payload) {
  const r = await gatewayApi.put('/ops/kyc/policy', payload, { params: { context } });
  return unwrap(r);
}

export async function listVerificationTasks(params = {}) {
  const r = await gatewayApi.get('/ops/kyc/verifications', { params });
  return unwrap(r);
}
