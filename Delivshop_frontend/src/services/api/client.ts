import { ApiResponse } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'delivshop_web_token';

export const tokenStore = {
  get: (): string | null => {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string): void => {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Storage error handled safely
    }
  },
  clear: (): void => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Clear safely
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

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = true, headers: customHeaders, ...restOptions } = options;

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

  const url = `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  let response: Response;
  try {
    response = await fetch(url, { headers, ...restOptions });
  } catch {
    throw new ApiError('Unable to connect to Delivshop backend API. Please ensure the server is online.', 0);
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      json?.message || `API request failed with status ${response.status}`,
      response.status,
      json?.details
    );
  }

  const apiRes = json as ApiResponse<T>;
  return apiRes.data ?? (json as T);
}
