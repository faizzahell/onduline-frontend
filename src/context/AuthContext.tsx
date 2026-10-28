import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { authApi } from '../features/auth/api/auth.api';
import type {
  AuthSession,
  AuthUser,
  LoginRequest,
} from '../features/auth/types/auth.types';
import { authSession } from '../services/auth-session';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<AuthSession>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    authSession.getUser(),
  );

  const [hasToken, setHasToken] = useState(() =>
    Boolean(authSession.getAccessToken()),
  );

  // The axios interceptor clears the session when the refresh token is no longer valid.
  useEffect(
    () =>
      authSession.onCleared(() => {
        setUser(null);
        setHasToken(false);
      }),
    [],
  );

  // Roles and permissions can be changed on the admin side, so the profile
  // stored in localStorage is refreshed every time the application loads.
  useEffect(() => {
    if (!hasToken) {
      return;
    }

    let active = true;

    authApi
      .me()
      .then((profile) => {
        if (!active) {
          return;
        }

        authSession.saveUser(profile);
        setUser(profile);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [hasToken]);

  const login = useCallback(async (credentials: LoginRequest) => {
    const session = await authApi.login(credentials);

    authSession.save(session);
    setUser(session.user);
    setHasToken(true);

    return session;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    authSession.clear();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: hasToken && user !== null,
      login,
      logout,
    }),
    [user, hasToken, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
