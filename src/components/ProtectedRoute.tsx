import { Navigate, Outlet, useLocation } from 'react-router-dom';

import AccessDeniedPage from './ui/AccessDeniedPage';
import type { RoleName } from '../features/auth/types/auth.types';
import { useAuth } from '../hooks/useAuth';
import { hasPermission, isSuperAdministrator } from '../utils/rbac.utils';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

/**
 * Guards the company-wide screens. Typing the URL by hand is not a way in:
 * anyone who is not a super administrator is sent back to the dashboard.
 */
export function SuperAdminRoute() {
  const { user } = useAuth();

  if (!isSuperAdministrator(user)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

/**
 * Guards a route by role or permission, mirroring the sidebar's menu
 * filtering so the two never disagree.
 *
 * The menu already hides links a role cannot use; this closes the gap for
 * anyone who types the URL directly. A user who passes sees the nested route,
 * a user who does not gets the access-denied page rather than a blank or
 * half-broken screen. Enforcement still lives on the backend — this only
 * decides what the client bothers to render.
 */
export function RequirePermission({
  roles,
  permissions,
}: {
  roles?: RoleName[];
  permissions?: string[];
}) {
  const { user } = useAuth();

  if (!hasPermission(user, roles, permissions)) {
    return <AccessDeniedPage />;
  }

  return <Outlet />;
}

export function PublicRoute() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
