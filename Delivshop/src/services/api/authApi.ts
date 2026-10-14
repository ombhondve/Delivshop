import { apiClient } from './client';
import {
  AuthResponse,
  LoginCredentials,
  RegisterPayload,
  ShopLoginResponse,
  User,
} from '@/types/auth';
import { SecureTokenStorage } from '@/utils/storage';

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient<AuthResponse>('auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      requiresAuth: false,
    });
    if (response.tokens) {
      await SecureTokenStorage.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
    }
    return response;
  },

  async shopLogin(credentials: { shopId: string; password: string }): Promise<ShopLoginResponse> {
    const response = await apiClient<ShopLoginResponse>('auth/shop/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      requiresAuth: false,
    });

    if (response.mustChangePassword && response.restrictedToken) {
      // Store restricted token temporarily to allow password setup
      await SecureTokenStorage.setTokens(response.restrictedToken);
    } else if (response.tokens?.accessToken) {
      await SecureTokenStorage.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
    }

    return response;
  },

  async completeSetup(newPassword: string): Promise<any> {
    const response = await apiClient<any>('auth/shop/complete-setup', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
      requiresAuth: true,
    });

    if (response.tokens?.accessToken) {
      await SecureTokenStorage.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
    }

    return response;
  },

  async getProfile(): Promise<User> {
    return apiClient<User>('auth/me', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  async getShopProfile(): Promise<any> {
    return apiClient<any>('shop/me', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  async logout(): Promise<void> {
    try {
      await apiClient<{ message: string }>('auth/logout', {
        method: 'POST',
        requiresAuth: true,
      });
    } finally {
      await SecureTokenStorage.clearTokens();
    }
  },
};
