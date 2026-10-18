import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { SecureTokenStorage } from '@/utils/storage';
import { ApiResponse, ApiErrorResponse } from '@/types/api';

export const PRODUCTION_API_URL = 'https://delivshop-vuw7.vercel.app/api';

/**
 * Dynamically resolves the backend API Base URL.
 * In production releases, strictly requires a secure HTTPS endpoint (defaults to PRODUCTION_API_URL).
 * In development / Expo Go, supports explicit env vars, Metro host IP auto-discovery, and local fallbacks.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // Extract Metro host IP if available (e.g. "192.168.1.6:8081" -> "192.168.1.6")
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  const metroIp = hostUri ? hostUri.split(':')[0] : null;

  // 1. Production Mode Check: Never expose private IPs or localhost in production builds
  if (!__DEV__) {
    if (envUrl && envUrl.startsWith('https://')) {
      return envUrl;
    }
    return PRODUCTION_API_URL;
  }

  // 2. Development Mode: If explicit env URL provided:
  if (envUrl) {
    const isLoopback = envUrl.includes('localhost') || envUrl.includes('127.0.0.1');
    if (isLoopback && Platform.OS !== 'web' && metroIp && metroIp !== 'localhost' && metroIp !== '127.0.0.1') {
      // Intelligently substitute localhost with the actual host computer LAN IP
      return envUrl.replace(/localhost|127\.0\.0\.1/, metroIp);
    }
    return envUrl;
  }

  // 3. Development Mode: Auto-detect Metro packager host IP
  if (metroIp && metroIp !== 'localhost' && metroIp !== '127.0.0.1') {
    return `http://${metroIp}:5000/api`;
  }

  // 4. Android Emulator fallback vs Web/Local/Production
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }

  return PRODUCTION_API_URL;
}

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
  timeout?: number;
}

async function executeFetch<T>(
  targetBaseUrl: string,
  endpoint: string,
  options: RequestOptions
): Promise<T> {
  const { requiresAuth = true, headers: customHeaders, timeout = 15000, ...restOptions } = options;
  const baseUrl = targetBaseUrl.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  const url = `${baseUrl}/${cleanEndpoint}`;

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      headers,
      signal: controller.signal,
    });
  } catch (networkError: any) {
    if (networkError.name === 'AbortError' || networkError.message?.includes('aborted')) {
      throw new ApiClientError(
        `Connection timed out (${Math.round(timeout / 1000)}s) connecting to ${url}.`,
        0,
        'TIMEOUT'
      );
    }
    throw new ApiClientError(
      `Unable to connect to Delivshop backend at ${url}.`,
      0,
      'NETWORK_ERROR'
    );
  } finally {
    clearTimeout(timeoutId);
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

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const primaryBaseUrl = getApiBaseUrl();

  try {
    return await executeFetch<T>(primaryBaseUrl, endpoint, options);
  } catch (err: any) {
    // If primary local URL fails with network/timeout error, and primary is not the production cloud URL,
    // automatically failover to verified deployed production cloud backend
    const isLocalUrl =
      primaryBaseUrl.includes('192.168.') ||
      primaryBaseUrl.includes('localhost') ||
      primaryBaseUrl.includes('127.0.0.1') ||
      primaryBaseUrl.includes('10.0.2.2');

    const isNetworkOrTimeout = err.status === 0 || err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT';

    if (isLocalUrl && isNetworkOrTimeout && primaryBaseUrl !== PRODUCTION_API_URL) {
      console.warn(
        `[ApiClient] Local backend at ${primaryBaseUrl} unreachable (${err.message}). Failing over to production cloud backend at ${PRODUCTION_API_URL}...`
      );
      try {
        return await executeFetch<T>(PRODUCTION_API_URL, endpoint, options);
      } catch (cloudErr: any) {
        // If the cloud backend responded with a real HTTP status (e.g. 401 Invalid Credentials, 429 Rate Limit, etc.),
        // rethrow that specific error directly so the UI displays the actual server message instead of a false network failure.
        if (cloudErr instanceof ApiClientError && cloudErr.status > 0) {
          throw cloudErr;
        }
        throw new ApiClientError(
          `Unable to connect to Delivshop backend. (Local host ${primaryBaseUrl} and Cloud fallback ${PRODUCTION_API_URL} unreachable). Please verify your internet connection.`,
          0,
          'NETWORK_ERROR'
        );
      }
    }

    throw err;
  }
}

