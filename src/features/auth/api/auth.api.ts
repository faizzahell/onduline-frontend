import { api } from '../../../services/api';
import { authSession } from '../../../services/auth-session';
import type { AuthSession, AuthUser, LoginRequest } from '../types/auth.types';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthSession> => {
    const response = await api.post<AuthSession>('/auth/login', credentials);
    return response.data;
  },

  /** The current roles and permissions, used to refresh the stored session. */
  me: async (): Promise<AuthUser> => {
    const response = await api.get<AuthUser>('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    const refreshToken = authSession.getRefreshToken();

    if (!refreshToken) {
      return;
    }

    // Logout must not keep the user stuck in the application just because the
    // server is having trouble; the local session is still cleared by the caller.
    await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
  },
};
