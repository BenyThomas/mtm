import gatewayApi from '../gatewayAxios';

function unwrap(r) {
  const body = r?.data;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export async function getPerformanceKpis(params) {
  const response = await gatewayApi.get('/ops/performance/kpis', { params });
  return unwrap(response);
}

export async function downloadPerformanceKpis(params, format = 'pdf') {
  return gatewayApi.get('/ops/performance/export', {
    params: { ...(params || {}), format },
    responseType: 'blob',
  });
}
