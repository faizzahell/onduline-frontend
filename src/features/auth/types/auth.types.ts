export type RoleName =
  | 'SUPER_ADMINISTRATOR'
  | 'ADMINISTRATOR'
  | 'PURCHASER'
  | 'WAREHOUSE'
  | 'FINANCE'
  | 'EMPLOYEE'
  | 'EXPENSE_APPROVER'
  | 'HR';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  /**
   * Effective permission codes. Always sent by the backend on login and on
   * `GET /auth/me`, so client-side permission checks can be relied upon.
   */
  permissions: string[];
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}
