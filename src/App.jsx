import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Clients from './pages/clients/Clients';
import ClientNew from './pages/ClientNew';
import ClientProfile from './pages/clients/ClientProfile';
import Loans from './pages/Loans';
import LoanApply from './pages/LoanApply';
import LoanDetails from './pages/LoanDetails';
import LoanProducts from './pages/LoanProducts';
import LoanProductNew from './pages/LoanProductNew';
import LoanProductEdit from './pages/LoanProductEdit';
import SavingsAccountDetails from './pages/SavingsAccountDetails';
import Offices from './pages/Offices';
import Staff from './pages/Staff';
import Reports from './pages/Reports';
import RunAccruals from './pages/RunAccruals';
import GlClosures from './pages/GlClosures';
import GlClosureDetails from './pages/GlClosureDetails';
import GlAccounts from './pages/GlAccounts';
import GlAccountDetails from './pages/GlAccountDetails';
import JournalEntries from './pages/JournalEntries';
import JournalEntryDetails from './pages/JournalEntryDetails';
import Provisioning from './pages/Provisioning';
import AccountingRules from './pages/AccountingRules';
import AccountingRuleDetails from './pages/AccountingRuleDetails';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './context/ToastContext';
import { LoadingProvider } from './context/LoadingContext';
import { AuthProvider } from './context/AuthContext';
import FinancialActivityMappingDetails from "./pages/FinancialActivityMappingDetails";
import FinancialActivityMappings from "./pages/FinancialActivityMappings";
import BatchRunner from './pages/BatchRunner'
import AuditDetails from "./pages/AuditDetails";
import Audits from "./pages/Audits";
import AccountNumberFormatDetails from "./pages/AccountNumberFormatDetails";
import AccountNumberFormats from "./pages/AccountNumberFormats";
import BusinessDates from "./pages/BusinessDates";
import Codes from "./pages/Codes";
import CodeValues from "./pages/CodeValues";
import CodeValueDetails from "./pages/CodeValueDetails";
import CodeDetails from "./pages/CodeDetails";
import ExternalServices from "./pages/ExternalServices";
import GlobalConfigurations from "./pages/GlobalConfigurations";
import GlobalConfigDetails from "./pages/GlobalConfigDetails";
import DataTables from "./pages/DataTables";
import DataTableDesigner from "./pages/DataTableDesigner";
import DataTableDetails from "./pages/DataTableDetails";
import DataTableRows from "./pages/DataTableRows";
import DataTableQuery from "./pages/DataTableQuery";
import EntityDatatableChecks from "./pages/EntityDatatableChecks";
import ReportDetails from "./pages/ReportDetails";
import ReportsAdmin from "./pages/ReportsAdmin";
import Documents from "./pages/Documents";
import ExternalEventsConfig from "./pages/ExternalEventsConfig";
import HookDetails from "./pages/HookDetails";
import Hooks from "./pages/Hooks";
import InstanceMode from "./pages/InstanceMode";
import SchedulerJobs from "./pages/SchedulerJobs";
import JobDetails from "./pages/JobDetails";
import ReportMailingJobs from "./pages/ReportMailingJobs";
import ReportMailingJobDetails from "./pages/ReportMailingJobDetails";
import {ExternalAssetOwners, LoanProductAttributes} from "./pages/eao";
import Holidays from "./pages/Holidays";
import HolidayDetails from "./pages/HolidayDetails";
import CurrencyConfig from "./pages/CurrencyConfig";
import OfficeDetails from "./pages/OfficeDetails";
import ProvisioningCriteria from "./pages/ProvisioningCriteria";
import ProvisioningCriteriaDetails from "./pages/ProvisioningCriteriaDetails";
import StaffDetails from "./pages/StaffDetails";
import Tellers from "./pages/tellers/Tellers";
import TellerDetails from "./pages/tellers/TellerDetails";
import WorkingDays from "./pages/WorkingDays";
import AccountTransfers from "./pages/transfers/AccountTransfers";
import StandingInstructions from "./pages/transfers/StandingInstructions";
import StandingInstructionsHistory from "./pages/transfers/StandingInstructionsHistory";
import ShareAccounts from "./pages/shares/ShareAccounts";
import ShareAccountDetails from "./pages/shares/ShareAccountDetails";
import EntityFieldConfig from "./pages/EntityFieldConfig";
import Charges from "./pages/products/Charges";
import ClientCreate from "./pages/clients/ClientCreate";
import ClientEdit from "./pages/clients/ClientEdit";
import CollateralManagement from "./pages/collateral/CollateralManagement";
import LoanCollaterals from "./pages/loans/LoanCollaterals";
import DelinquencyRanges from "./pages/delinquency/DelinquencyRanges";
import DelinquencyBuckets from "./pages/delinquency/DelinquencyBuckets";

const NotFound = () => (
    <div>
        <h1 className="text-2xl font-bold mb-4">Page not found</h1>
        <p>The page you are looking for does not exist.</p>
    </div>
);

const App = () => {
    return (
        <ToastProvider>
            <LoadingProvider>
                <AuthProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Home />} />

                            {/* Clients */}
                            <Route path="clients" element={<Clients />} />
                            <Route path="clients/new" element={<ClientNew />} />
                            <Route path="clients/:id" element={<ClientProfile />} />

                            {/* Loans */}
                            <Route path="loans" element={<Loans />} />
                            <Route path="loans/apply" element={<LoanApply />} />
                            <Route path="loans/:id" element={<LoanDetails />} />

                            {/* Loan Products */}
                            <Route path="loan-products" element={<LoanProducts />} />
                            <Route path="loan-products/new" element={<LoanProductNew />} />
                            <Route path="loan-products/:id/edit" element={<LoanProductEdit />} />

                            {/* Savings */}
                            <Route path="savings/:id" element={<SavingsAccountDetails />} />

                            {/* Admin: Offices & Staff */}
                            <Route path="offices" element={<Offices />} />
                            <Route path="staff" element={<Staff />} />

                            {/* Reports & Accounting */}
                            <Route path="reports" element={<Reports />} />
                            <Route path="accounting/accruals" element={<RunAccruals />} />
                            <Route path="accounting/closures" element={<GlClosures />} />
                            <Route path="accounting/closures/:id" element={<GlClosureDetails />} />
                            <Route path="accounting/gl-accounts" element={<GlAccounts />} />
                            <Route path="accounting/gl-accounts/:id" element={<GlAccountDetails />} />
                            <Route path="accounting/journal-entries" element={<JournalEntries />} />
                            <Route path="accounting/journal-entries/:id" element={<JournalEntryDetails />} />
                            <Route path="accounting/provisioning" element={<Provisioning />} />
                            <Route path="accounting/accounting-rules" element={<AccountingRules />} />
                            <Route path="accounting/accounting-rules/:id" element={<AccountingRuleDetails />} />

                            <Route path="accounting/financial-activity-mappings" element={<FinancialActivityMappings />} />
                            <Route path="accounting/financial-activity-mappings/:id" element={<FinancialActivityMappingDetails />} />

                            <Route path="tools/batch" element={<BatchRunner />} />

                            <Route path="audits" element={<Audits />} />
                            <Route path="audits/:id" element={<AuditDetails />} />

                            <Route path="config/account-number-formats" element={<AccountNumberFormats />} />
                            <Route path="config/account-number-formats/:id" element={<AccountNumberFormatDetails />} />

                            <Route path="config/business-dates" element={<BusinessDates />} />

                            <Route path="config/codes" element={<Codes />} />
                            <Route path="config/codes/:codeId/values" element={<CodeValues />} />
                            <Route path="config/codes/:codeId/values/:valueId" element={<CodeValueDetails />} />

                            <Route path="config/codes" element={<Codes />} />
                            <Route path="config/codes/:codeId" element={<CodeDetails />} />

                            <Route path="config/external-services" element={<ExternalServices />} />

                            <Route path="config/global-config" element={<GlobalConfigurations />} />
                            <Route path="config/global-config/:key" element={<GlobalConfigDetails />} />

                            <Route path="config/datatables" element={<DataTables />} />
                            <Route path="config/datatables/new" element={<DataTableDesigner />} />
                            <Route path="config/datatables/:datatable" element={<DataTableDetails />} />
                            <Route path="config/datatables/:datatable/rows/:appTableId" element={<DataTableRows />} />
                            <Route path="config/datatables/:datatable/query" element={<DataTableQuery />} />

                            <Route path="config/entity-datatable-checks" element={<EntityDatatableChecks />} />

                            <Route path="config/reports" element={<ReportsAdmin />} />
                            <Route path="config/reports/:id" element={<ReportDetails />} />

                            <Route path="documents/:entityType/:entityId" element={<Documents />} />

                            <Route path="config/external-events" element={<ExternalEventsConfig />} />

                            <Route path="config/hooks" element={<Hooks />} />
                            <Route path="config/hooks/:hookId" element={<HookDetails />} />

                            <Route path="config/instance-mode" element={<InstanceMode />} />
                            <Route path="config/jobs" element={<SchedulerJobs />} />
                            <Route path="config/jobs/:jobId" element={<JobDetails />} />

                            <Route path="config/report-mailing-jobs" element={<ReportMailingJobs />} />
                            <Route path="config/report-mailing-jobs/:entityId" element={<ReportMailingJobDetails />} />

                            <Route path="config/external-asset-owners" element={<ExternalAssetOwners />} />
                            <Route path="config/eao-loan-product-attributes" element={<LoanProductAttributes />} />

                            <Route path="config/holidays" element={<Holidays />} />
                            <Route path="config/holidays/:holidayId" element={<HolidayDetails />} />
                            <Route path="config/currencies" element={<CurrencyConfig />} />

                            <Route path="offices/:officeId" element={<OfficeDetails />} />
                            <Route path="offices/external/:externalId" element={<OfficeDetails />} />

                            <Route path="accounting/provisioning-criteria" element={<ProvisioningCriteria />} />
                            <Route path="accounting/provisioning-criteria/:criteriaId" element={<ProvisioningCriteriaDetails />} />

                            <Route path="staff/:staffId" element={<StaffDetails />} />

                            <Route path="tellers" element={<Tellers />} />
                            <Route path="tellers/:tellerId" element={<TellerDetails />} />

                            <Route path="organization/working-days" element={<WorkingDays />} />
                            <Route path="accounting/transfers" element={<AccountTransfers />} />
                            <Route path="accounting/standing-instructions" element={<StandingInstructions />} />

                            <Route path="accounting/standing-instructions-history" element={<StandingInstructionsHistory />} />
                            <Route path="shares" element={<ShareAccounts />} />
                            <Route path="shares/:accountId" element={<ShareAccountDetails />} />

                            <Route path="config/field-config" element={<EntityFieldConfig />} />
                            <Route path="products/charges" element={<Charges />} />
                            <Route path="/clients/new" element={<ProtectedRoute><ClientCreate /></ProtectedRoute>} />
                            <Route path="/clients/:id/edit" element={<ProtectedRoute><ClientEdit /></ProtectedRoute>} />

                            <Route path="/collateral-management" element={<ProtectedRoute><CollateralManagement /></ProtectedRoute>} />
                            <Route path="/loans/:loanId/collaterals" element={<ProtectedRoute><LoanCollaterals /></ProtectedRoute>} />

                            // in your routes file
                            <Route path="/delinquency/ranges" element={<ProtectedRoute><DelinquencyRanges /></ProtectedRoute>} />
                            <Route path="/delinquency/buckets" element={<ProtectedRoute><DelinquencyBuckets /></ProtectedRoute>} />



                            {/* Settings */}
                            <Route path="settings" element={<Settings />} />

                            {/* Fallback */}
                            <Route path="*" element={<NotFound />} />
                        </Route>
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </AuthProvider>
            </LoadingProvider>
        </ToastProvider>
    );
};

export default App;
