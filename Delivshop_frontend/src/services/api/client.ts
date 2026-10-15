import { ApiResponse } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ACCESS_TOKEN_KEY = 'delivshop_access_token';
const REFRESH_TOKEN_KEY = 'delivshop_refresh_token';
const LEGACY_TOKEN_KEY = 'delivshop_web_token';

let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

type SessionExpiredListener = () => void;
const sessionExpiredListeners: Set<SessionExpiredListener> = new Set();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

export function triggerSessionExpired(): void {
  tokenStore.clear();
  sessionExpiredListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error('[SessionExpired] Listener threw error:', err);
    }
  });
}

export const tokenStore = {
  get: (): string | null => {
    if (inMemoryAccessToken) return inMemoryAccessToken;
    try {
      return (
        sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
        sessionStorage.getItem(LEGACY_TOKEN_KEY)
      );
    } catch {
      return null;
    }
  },

  getAccessToken: (): string | null => {
    return tokenStore.get();
  },

  getRefreshToken: (): string | null => {
    if (inMemoryRefreshToken) return inMemoryRefreshToken;
    try {
      return sessionStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  set: (accessToken: string): void => {
    tokenStore.setAccessToken(accessToken);
  },

  setAccessToken: (accessToken: string): void => {
    inMemoryAccessToken = accessToken;
    try {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      sessionStorage.setItem(LEGACY_TOKEN_KEY, accessToken);
    } catch {
      // Storage error handled safely
    }
  },

  setRefreshToken: (refreshToken: string): void => {
    inMemoryRefreshToken = refreshToken;
    try {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch {
      // Storage error handled safely
    }
  },

  setTokens: (accessToken: string, refreshToken?: string | null): void => {
    tokenStore.setAccessToken(accessToken);
    if (refreshToken) {
      tokenStore.setRefreshToken(refreshToken);
    }
  },

  clear: (): void => {
    inMemoryAccessToken = null;
    inMemoryRefreshToken = null;
    try {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(LEGACY_TOKEN_KEY);
    } catch {
      // Storage error handled safely
    }
  },
};

export class ApiError extends Error {
  public status: number;
  public details?: Record<string, string[]>;

  constructor(message: string, status: number, details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  _retry?: boolean;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function performTokenRefresh(): Promise<string | null> {
  const refreshToken = tokenStore.getRefreshToken();
  const refreshUrl = `${API_BASE_URL.replace(/\/$/, '')}/auth/refresh`;

  try {
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ refreshToken: refreshToken || undefined }),
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json().catch(() => null);
    const data = json?.data || json;
    const newAccessToken = data?.tokens?.accessToken;
    const newRefreshToken = data?.tokens?.refreshToken;

    if (newAccessToken) {
      tokenStore.setTokens(newAccessToken, newRefreshToken);
      return newAccessToken;
    }

    return null;
  } catch {
    return null;
  }
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = true, headers: customHeaders, _retry = false, ...restOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (requiresAuth) {
    const token = tokenStore.get();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const cleanEndpoint = endpoint.replace(/^\//, '');
  const url = `${API_BASE_URL.replace(/\/$/, '')}/${cleanEndpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      credentials: 'include',
      headers,
      ...restOptions,
    });
  } catch {
    throw new ApiError('Unable to connect to Delivshop backend API. Please ensure the server is online.', 0);
  }

  // Handle 401 Unauthorized with controlled Token Refresh Mutex
  if (response.status === 401 && requiresAuth) {
    const isAuthRoute =
      cleanEndpoint.startsWith('auth/login') ||
      cleanEndpoint.startsWith('auth/refresh') ||
      cleanEndpoint.startsWith('auth/register');

    if (!isAuthRoute) {
      // If already retried once, do not retry again: session is definitively expired
      if (_retry) {
        triggerSessionExpired();
        throw new ApiError('Session expired. Please log in again.', 401);
      }

      // Concurrency Mutex: only ONE refresh request runs at a time
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = performTokenRefresh().finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        // Retry the original request with new token
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${newAccessToken}`,
        };
        return apiClient<T>(endpoint, {
          ...options,
          _retry: true,
          headers: retryHeaders,
        });
      } else {
        // Refresh failed: clear session and broadcast expiration
        triggerSessionExpired();
        throw new ApiError('Session expired. Please log in again.', 401);
      }
    }
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    // 403 Forbidden is permission denied, not session expiration
    if (response.status === 403) {
      throw new ApiError(
        json?.message || 'Access denied: you do not have permission to perform this action.',
        403,
        json?.details
      );
    }

    if (response.status === 429) {
      throw new ApiError('Too many requests. Please slow down and try again shortly.', 429);
    }

    throw new ApiError(
      json?.message || `API request failed with status ${response.status}`,
      response.status,
      json?.details
    );
  }

  const apiRes = json as ApiResponse<T>;
  return apiRes.data ?? (json as T);
}
