/**
 * Tests for the API client with automatic token refresh on 401.
 *
 * Validates: Requirements 1.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setTokens, clearTokens, getAccessToken } from './auth.service.js';
import { apiRequest } from './api-client.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('api-client', () => {
  beforeEach(() => {
    clearTokens();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should attach the access token as Authorization header', async () => {
    setTokens({
      accessToken: 'my-token',
      refreshToken: 'refresh-token',
      role: 'candidate',
      userId: 'user-1',
    });

    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ data: 'test' }),
    });

    await apiRequest('/api/assessment/status');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0]!;
    expect(url).toBe('/api/assessment/status');
    const headers = options.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer my-token');
  });

  it('should refresh token and retry on 401 response', async () => {
    setTokens({
      accessToken: 'expired-token',
      refreshToken: 'valid-refresh',
      role: 'candidate',
      userId: 'user-1',
    });

    // First call returns 401
    mockFetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
    });

    // Refresh call succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          accessToken: 'new-access-token',
          expiresIn: 3600,
        },
      }),
    });

    // Retry call succeeds
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ data: 'success' }),
    });

    const response = await apiRequest('/api/assessment/status');

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(3);

    // Verify the retry used the new token
    const [, retryOptions] = mockFetch.mock.calls[2]!;
    const retryHeaders = retryOptions.headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer new-access-token');
  });

  it('should clear tokens when refresh fails on 401', async () => {
    setTokens({
      accessToken: 'expired-token',
      refreshToken: 'invalid-refresh',
      role: 'candidate',
      userId: 'user-1',
    });

    // First call returns 401
    mockFetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
    });

    // Refresh call fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Expired' },
      }),
    });

    await apiRequest('/api/assessment/status');

    expect(getAccessToken()).toBeNull();
  });

  it('should not attempt refresh when no access token is stored', async () => {
    // No tokens set
    mockFetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
    });

    const response = await apiRequest('/api/assessment/status');

    expect(response.status).toBe(401);
    // Should not attempt refresh (only 1 fetch call)
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should make request without auth header when not authenticated', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ data: 'public' }),
    });

    await apiRequest('/api/public/info');

    const [, options] = mockFetch.mock.calls[0]!;
    const headers = options.headers as Headers;
    expect(headers.has('Authorization')).toBe(false);
  });
});
