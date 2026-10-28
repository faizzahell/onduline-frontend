import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from '../components/layout/AppLayout';
import {
  ProtectedRoute,
  PublicRoute,
  RequirePermission,
  SuperAdminRoute,
} from '../components/ProtectedRoute';
import type { RoleName } from '../features/auth/types/auth.types';
import UnderMaintenancePage from '../components/ui/UnderMaintenancePage';
import LoginPage from '../features/auth/pages/LoginPage';
import ApprovalInboxPage from '../features/expense/pages/ApprovalInboxPage';
import ClaimDetailPage from '../features/expense/pages/ClaimDetailPage';
import ExpenseEntryPage from '../features/expense/pages/ExpenseEntryPage';
import ExpenseEntryReviewPage from '../features/expense/pages/ExpenseEntryReviewPage';
import ExpenseReportPage from '../features/expense/pages/ExpenseReportPage';
import MyClaimsPage from '../features/expense/pages/MyClaimsPage';
import PettyCashDetailPage from '../features/petty-cash/pages/PettyCashDetailPage';
import PettyCashListPage from '../features/petty-cash/pages/PettyCashListPage';
import BatchUploadPage from '../features/ocr-invoice/pages/BatchUploadPage';
import InvoiceListPage from '../features/ocr-invoice/pages/InvoiceListPage';
import InvoiceReviewPage from '../features/ocr-invoice/pages/InvoiceReviewPage';
import ObmDashboardPage from '../features/ocr-invoice/pages/ObmDashboardPage';
import PoResolutionPage from '../features/ocr-invoice/pages/PoResolutionPage';
import SettingsLayout from '../features/settings/SettingsLayout';
import CompanyManagementPage from '../features/settings/pages/CompanyManagementPage';
import DatabaseToolsPage from '../features/settings/pages/DatabaseToolsPage';
import OcrAccessPage from '../features/settings/pages/OcrAccessPage';
import UserManagementPage from '../features/settings/pages/UserManagementPage';

/**
 * Modules whose menu entries already appear in the sidebar but whose backend
 * does not exist yet.
 *
 * Without these routes, those menu entries would be caught by the catch-all
 * and bounce the user back to the dashboard without any explanation.
 */
interface PlannedModule {
  path: string;
  title: string;
  description: string;
  /** When set, the placeholder is only reachable by a matching role/permission. */
  roles?: RoleName[];
  permissions?: string[];
}

const PLANNED_MODULES: PlannedModule[] = [
  {
    path: '/dashboard',
    title: 'Reports & Analytics',
    description:
      'The financial reporting and OCR analytics module is under development.',
    roles: ['ADMINISTRATOR'],
  },
  {
    path: '/business-partner/*',
    title: 'Business Partner Portal',
    description:
      'Customer, vendor, and credit limit management is not available in this release.',
    roles: ['ADMINISTRATOR'],
  },
  {
    path: '/sales-exception/*',
    title: 'Sales Exception Approval',
    description: 'Sales exception approval is not available in this release.',
    roles: ['ADMINISTRATOR'],
  },
  {
    path: '/rebate/*',
    title: 'Rebate Management',
    description:
      'Trading term calculation and rebate claims are not available in this release.',
    roles: ['ADMINISTRATOR'],
  },
];

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={<Navigate to="/invoices/dashboard" replace />}
          />

          <Route path="/invoices/dashboard" element={<ObmDashboardPage />} />
          <Route path="/invoices/upload" element={<BatchUploadPage />} />
          <Route
            path="/invoices/manual"
            element={<Navigate to="/invoices/upload" replace />}
          />
          <Route path="/invoices" element={<InvoiceListPage />} />
          <Route path="/invoices/:id/review" element={<InvoiceReviewPage />} />
          <Route
            path="/invoices/po-resolution"
            element={<PoResolutionPage />}
          />

          <Route
            element={<RequirePermission permissions={['expense:entry']} />}
          >
            <Route path="/expense/entries" element={<ExpenseEntryPage />} />
            <Route
              path="/expense/entries/new"
              element={<ExpenseEntryReviewPage />}
            />
            <Route
              path="/expense/entries/:id"
              element={<ExpenseEntryReviewPage />}
            />
          </Route>

          <Route
            element={
              <RequirePermission
                permissions={['expense:entry', 'expense:view']}
              />
            }
          >
            <Route path="/expense/claims" element={<MyClaimsPage />} />
          </Route>

          {/* Expense report: non-admins recap their own expenses, admins can
              pick any employee and see company-wide summaries. Both roles
              need access, so the guard allows the entry/view perms too. */}
          <Route
            element={
              <RequirePermission
                permissions={[
                  'expense:report',
                  'expense:view_all',
                  'expense:view',
                  'expense:entry',
                ]}
              />
            }
          >
            <Route path="/expense/reports" element={<ExpenseReportPage />} />
          </Route>

          {/* Claim detail is reachable both by a submitter (view) and by an
              approver acting on the claim, so it allows either permission. */}
          <Route
            element={
              <RequirePermission
                permissions={[
                  'expense:view',
                  'expense:view_all',
                  'expense:approve',
                  'expense:accrue',
                  'expense:post',
                ]}
              />
            }
          >
            <Route path="/expense/claims/:id" element={<ClaimDetailPage />} />
          </Route>

          <Route
            element={
              <RequirePermission
                permissions={[
                  'expense:approve',
                  'expense:accrue',
                  'expense:post',
                ]}
              />
            }
          >
            <Route path="/expense/approvals" element={<ApprovalInboxPage />} />
          </Route>

          <Route
            element={
              <RequirePermission
                permissions={[
                  'pettycash:entry',
                  'pettycash:approve',
                  'pettycash:post',
                  'expense:view_all',
                ]}
              />
            }
          >
            <Route path="/expense/petty-cash" element={<PettyCashListPage />} />
            <Route
              path="/expense/petty-cash/:id"
              element={<PettyCashDetailPage />}
            />
          </Route>

          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="users" replace />} />
            <Route path="users" element={<UserManagementPage />} />

            <Route element={<SuperAdminRoute />}>
              <Route path="ocr-access" element={<OcrAccessPage />} />
              <Route path="companies" element={<CompanyManagementPage />} />
              <Route path="database" element={<DatabaseToolsPage />} />
            </Route>
          </Route>

          {PLANNED_MODULES.map((module) => {
            const page = (
              <UnderMaintenancePage
                title={module.title}
                description={module.description}
              />
            );

            // Modules with an access rule sit behind the guard, so an
            // employee cannot reach e.g. the petty-cash placeholder by URL.
            if (module.roles || module.permissions) {
              return (
                <Route
                  key={module.path}
                  element={
                    <RequirePermission
                      roles={module.roles}
                      permissions={module.permissions}
                    />
                  }
                >
                  <Route path={module.path} element={page} />
                </Route>
              );
            }

            return (
              <Route key={module.path} path={module.path} element={page} />
            );
          })}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
