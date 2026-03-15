# AzamPay Integration Workflow (Tanzania APIs)

This document provides an end-to-end integration workflow across the full AzamPay API surface used in Tanzania merchant integrations:

- Authentication
- Bill pay and collections
- Partner checkout
- Name lookup
- Disbursement (payouts)
- Transaction status tracking
- Redirect/callback reconciliation

## 1. Environment and Credentials

Required credentials:

- `appName`
- `clientId`
- `clientSecret`
- `X-API-Key`
- `vendorId` and `vendorName` (for partner checkout flows)

Recommended setup:

- Start in sandbox.
- Store credentials in a secrets manager or environment variables.
- Use unique business references for every transaction:
  - `externalId` for checkout/collection
  - `externalReferenceId` for disbursement

## 2. Base URLs and Core Endpoints

Sandbox URLs:

- Auth: `https://authenticator-sandbox.azampay.co.tz/AppRegistration/GenerateToken`
- API base: `https://sandbox.azampay.co.tz`

Core API endpoints:

- `POST /azampay/namelookup`
- `POST /azampay/mno/checkout`
- `POST /azampay/bank/checkout`
- `GET /api/v1/Partner/GetPaymentPartners`
- `POST /api/v1/Partner/PostCheckout`
- `POST /azampay/createtransfer`
- `GET /azampay/gettransactionstatus`

## 3. Shared Authentication Flow

1. Request token with `appName`, `clientId`, `clientSecret`.
2. Save `accessToken` and token expiry.
3. Attach headers on protected endpoints:
   - `Authorization: Bearer <accessToken>`
   - `X-API-Key: <apiKey>`
   - `Content-Type: application/json`
4. Refresh token before expiry to avoid failed payment operations.

## 4. API Coverage Map

`Name Lookup API`:

- Use before debit/disbursement when you must confirm the account owner.
- Inputs are usually provider/bank and target account number.

`MNO Checkout API`:

- Use when collecting from mobile wallet channels.
- Requires payer mobile identity and amount details.

`Bank Checkout API`:

- Use when collecting from bank account rails.
- Requires bank/provider + account details + amount.

`GetPaymentPartners API`:

- Pull supported partners/channels before rendering checkout options.

`PostCheckout API`:

- Generates hosted checkout URL for customer redirection.
- Supports cart/items, currency, amount, and redirect URLs.

`CreateTransfer API`:

- Initiates disbursement from source account to destination account/wallet.

`GetTransactionStatus API`:

- Reconcile asynchronous states for payout and collection transactions.

## 5. Pay Bill / Collection Workflows

### Workflow A: Hosted Partner Checkout (Typical Bill Pay UX)

1. Get token.
2. Optionally call `GET /api/v1/Partner/GetPaymentPartners`.
3. Run `POST /azampay/namelookup` when account-owner validation is needed.
4. Call `POST /api/v1/Partner/PostCheckout` with amount/cart/redirect data.
5. Redirect user to returned checkout URL.
6. User completes payment on AzamPay-hosted page.
7. Handle success/fail redirect and reconcile against status endpoint if needed.

### Workflow B: Direct API Checkout (Server-Initiated Collection)

1. Get token.
2. Optional `Name Lookup`.
3. Call:
   - `POST /azampay/mno/checkout` for wallet
   - `POST /azampay/bank/checkout` for bank
4. Persist AzamPay transaction reference with your `externalId`.
5. Use `GET /azampay/gettransactionstatus` until terminal state.

## 6. Disbursement Workflow

1. Get token.
2. Optional `Name Lookup` on destination account.
3. Call `POST /azampay/createtransfer` using:
   - `source` account object
   - `destination` account object
   - `transferDetails` object (type, amount, date)
   - `externalReferenceId`
4. Store request and response references.
5. Poll `GET /azampay/gettransactionstatus` for final outcome.
6. Mark payout as `SUCCESS` or `FAILED` in your ledger.

## 7. Request Templates

Name lookup:

```json
{
  "bankName": "Tigo",
  "accountNumber": "2557XXXXXXXX"
}
```

Partner post-checkout:

```json
{
  "appName": "YOUR_APP",
  "clientId": "YOUR_CLIENT_ID",
  "vendorId": "YOUR_VENDOR_ID",
  "vendorName": "YOUR_VENDOR_NAME",
  "language": "en",
  "currency": "TZS",
  "externalId": "ORDER-20260315-0001",
  "requestOrigin": "https://yourdomain.com",
  "redirectFailURL": "https://yourdomain.com/payments/fail",
  "redirectSuccessURL": "https://yourdomain.com/payments/success",
  "amount": "1000",
  "cart": {
    "items": [
      { "name": "Bill payment" }
    ]
  }
}
```

Disbursement transfer:

```json
{
  "source": {
    "countryCode": "TZ",
    "fullName": "Source Account Holder",
    "bankName": "azampesa",
    "accountNumber": "2557XXXXXXXX",
    "currency": "TZS"
  },
  "destination": {
    "countryCode": "TZ",
    "fullName": "Beneficiary Name",
    "bankName": "airtel",
    "accountNumber": "2556XXXXXXXX",
    "currency": "TZS"
  },
  "transferDetails": {
    "type": "WALLET_TRANSFER",
    "amount": 5000,
    "date": "2026-03-15T10:00:00Z"
  },
  "externalReferenceId": "PAYOUT-20260315-0009",
  "remarks": "Settlement payout"
}
```

## 8. Reconciliation and State Model

Use one internal state model across all APIs:

- `INITIATED`
- `PENDING`
- `SUCCESS`
- `FAILED`
- `REVERSED` (if your finance process supports reversals)

Implementation notes:

- Treat API submission success as transport-level success, not financial success.
- Move to terminal status only after status check or confirmed callback/redirect result.
- Keep raw provider status and mapped internal status together for auditability.

## 9. Reliability and Security Controls

- Idempotency: never reuse `externalId`/`externalReferenceId`.
- Retry policy: retry network and 5xx errors with same external reference; avoid duplicate business references.
- Validation: enforce provider/channel whitelist and currency (`TZS`) rules.
- Logging: mask PII (account numbers, tokens) and store correlation IDs.
- Monitoring: alert on long-pending and repeated failures.
- Reconciliation job: run periodic status sync for non-terminal transactions.

## 10. Go-Live Checklist

- Sandbox E2E completed for:
  - Name lookup
  - MNO checkout
  - Bank checkout
  - Partner hosted checkout
  - Create transfer
  - Transaction status polling
- Redirect success/fail URLs validated on HTTPS.
- Webhook/callback endpoints (if configured) are public and secured.
- Daily finance reconciliation report available.
- Incident runbook prepared for pending/failed transactions.

## Sources

- https://developerdocs.azampay.co.tz/tanzania/bill-pay-api#name-lookup-api
- https://github.com/flexcodelabs/azampay
