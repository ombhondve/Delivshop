import { Platform } from 'react-native';
import { SecureTokenStorage } from '@/utils/storage';
import { ApiResponse, ApiErrorResponse } from '@/types/api';

const DEFAULT_API_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_HOST;

export class ApiClientError extends Error {
  public code?: string;
  public details?: Record<string, string[]>;
  public status: number;

  constructor(message: string, status: number, code?: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
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
    const token = await SecureTokenStorage.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers,
      ...restOptions,
    });
  } catch (networkError) {
    throw new ApiClientError(
      'Unable to connect to Delivshop backend API. Please check your network connection.',
      0,
      'NETWORK_ERROR'
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const err = data as ApiErrorResponse | null;
    throw new ApiClientError(
      err?.message || `Request failed with status ${response.status}`,
      response.status,
      err?.code,
      err?.details
    );
  }

  const successResponse = data as ApiResponse<T>;
  return successResponse.data ?? (data as T);
}
