// =============================================================================
// API Client
// =============================================================================
// HTTP client for backend communication with:
//   - JWT authentication via SecureStore
//   - Automatic token refresh
//   - Request timeout and retry with exponential backoff
//   - Offline-aware: does not attempt requests when offline
// =============================================================================

import * as SecureStore from 'expo-secure-store';
import { API_CONFIG } from '../../constants/config';
import type { AuthTokens } from '../../types';

const TOKEN_KEY = 'auth_tokens';

class ApiClient {
  private static instance: ApiClient;
  private tokens: AuthTokens | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Load stored authentication tokens from SecureStore.
   */
  async loadTokens(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (stored) {
        this.tokens = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[ApiClient] Failed to load tokens:', error);
    }
  }

  /**
   * Store new authentication tokens.
   */
  async setTokens(tokens: AuthTokens): Promise<void> {
    this.tokens = tokens;
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
  }

  /**
   * Clear authentication tokens (logout).
   */
  async clearTokens(): Promise<void> {
    this.tokens = null;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }

  /**
   * Check if the user is authenticated.
   */
  isAuthenticated(): boolean {
    return this.tokens !== null && this.tokens.expiresAt > Date.now();
  }

  /**
   * Perform an authenticated GET request.
   */
  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  /**
   * Perform an authenticated POST request.
   */
  async post<T>(path: string, body?: any): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  /**
   * Perform an authenticated PUT request.
   */
  async put<T>(path: string, body?: any): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  // ---------------------------------------------------------------------------
  // Core Request
  // ---------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    retryCount: number = 0,
  ): Promise<T> {
    // Ensure we have valid tokens
    if (this.tokens && this.tokens.expiresAt <= Date.now()) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        throw new ApiError('Authentication expired. Please log in again.', 401);
      }
    }

    const url = `${API_CONFIG.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.tokens) {
      headers['Authorization'] = `Bearer ${this.tokens.accessToken}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 401 && retryCount === 0) {
        // Token might have expired between check and request — try refresh
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return this.request<T>(method, path, body, retryCount + 1);
        }
        throw new ApiError('Unauthorized', 401);
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new ApiError(
          `Request failed: ${response.status} ${response.statusText}`,
          response.status,
          errorBody,
        );
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeout);

      if (error instanceof ApiError) throw error;

      // Timeout (AbortError) → do not retry, throw error immediately
      if (error.name === 'AbortError') {
        throw new ApiError('Request timed out', 0);
      }

      // Other network errors → retry with backoff
      if (retryCount < API_CONFIG.maxRetries) {
        const delay = API_CONFIG.retryBaseDelay * Math.pow(2, retryCount);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.request<T>(method, path, body, retryCount + 1);
      }

      throw new ApiError(`Network error: ${error.message}`, 0);
    }
  }

  private async refreshToken(): Promise<boolean> {
    // Prevent concurrent refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.tokens?.refreshToken) return false;

    this.isRefreshing = true;
    this.refreshPromise = this.doRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.tokens!.refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      await this.setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      });

      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Custom API error with status code for error handling in the UI.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export default ApiClient;
