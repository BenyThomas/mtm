// Core application types for Money Trust Microfinance

export interface User {
  username: string;
  officeName: string;
  staffDisplayName: string;
  roles: string[];
  permissions: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  checking: boolean;
  tenant: string;
  user: User;
  switchTenant: (tenant: string) => void;
  login: (
    username: string,
    password: string,
    remember: boolean,
    tenant?: string
  ) => Promise<void>;
  logout: () => void;
}

export interface Client {
  id: number;
  displayName: string;
  accountNo: string;
  firstname: string;
  lastname: string;
  mobileNo: string;
  emailAddress: string;
  status: string;
  activationDate: string;
  officeId: number;
  officeName: string;
  staffId: number;
  staffName: string;
  active?: boolean;
}

export interface Loan {
  id: number;
  accountNo: string;
  externalId: string;
  status: string;
  clientId: number;
  clientName: string;
  loanProductId: number;
  loanProductName: string;
  principal: number;
  approvedPrincipal: number;
  disbursedAmount: number;
  principalOutstanding: number;
  principalPaid: number;
  interestCharged: number;
  interestOutstanding: number;
  interestPaid: number;
  feeChargesCharged: number;
  feeChargesOutstanding: number;
  feeChargesPaid: number;
  penaltyChargesCharged: number;
  penaltyChargesOutstanding: number;
  penaltyChargesPaid: number;
  totalExpectedRepayment: number;
  totalRepayment: number;
  totalOutstanding: number;
  totalWaived: number;
  totalWrittenOff: number;
  totalRepaymentScheduleDerived: number;
  totalCostsForLoan: number;
  daysInArrears: number;
  overdueDays: number;
  loanType: string;
  currency: string;
  loanBalance: number;
  loanPurposeName: string;
  inArrears: boolean;
}

export interface Office {
  id: number;
  name: string;
  nameDecorated: string;
  externalId: string;
  openingDate: string;
  hierarchy: string;
  parentId: number;
  parentName: string;
}

export interface Staff {
  id: number;
  displayName: string;
  officeId: number;
  officeName: string;
  isLoanOfficer: boolean;
  isActive: boolean;
}

export interface LoanProduct {
  id: number;
  name: string;
  shortName: string;
  description: string;
  currency: string;
  principal: number;
  numberOfRepayments: number;
  repaymentEvery: number;
  repaymentFrequencyType: string;
  interestRatePerPeriod: number;
  annualInterestRate: number;
  interestRateFrequencyType: string;
  amortizationType: string;
  interestType: string;
  interestCalculationPeriodType: string;
  transactionProcessingStrategyCode: string;
  accountingRule: string;
  status: string;
  minPrincipal: number;
  maxPrincipal: number;
  principalThresholdForLastInstalment: number;
  canDefineInstallmentAmount: boolean;
  installmentAmountInMultiplesOf: number;
  allowApprovedDisbursedAmountsOverApplied: boolean;
  maxApprovedDisbursedAmountsOverApplied: number;
  allowApprovedDisbursedAmountsUnderApplied: boolean;
  maxApprovedDisbursedAmountsUnderApplied: number;
  allowPartialPeriodInterestCalcualtion: boolean;
  holdGuaranteeFunds: boolean;
  accountMovesOutOfNPAOnlyOnArrearsCompletion: boolean;
  isInterestRecalculationEnabled: boolean;
  daysInYearType: string;
  daysInMonthType: string;
  canUseForTopup: boolean;
  isEqualAmortization: boolean;
  fixedPrincipalPercentagePerInstallment: number;
  principalVariationsForBulkLoanApproval: string;
  createStandingInstructionAtDisbursement: boolean;
  allowAttributeOverrides: boolean;
  multiDisburseLoan: boolean;
  maxTrancheCount: number;
  outstandingLoanBalance: number;
  principalAmount: number;
  principalPaid: number;
  interestAmount: number;
  interestPaid: number;
  feeChargesAmount: number;
  feeChargesPaid: number;
  penaltyChargesAmount: number;
  penaltyChargesPaid: number;
  totalExpectedRepayment: number;
  totalRepayment: number;
  totalWaived: number;
  totalWrittenOff: number;
  totalOutstanding: number;
  totalCostsForLoan: number;
  totalRepaymentScheduleDerived: number;
  totalWaivedScheduleDerived: number;
  totalWrittenOffScheduleDerived: number;
  totalOutstandingScheduleDerived: number;
  totalCostsForLoanScheduleDerived: number;
  loanSchedule: any[];
  charges: any[];
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  errors?: Array<{
    defaultUserMessage: string;
    developerMessage?: string;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
}

export interface LoadingContextType {
  loading: boolean;
  start: () => void;
  finish: () => void;
}

export interface ToastContextType {
  addToast: (
    message: string,
    type: "success" | "error" | "warning" | "info",
    duration?: number
  ) => void;
  removeToast: (id: string) => void;
  toasts: ToastMessage[];
}

export interface AuthResponse {
  authenticated: boolean;
  base64EncodedAuthenticationKey: string;
  username: string;
  officeName: string;
  staffDisplayName: string;
  roles: string[];
  permissions: string;
}
