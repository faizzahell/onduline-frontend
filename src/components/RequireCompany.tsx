import { Building2, Loader2 } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { isSuperAdministrator } from '../utils/rbac.utils';

/** Settings works without an active company, so it is always allowed through. */
const COMPANY_OPTIONAL_PREFIXES = ['/settings'];

/**
 * Keeps company-scoped pages from loading before an active company exists.
 *
 * On a fresh install a super administrator signs in with no company yet, so
 * every company-scoped request would 400. Instead of letting those pages fire
 * their queries, this guard:
 *
 * - sends a super administrator to the company-creation screen, and
 * - shows anyone else a clear "no company assigned" message.
 *
 * Settings routes are allowed through so the super administrator can actually
 * reach the create-company page. Once a company is active every route renders
 * normally.
 */
export default function RequireCompany() {
  const { user } = useAuth();
  const { activeCompany, isLoading } = useCompany();
  const location = useLocation();

  const isCompanyOptional = COMPANY_OPTIONAL_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix),
  );

  if (activeCompany || isCompanyOptional) {
    return <Outlet />;
  }

  // Wait for the accessible-companies list before deciding, so the create
  // screen does not flash for a user who does have a company.
  if (isLoading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#D32F2F]" />
      </div>
    );
  }

  if (isSuperAdministrator(user)) {
    return <Navigate to="/settings/companies" replace />;
  }

  return <NoCompanyAssigned />;
}

function NoCompanyAssigned() {
  return (
    <div className="min-h-[calc(100vh-100px)] w-full flex items-center justify-center p-6 font-sans text-slate-800 antialiased">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8 sm:p-10 text-center relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-100/60 rounded-full blur-3xl pointer-events-none" />

        <div className="relative mx-auto w-16 h-16 mb-5 flex items-center justify-center rounded-2xl bg-red-50 border border-red-100 text-[#D32F2F]">
          <Building2 className="w-7 h-7" />
        </div>

        <h1 className="text-lg font-bold text-slate-900">
          No company assigned
        </h1>

        <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
          Your account is not linked to any company yet. Ask an administrator to
          grant you access to a company, then sign in again.
        </p>
      </div>
    </div>
  );
}
