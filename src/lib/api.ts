import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { ApiResponse, PaginatedResponse } from "@/types";

/**
 * Shared Axios instance for Fineract API.
 * - Base URL from environment variables
 * - Always injects Fineract-Platform-TenantId
 * - Uses Basic Authorization from stored Fineract auth key
 * - Emits "auth:unauthorized" on HTTP 401
 */
const baseURL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
  : "/api/api/v1";

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000, // 30 seconds timeout
});

// Helper function to read from storage
function readFromStorage(key: string): string | null {
  if (typeof window === "undefined") return null;

  // Prefer localStorage, then sessionStorage
  const ls = localStorage.getItem(key);
  if (ls != null) return ls;
  return sessionStorage.getItem(key);
}

// Request interceptor
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window === "undefined") return config;

  const tenant =
    localStorage.getItem("fineract_tenant") ||
    process.env.NEXT_PUBLIC_TENANT ||
    "default";

  const authKey = readFromStorage("fineract_auth_key");

  config.headers = config.headers ?? {};
  config.headers["Fineract-Platform-TenantId"] = tenant;
  config.headers["Content-Type"] = "application/json";

  if (authKey) {
    // Server returns base64(username:password)
    config.headers["Authorization"] = `Basic ${authKey}`;
  } else {
    delete config.headers?.Authorization;
  }

  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    return Promise.reject(error);
  }
);

// Generic API methods with proper typing
export const apiClient = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.get<ApiResponse<T>>(url, config);
    return response.data as T;
  },

  post: async <T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await api.post<ApiResponse<T>>(url, data, config);
    return response.data as T;
  },

  put: async <T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await api.put<ApiResponse<T>>(url, data, config);
    return response.data as T;
  },

  patch: async <T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await api.patch<ApiResponse<T>>(url, data, config);
    return response.data as T;
  },

  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.delete<ApiResponse<T>>(url, config);
    return response.data as T;
  },
};

// Specific API endpoints
export const endpoints = {
  // Authentication
  authentication: "/authentication",

  // Clients
  clients: "/clients",
  client: (id: number) => `/clients/${id}`,

  // Loans
  loans: "/loans",
  loan: (id: number) => `/loans/${id}`,

  // Loan Products
  loanProducts: "/loanproducts",
  loanProduct: (id: number) => `/loanproducts/${id}`,

  // Offices
  offices: "/offices",
  office: (id: number) => `/offices/${id}`,

  // Staff
  staff: "/staff",
  staffMember: (id: number) => `/staff/${id}`,

  // Reports
  reports: "/reports",
  report: (id: string) => `/reports/${id}`,

  // GL Accounts
  glAccounts: "/glaccounts",
  glAccount: (id: number) => `/glaccounts/${id}`,

  // Journal Entries
  journalEntries: "/journalentries",
  journalEntry: (id: number) => `/journalentries/${id}`,

  // Accounting Rules
  accountingRules: "/accountingrules",
  accountingRule: (id: number) => `/accountingrules/${id}`,

  // Financial Activity Mappings
  financialActivityMappings: "/financialactivitymappings",
  financialActivityMapping: (id: number) => `/financialactivitymappings/${id}`,

  // Codes
  codes: "/codes",
  code: (id: number) => `/codes/${id}`,
  codeValues: (codeId: number) => `/codes/${codeId}/codevalues`,
  codeValue: (codeId: number, valueId: number) =>
    `/codes/${codeId}/codevalues/${valueId}`,

  // Global Configurations
  globalConfigurations: "/configurations",
  globalConfiguration: (key: string) => `/configurations/${key}`,

  // Data Tables
  dataTables: "/datatables",
  dataTable: (tableName: string) => `/datatables/${tableName}`,
  dataTableRows: (tableName: string, appTableId: string) =>
    `/datatables/${tableName}/${appTableId}`,

  // Charges
  charges: "/charges",
  charge: (id: number) => `/charges/${id}`,

  // Currencies
  currencies: "/currencies",
  currency: (code: string) => `/currencies/${code}`,

  // Holidays
  holidays: "/holidays",
  holiday: (id: number) => `/holidays/${id}`,

  // Working Days
  workingDays: "/workingdays",

  // Tellers
  tellers: "/tellers",
  teller: (id: number) => `/tellers/${id}`,

  // Share Accounts
  shareAccounts: "/accounts/share",
  shareAccount: (id: number) => `/accounts/share/${id}`,

  // Standing Instructions
  standingInstructions: "/standinginstructions",
  standingInstruction: (id: number) => `/standinginstructions/${id}`,

  // Account Transfers
  accountTransfers: "/accounttransfers",
  accountTransfer: (id: number) => `/accounttransfers/${id}`,

  // Documents
  documents: (entityType: string, entityId: string) =>
    `/documents/${entityType}/${entityId}`,

  // Audit Trails
  audits: "/audits",
  audit: (id: number) => `/audits/${id}`,
} as const;

export default api;
