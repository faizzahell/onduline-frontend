import type { AuthSession, AuthUser } from '../features/auth/types/auth.types';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const AUTH_USER_KEY = 'authUser';

type Listener = () => void;

const listeners = new Set<Listener>();

function readUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

/**
 * The single source of truth for session tokens.
 *
 * Both the axios interceptor and AuthContext use this module, so neither of
 * them needs to import the other and no circular dependency is created.
 */
export const authSession = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),

  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),

  getUser: readUser,

  save(session: AuthSession): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
  },

  saveUser(user: AuthUser): void {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);

    listeners.forEach((listener) => listener());
  },

  /** Notifies AuthContext when the session is cleared from outside React. */
  onCleared(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
