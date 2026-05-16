/**
 * Authenticated API client with automatic token refresh on 401 responses.
 *
 * Validates: Requirements 1.1
 */

import { getAccessToken, refreshAccessToken, clearTokens } from './auth.service.js';

// Track whether a refresh is already in progress to avoid concurrent refreshes
let refreshPromise: Promise<boolean> | null = null;

/**
 * Make an authenticated API request.
 * Automatically attaches the access token and retries once with a refreshed token on 401.
 */
export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = getAccessToken();

  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });

  // If we get a 401, attempt to refresh the token and retry once
  if (response.status === 401 && accessToken) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      // Retry the original request with the new token
      const newAccessToken = getAccessToken();
      const retryHeaders = new Headers(options.headers);
      if (newAccessToken) {
        retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
      }
      if (!retryHeaders.has('Content-Type') && options.body) {
        retryHeaders.set('Content-Type', 'application/json');
      }
      return fetch(url, { ...options, headers: retryHeaders });
    }

    // Refresh failed — clear auth state
    clearTokens();
  }

  return response;
}

/**
 * Attempt to refresh the access token.
 * Deduplicates concurrent refresh attempts.
 */
async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = refreshAccessToken().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * Convenience method for JSON API requests.
 */
export async function apiJson<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiRequest(url, options);
  return response.json() as Promise<T>;
}
