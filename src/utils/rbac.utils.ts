import type { AuthUser, RoleName } from '../features/auth/types/auth.types';

const SUPER_ADMINISTRATOR_ROLE: RoleName = 'SUPER_ADMINISTRATOR';

/**
 * The super administrator, the only role that reaches the company-wide
 * switches: opening OCR access per company and moving the active company
 * between legal entities.
 *
 * Mirrors the bypass in `RbacService` on the backend. Used here only to hide
 * controls that would fail anyway; the real enforcement stays server-side.
 */
export function isSuperAdministrator(user: AuthUser | null): boolean {
  return user?.roles.includes(SUPER_ADMINISTRATOR_ROLE) ?? false;
}

/**
 * Whether the user is allowed to see a navigation item.
 *
 * Mirrors `RbacService.hasAnyPermission()` on the backend: SUPER_ADMINISTRATOR
 * always passes, everyone else passes if one of their roles or permissions
 * matches. This is purely for hiding menus; the real enforcement still
 * happens on the backend.
 */
export function hasPermission(
  user: AuthUser | null,
  allowedRoles?: RoleName[],
  allowedPermissions?: string[],
): boolean {
  if (!user) {
    return false;
  }

  if (isSuperAdministrator(user)) {
    return true;
  }

  const matchesRole =
    allowedRoles?.some((role) => user.roles.includes(role)) ?? false;

  if (matchesRole) {
    return true;
  }

  return (
    allowedPermissions?.some((permission) =>
      user.permissions.includes(permission),
    ) ?? false
  );
}
