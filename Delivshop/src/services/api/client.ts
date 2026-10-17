import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { SecureTokenStorage } from '@/utils/storage';
import { ApiResponse, ApiErrorResponse } from '@/types/api';

/**
 * Dynamically resolves the backend API Base URL.
 * Automatically detects the Metro packager host IP in Expo Go and development builds,
 * so physical devices connect seamlessly to the developer machine without manual IP configuration.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // Extract Metro host IP if available (e.g. "192.168.1.6:8081" -> "192.168.1.6")
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  const metroIp = hostUri ? hostUri.split(':')[0] : null;

  // 1. If explicit env URL provided:
  if (envUrl) {
    // If running on a physical native device via Expo Go but envUrl was set to localhost / 127.0.0.1:
    const isLoopback = envUrl.includes('localhost') || envUrl.includes('127.0.0.1');
    if (isLoopback && Platform.OS !== 'web' && metroIp && metroIp !== 'localhost' && metroIp !== '127.0.0.1') {
      // Intelligently substitute localhost with the actual host computer LAN IP
      return envUrl.replace(/localhost|127\.0\.0\.1/, metroIp);
    }
    return envUrl;
  }

  // 2. If running in Expo Go / development mode with Metro packager IP detected:
  if (metroIp && metroIp !== 'localhost' && metroIp !== '127.0.0.1') {
    return `http://${metroIp}:5000/api`;
  }

  // 3. Platform-specific fallbacks (Android Emulator vs Web/Local)
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
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

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = true, headers: customHeaders, timeout = 15000, ...restOptions } = options;

  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
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

  // Enforce a strict timeout using AbortController so requests never hang indefinitely
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
        `Connection timed out (${Math.round(timeout / 1000)}s) connecting to ${url}. Please verify your device and computer are on the same Wi-Fi network and backend is running.`,
        0,
        'TIMEOUT'
      );
    }
    throw new ApiClientError(
      `Unable to connect to Delivshop backend at ${url}. Please verify the backend server is running and accessible on this network.`,
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
