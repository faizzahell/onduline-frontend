import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import type { AuthSession } from '../features/auth/types/auth.types';
import { authSession } from './auth-session';
import { companySession } from './company-session';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

/** Endpoints that must not trigger the refresh flow, to avoid looping. */
const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout'];

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = authSession.getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Sets the active company for requests whose data is partitioned per company.
  // When empty, the backend falls back to the user's default company.
  const companyId = companySession.get();

  if (companyId) {
    config.headers['x-company-id'] = companyId;
  }

  return config;
});

/**
 * A separate instance without interceptors, so that the refresh request does
 * not trigger the same interceptor and cause recursion.
 */
const refreshClient = axios.create({ baseURL: API_BASE_URL, timeout: 30_000 });

/** The in-flight refresh request, shared by all requests that are waiting. */
let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = authSession.getRefreshToken();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await refreshClient.post<AuthSession>('/auth/refresh', {
    refreshToken,
  });

  authSession.save(response.data);

  return response.data.accessToken;
}

function requestRefresh(): Promise<string> {
  // Several requests can fail with 401 at the same time; a single refresh is enough.
  refreshInFlight ??= refreshAccessToken().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

function toReadableError(error: AxiosError): Error {
  const payload = error.response?.data as
    { message?: string | string[] } | undefined;

  const message =
    (Array.isArray(payload?.message)
      ? payload?.message[0]
      : payload?.message) ||
    error.message ||
    'An error occurred on the server';

  return new Error(message);
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;

    const isRefreshable =
      error.response?.status === 401 &&
      config &&
      !config._retried &&
      !AUTH_ENDPOINTS.some((endpoint) => config.url?.includes(endpoint));

    if (isRefreshable) {
      try {
        const accessToken = await requestRefresh();

        config._retried = true;
        config.headers.Authorization = `Bearer ${accessToken}`;

        return api.request(config);
      } catch {
        // The refresh token is no longer valid either: end the session. AuthContext
        // listens for this event and ProtectedRoute will redirect to the login page.
        authSession.clear();
      }
    }

    return Promise.reject(toReadableError(error));
  },
);
