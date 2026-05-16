/**
 * Tests for auth service — in-memory token storage and API functions.
 *
 * Validates: Requirements 1.1, 1.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAccessToken,
  getRefreshToken,
  getAuthState,
  isAuthenticated,
  setTokens,
  updateAccessToken,
  clearTokens,
  login,
  refreshAccessToken,
  logout,
} from './auth.service.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('auth.service', () => {
  beforeEach(() => {
    clearTokens();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('in-memory token store', () => {
    it('should start with no tokens', () => {
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(isAuthenticated()).toBe(false);
    });

    it('should store tokens in memory via setTokens', () => {
      setTokens({
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        role: 'candidate',
        userId: 'user-789',
      });

      expect(getAccessToken()).toBe('access-123');
      expect(getRefreshToken()).toBe('refresh-456');
      expect(isAuthenticated()).toBe(true);

      const state = getAuthState();
      expect(state.role).toBe('candidate');
      expect(state.userId).toBe('user-789');
    });

    it('should update only the access token', () => {
      setTokens({
        accessToken: 'old-access',
        refreshToken: 'refresh-456',
        role: 'candidate',
        userId: 'user-789',
      });

      updateAccessToken('new-access');

      expect(getAccessToken()).toBe('new-access');
      expect(getRefreshToken()).toBe('refresh-456');
    });

    it('should clear all tokens', () => {
      setTokens({
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        role: 'administrator',
        userId: 'admin-1',
      });

      clearTokens();

      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(isAuthenticated()).toBe(false);
      expect(getAuthState().role).toBeNull();
    });
  });

  describe('login', () => {
    it('should call the login endpoint and store tokens on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresIn: 3600,
            role: 'candidate',
            candidateId: 'cand-1',
          },
        }),
      });

      const result = await login({ employeeId: 'EMP001', password: 'pass123' });

      expect(result.success).toBe(true);
      expect(getAccessToken()).toBe('access-token');
      expect(getRefreshToken()).toBe('refresh-token');
      expect(getAuthState().role).toBe('candidate');
    });

    it('should not store tokens on login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid employee ID or password',
          },
        }),
      });

      const result = await login({ employeeId: 'EMP001', password: 'wrong' });

      expect(result.success).toBe(false);
      expect(getAccessToken()).toBeNull();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh the access token using the stored refresh token', async () => {
      setTokens({
        accessToken: 'old-access',
        refreshToken: 'refresh-token',
        role: 'candidate',
        userId: 'user-1',
      });

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

      const result = await refreshAccessToken();

      expect(result).toBe(true);
      expect(getAccessToken()).toBe('new-access-token');
      expect(getRefreshToken()).toBe('refresh-token'); // unchanged
    });

    it('should return false and clear tokens when refresh fails', async () => {
      setTokens({
        accessToken: 'old-access',
        refreshToken: 'refresh-token',
        role: 'candidate',
        userId: 'user-1',
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { code: 'INVALID_REFRESH_TOKEN', message: 'Expired' },
        }),
      });

      const result = await refreshAccessToken();

      expect(result).toBe(false);
      expect(getAccessToken()).toBeNull();
    });

    it('should return false when no refresh token is stored', async () => {
      const result = await refreshAccessToken();
      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear tokens and call the logout endpoint', async () => {
      setTokens({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        role: 'candidate',
        userId: 'user-1',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { message: 'Logged out' } }),
      });

      await logout();

      expect(getAccessToken()).toBeNull();
      expect(isAuthenticated()).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer access-token',
        },
        body: JSON.stringify({ refreshToken: 'refresh-token' }),
      });
    });

    it('should clear tokens even if logout API call fails', async () => {
      setTokens({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        role: 'candidate',
        userId: 'user-1',
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await logout();

      expect(getAccessToken()).toBeNull();
      expect(isAuthenticated()).toBe(false);
    });
  });
});
