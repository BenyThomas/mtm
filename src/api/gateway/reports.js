import gatewayApi from '../gatewayAxios';

function unwrap(r) {
  const body = r?.data;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export async function getGwOpsReport(reportKey, params) {
  const endpointByReport = {
    arrears: '/ops/reports/arrears',
    botClassification: '/ops/reports/bot-classification',
    dailyCollections: '/ops/reports/daily-collections',
    due: '/ops/reports/due',
    par: '/ops/reports/par',
    portfolioOutstanding: '/ops/reports/portfolio-outstanding',
    disbursements: '/ops/reports/disbursements',
    writeOffs: '/ops/reports/write-offs',
    restructured: '/ops/reports/restructured',
    collectionEfficiency: '/ops/reports/collection-efficiency',
    writeOffRecoveries: '/ops/reports/write-off-recoveries',
    aging: '/ops/reports/aging',
    firstPaymentDefault: '/ops/reports/first-payment-default',
    vintage: '/ops/reports/vintage',
    loanOfficerPerformance: '/ops/reports/loan-officer-performance',
    statement: '/ops/reports/statement',
    cashflowProjection: '/ops/reports/cashflow-projection',
    exceptions: '/ops/reports/exceptions',
    regulatorySummary: '/ops/reports/regulatory-summary',
  };

  const endpoint = endpointByReport[reportKey];
  if (!endpoint) {
    throw new Error(`Unsupported report key: ${reportKey}`);
  }
  const r = await gatewayApi.get(endpoint, { params });
  return unwrap(r);
}

export async function downloadGwOpsReport(reportKey, params, format = 'pdf') {
  const endpointByReport = {
    arrears: '/ops/reports/arrears/export',
    botClassification: '/ops/reports/bot-classification/export',
    dailyCollections: '/ops/reports/daily-collections/export',
    due: '/ops/reports/due/export',
    par: '/ops/reports/par/export',
    portfolioOutstanding: '/ops/reports/portfolio-outstanding/export',
    disbursements: '/ops/reports/disbursements/export',
    writeOffs: '/ops/reports/write-offs/export',
    restructured: '/ops/reports/restructured/export',
    collectionEfficiency: '/ops/reports/collection-efficiency/export',
    writeOffRecoveries: '/ops/reports/write-off-recoveries/export',
    aging: '/ops/reports/aging/export',
    firstPaymentDefault: '/ops/reports/first-payment-default/export',
    vintage: '/ops/reports/vintage/export',
    loanOfficerPerformance: '/ops/reports/loan-officer-performance/export',
    statement: '/ops/reports/statement/export',
    cashflowProjection: '/ops/reports/cashflow-projection/export',
    exceptions: '/ops/reports/exceptions/export',
    regulatorySummary: '/ops/reports/regulatory-summary/export',
  };

  const endpoint = endpointByReport[reportKey];
  if (!endpoint) {
    throw new Error(`Unsupported report key: ${reportKey}`);
  }
  return gatewayApi.get(endpoint, {
    params: { ...(params || {}), format },
    responseType: 'blob',
  });
}
