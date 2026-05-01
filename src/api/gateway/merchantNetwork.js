import gatewayApi from '../gatewayAxios';

function unwrap(response) {
  const body = response?.data;
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export async function listMerchantCompanies(params) {
  const response = await gatewayApi.get('/ops/merchant-companies', { params });
  return unwrap(response);
}

export async function getMerchantCompany(merchantCompanyId) {
  const response = await gatewayApi.get(`/ops/merchant-companies/${encodeURIComponent(merchantCompanyId)}`);
  return unwrap(response);
}

export async function createMerchantCompany(payload) {
  const response = await gatewayApi.post('/ops/merchant-companies', payload);
  return unwrap(response);
}

export async function patchMerchantCompany(merchantCompanyId, payload) {
  const response = await gatewayApi.patch(`/ops/merchant-companies/${encodeURIComponent(merchantCompanyId)}`, payload);
  return unwrap(response);
}

export async function listMerchantOutlets(params) {
  const response = await gatewayApi.get('/ops/merchant-outlets', { params });
  return unwrap(response);
}

export async function getMerchantOutlet(merchantOutletId) {
  const response = await gatewayApi.get(`/ops/merchant-outlets/${encodeURIComponent(merchantOutletId)}`);
  return unwrap(response);
}

export async function createMerchantOutlet(merchantCompanyId, payload) {
  const response = await gatewayApi.post(`/ops/merchant-companies/${encodeURIComponent(merchantCompanyId)}/outlets`, payload);
  return unwrap(response);
}

export async function patchMerchantOutlet(merchantOutletId, payload) {
  const response = await gatewayApi.patch(`/ops/merchant-outlets/${encodeURIComponent(merchantOutletId)}`, payload);
  return unwrap(response);
}

export async function listMerchantOutletItems(merchantOutletId, params) {
  const response = await gatewayApi.get(`/ops/merchant-outlets/${encodeURIComponent(merchantOutletId)}/items`, {
    params,
  });
  return unwrap(response);
}

export async function createMerchantOutletItem(merchantOutletId, payload) {
  const response = await gatewayApi.post(
    `/ops/merchant-outlets/${encodeURIComponent(merchantOutletId)}/items`,
    payload
  );
  return unwrap(response);
}

export async function patchMerchantOutletItem(merchantOutletItemId, payload) {
  const response = await gatewayApi.patch(
    `/ops/merchant-outlet-items/${encodeURIComponent(merchantOutletItemId)}`,
    payload
  );
  return unwrap(response);
}

export async function listMerchantAttendants(params) {
  const response = await gatewayApi.get('/ops/merchant-attendants', { params });
  return unwrap(response);
}

export async function getMerchantAttendant(merchantAttendantId) {
  const response = await gatewayApi.get(`/ops/merchant-attendants/${encodeURIComponent(merchantAttendantId)}`);
  return unwrap(response);
}

export async function createMerchantAttendant(merchantOutletId, payload) {
  const response = await gatewayApi.post(`/ops/merchant-outlets/${encodeURIComponent(merchantOutletId)}/attendants`, payload);
  return unwrap(response);
}

export async function patchMerchantAttendant(merchantAttendantId, payload) {
  const response = await gatewayApi.patch(`/ops/merchant-attendants/${encodeURIComponent(merchantAttendantId)}`, payload);
  return unwrap(response);
}

export async function enrollMerchantAttendant(merchantAttendantId) {
  const response = await gatewayApi.post(`/ops/merchant-attendants/${encodeURIComponent(merchantAttendantId)}/enroll`);
  return unwrap(response);
}

export async function listCustomerVehicles(customerId) {
  const response = await gatewayApi.get(`/ops/customers/${encodeURIComponent(customerId)}/vehicles`);
  return unwrap(response);
}

export async function createCustomerVehicle(customerId, payload) {
  const response = await gatewayApi.post(`/ops/customers/${encodeURIComponent(customerId)}/vehicles`, payload);
  return unwrap(response);
}

export async function patchCustomerVehicle(vehicleId, payload) {
  const response = await gatewayApi.patch(`/ops/vehicles/${encodeURIComponent(vehicleId)}`, payload);
  return unwrap(response);
}

export async function listMerchantCreditAccounts(customerId) {
  const response = await gatewayApi.get('/ops/merchant-credit-accounts', { params: { customerId } });
  return unwrap(response);
}

export async function getMerchantCreditAccount(merchantCreditAccountId) {
  const response = await gatewayApi.get(
    `/ops/merchant-credit-accounts/${encodeURIComponent(merchantCreditAccountId)}`
  );
  return unwrap(response);
}

export async function createMerchantCreditAccountFromLoan(platformLoanId, payload) {
  const response = await gatewayApi.post(
    `/ops/merchant-credit-accounts/from-loan/${encodeURIComponent(platformLoanId)}`,
    payload || {}
  );
  return unwrap(response);
}

export async function blockMerchantCreditAccount(merchantCreditAccountId, payload) {
  const response = await gatewayApi.post(
    `/ops/merchant-credit-accounts/${encodeURIComponent(merchantCreditAccountId)}/block`,
    payload || {}
  );
  return unwrap(response);
}

export async function unblockMerchantCreditAccount(merchantCreditAccountId) {
  const response = await gatewayApi.post(
    `/ops/merchant-credit-accounts/${encodeURIComponent(merchantCreditAccountId)}/unblock`
  );
  return unwrap(response);
}

export async function closeMerchantCreditAccount(merchantCreditAccountId, payload) {
  const response = await gatewayApi.post(
    `/ops/merchant-credit-accounts/${encodeURIComponent(merchantCreditAccountId)}/close`,
    payload || {}
  );
  return unwrap(response);
}

export async function adjustMerchantCreditAccount(merchantCreditAccountId, payload) {
  const response = await gatewayApi.post(
    `/ops/merchant-credit-accounts/${encodeURIComponent(merchantCreditAccountId)}/adjust`,
    payload || {}
  );
  return unwrap(response);
}

export async function listMerchantTransactions(params) {
  const response = await gatewayApi.get('/ops/merchant-transactions', { params });
  return unwrap(response);
}

export async function getMerchantTransaction(merchantTransactionId) {
  const response = await gatewayApi.get(`/ops/merchant-transactions/${encodeURIComponent(merchantTransactionId)}`);
  return unwrap(response);
}

export async function reverseMerchantTransaction(merchantTransactionId, payload) {
  const response = await gatewayApi.post(
    `/ops/merchant-transactions/${encodeURIComponent(merchantTransactionId)}/reverse`,
    payload || {}
  );
  return unwrap(response);
}

export async function settleMerchantTransaction(merchantTransactionId, payload) {
  const response = await gatewayApi.post(
    `/ops/merchant-transactions/${encodeURIComponent(merchantTransactionId)}/settle`,
    payload || {}
  );
  return unwrap(response);
}

export async function listMerchantSettlementBatches(params) {
  const response = await gatewayApi.get('/ops/merchant-settlement-batches', { params });
  return unwrap(response);
}

export async function getMerchantSettlementBatch(merchantSettlementBatchId) {
  const response = await gatewayApi.get(
    `/ops/merchant-settlement-batches/${encodeURIComponent(merchantSettlementBatchId)}`
  );
  return unwrap(response);
}

export async function getMerchantSettlementBatchDetail(merchantSettlementBatchId) {
  const response = await gatewayApi.get(
    `/ops/merchant-settlement-batches/${encodeURIComponent(merchantSettlementBatchId)}/detail`
  );
  return unwrap(response);
}

export async function createMerchantSettlementBatch(payload) {
  const response = await gatewayApi.post('/ops/merchant-settlement-batches', payload || {});
  return unwrap(response);
}

export async function payMerchantSettlementBatch(merchantSettlementBatchId, payload) {
  const response = await gatewayApi.post(
    `/ops/merchant-settlement-batches/${encodeURIComponent(merchantSettlementBatchId)}/pay`,
    payload || {}
  );
  return unwrap(response);
}

export async function failMerchantSettlementBatch(merchantSettlementBatchId, payload) {
  const response = await gatewayApi.post(
    `/ops/merchant-settlement-batches/${encodeURIComponent(merchantSettlementBatchId)}/fail`,
    payload || {}
  );
  return unwrap(response);
}

export async function getMerchantSettlementExposureSummary(params) {
  const response = await gatewayApi.get('/ops/merchant-settlement-batches/exposure-summary', { params });
  return unwrap(response);
}
