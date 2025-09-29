import { QueryClient } from "@tanstack/react-query";

// Create a client with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered fresh
      staleTime: 5 * 60 * 1000, // 5 minutes

      // Cache time: how long data stays in cache after component unmounts
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)

      // Retry failed requests
      retry: (failureCount: number, error: any) => {
        // Don't retry on 401 (unauthorized) or 403 (forbidden)
        if (
          error?.response?.status === 401 ||
          error?.response?.status === 403
        ) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },

      // Retry delay with exponential backoff
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus
      refetchOnWindowFocus: false,

      // Refetch on reconnect
      refetchOnReconnect: true,

      // Refetch on mount
      refetchOnMount: true,
    },
    mutations: {
      // Retry failed mutations
      retry: (failureCount: number, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 2 times for server errors
        return failureCount < 2;
      },

      // Retry delay for mutations
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

// Query key factory for consistent key generation
export const queryKeys = {
  // Authentication
  auth: ["auth"] as const,
  user: () => [...queryKeys.auth, "user"] as const,

  // Clients
  clients: ["clients"] as const,
  clientsList: (filters?: any) =>
    [...queryKeys.clients, "list", filters] as const,
  client: (id: number) => [...queryKeys.clients, id] as const,

  // Loans
  loans: ["loans"] as const,
  loansList: (filters?: any) => [...queryKeys.loans, "list", filters] as const,
  loan: (id: number) => [...queryKeys.loans, id] as const,

  // Loan Products
  loanProducts: ["loanProducts"] as const,
  loanProductsList: (filters?: any) =>
    [...queryKeys.loanProducts, "list", filters] as const,
  loanProduct: (id: number) => [...queryKeys.loanProducts, id] as const,

  // Offices
  offices: ["offices"] as const,
  officesList: (filters?: any) =>
    [...queryKeys.offices, "list", filters] as const,
  office: (id: number) => [...queryKeys.offices, id] as const,

  // Staff
  staff: ["staff"] as const,
  staffList: (filters?: any) => [...queryKeys.staff, "list", filters] as const,
  staffMember: (id: number) => [...queryKeys.staff, id] as const,

  // Reports
  reports: ["reports"] as const,
  reportsList: (filters?: any) =>
    [...queryKeys.reports, "list", filters] as const,
  report: (id: string) => [...queryKeys.reports, id] as const,

  // GL Accounts
  glAccounts: ["glAccounts"] as const,
  glAccountsList: (filters?: any) =>
    [...queryKeys.glAccounts, "list", filters] as const,
  glAccount: (id: number) => [...queryKeys.glAccounts, id] as const,

  // Journal Entries
  journalEntries: ["journalEntries"] as const,
  journalEntriesList: (filters?: any) =>
    [...queryKeys.journalEntries, "list", filters] as const,
  journalEntry: (id: number) => [...queryKeys.journalEntries, id] as const,

  // Accounting Rules
  accountingRules: ["accountingRules"] as const,
  accountingRulesList: (filters?: any) =>
    [...queryKeys.accountingRules, "list", filters] as const,
  accountingRule: (id: number) => [...queryKeys.accountingRules, id] as const,

  // Financial Activity Mappings
  financialActivityMappings: ["financialActivityMappings"] as const,
  financialActivityMappingsList: (filters?: any) =>
    [...queryKeys.financialActivityMappings, "list", filters] as const,
  financialActivityMapping: (id: number) =>
    [...queryKeys.financialActivityMappings, id] as const,

  // Codes
  codes: ["codes"] as const,
  codesList: (filters?: any) => [...queryKeys.codes, "list", filters] as const,
  code: (id: number) => [...queryKeys.codes, id] as const,
  codeValues: (codeId: number) =>
    [...queryKeys.codes, codeId, "values"] as const,
  codeValue: (codeId: number, valueId: number) =>
    [...queryKeys.codes, codeId, "values", valueId] as const,

  // Global Configurations
  globalConfigurations: ["globalConfigurations"] as const,
  globalConfigurationsList: (filters?: any) =>
    [...queryKeys.globalConfigurations, "list", filters] as const,
  globalConfiguration: (key: string) =>
    [...queryKeys.globalConfigurations, key] as const,

  // Data Tables
  dataTables: ["dataTables"] as const,
  dataTablesList: (filters?: any) =>
    [...queryKeys.dataTables, "list", filters] as const,
  dataTable: (tableName: string) =>
    [...queryKeys.dataTables, tableName] as const,
  dataTableRows: (tableName: string, appTableId: string) =>
    [...queryKeys.dataTables, tableName, "rows", appTableId] as const,

  // Charges
  charges: ["charges"] as const,
  chargesList: (filters?: any) =>
    [...queryKeys.charges, "list", filters] as const,
  charge: (id: number) => [...queryKeys.charges, id] as const,

  // Currencies
  currencies: ["currencies"] as const,
  currenciesList: (filters?: any) =>
    [...queryKeys.currencies, "list", filters] as const,
  currency: (code: string) => [...queryKeys.currencies, code] as const,

  // Holidays
  holidays: ["holidays"] as const,
  holidaysList: (filters?: any) =>
    [...queryKeys.holidays, "list", filters] as const,
  holiday: (id: number) => [...queryKeys.holidays, id] as const,

  // Working Days
  workingDays: ["workingDays"] as const,

  // Tellers
  tellers: ["tellers"] as const,
  tellersList: (filters?: any) =>
    [...queryKeys.tellers, "list", filters] as const,
  teller: (id: number) => [...queryKeys.tellers, id] as const,

  // Share Accounts
  shareAccounts: ["shareAccounts"] as const,
  shareAccountsList: (filters?: any) =>
    [...queryKeys.shareAccounts, "list", filters] as const,
  shareAccount: (id: number) => [...queryKeys.shareAccounts, id] as const,

  // Standing Instructions
  standingInstructions: ["standingInstructions"] as const,
  standingInstructionsList: (filters?: any) =>
    [...queryKeys.standingInstructions, "list", filters] as const,
  standingInstruction: (id: number) =>
    [...queryKeys.standingInstructions, id] as const,

  // Account Transfers
  accountTransfers: ["accountTransfers"] as const,
  accountTransfersList: (filters?: any) =>
    [...queryKeys.accountTransfers, "list", filters] as const,
  accountTransfer: (id: number) => [...queryKeys.accountTransfers, id] as const,

  // Documents
  documents: (entityType: string, entityId: string) =>
    ["documents", entityType, entityId] as const,

  // Audit Trails
  audits: ["audits"] as const,
  auditsList: (filters?: any) =>
    [...queryKeys.audits, "list", filters] as const,
  audit: (id: number) => [...queryKeys.audits, id] as const,
} as const;
