/**
 * Tests for TLS configuration and enforcement.
 * Validates: Requirements 14.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createTlsConfigFromEnv,
  buildHttpsOptions,
  createTlsEnforcementHook,
  createSecurityHeadersHook,
  TlsConfig,
} from './tls.config.js';

describe('TLS Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createTlsConfigFromEnv', () => {
    it('should return disabled TLS by default', () => {
      delete process.env['TLS_ENABLED'];
      const config = createTlsConfigFromEnv();
      expect(config.enabled).toBe(false);
    });

    it('should enable TLS when TLS_ENABLED=true', () => {
      process.env['TLS_ENABLED'] = 'true';
      process.env['TLS_CERT_PATH'] = '/path/to/cert.pem';
      process.env['TLS_KEY_PATH'] = '/path/to/key.pem';
      const config = createTlsConfigFromEnv();
      expect(config.enabled).toBe(true);
      expect(config.certPath).toBe('/path/to/cert.pem');
      expect(config.keyPath).toBe('/path/to/key.pem');
    });

    it('should default to TLSv1.2 minimum version', () => {
      const config = createTlsConfigFromEnv();
      expect(config.minVersion).toBe('TLSv1.2');
    });

    it('should allow TLSv1.3 minimum version', () => {
      process.env['TLS_MIN_VERSION'] = 'TLSv1.3';
      const config = createTlsConfigFromEnv();
      expect(config.minVersion).toBe('TLSv1.3');
    });
  });

  describe('buildHttpsOptions', () => {
    it('should return null when TLS is disabled', () => {
      const config: TlsConfig = {
        enabled: false,
        minVersion: 'TLSv1.2',
      };
      const options = buildHttpsOptions(config);
      expect(options).toBeNull();
    });

    it('should throw when TLS is enabled but cert/key paths are missing', () => {
      const config: TlsConfig = {
        enabled: true,
        minVersion: 'TLSv1.2',
      };
      expect(() => buildHttpsOptions(config)).toThrow(
        'TLS_CERT_PATH and TLS_KEY_PATH are required'
      );
    });
  });

  describe('createTlsEnforcementHook', () => {
    it('should redirect HTTP to HTTPS in production', async () => {
      process.env['NODE_ENV'] = 'production';
      const hook = createTlsEnforcementHook();

      const request = {
        headers: { 'x-forwarded-proto': 'http' } as Record<string, string | undefined>,
        hostname: 'example.com',
        url: '/api/test',
      };
      const reply = { redirect: vi.fn() };

      await hook(request, reply);
      expect(reply.redirect).toHaveBeenCalledWith(301, 'https://example.com/api/test');
    });

    it('should not redirect when already HTTPS', async () => {
      process.env['NODE_ENV'] = 'production';
      const hook = createTlsEnforcementHook();

      const request = {
        headers: { 'x-forwarded-proto': 'https' } as Record<string, string | undefined>,
        hostname: 'example.com',
        url: '/api/test',
      };
      const reply = { redirect: vi.fn() };

      await hook(request, reply);
      expect(reply.redirect).not.toHaveBeenCalled();
    });

    it('should not redirect in non-production environments', async () => {
      process.env['NODE_ENV'] = 'development';
      const hook = createTlsEnforcementHook();

      const request = {
        headers: { 'x-forwarded-proto': 'http' } as Record<string, string | undefined>,
        hostname: 'localhost',
        url: '/api/test',
      };
      const reply = { redirect: vi.fn() };

      await hook(request, reply);
      expect(reply.redirect).not.toHaveBeenCalled();
    });

    it('should recognize x-forwarded-ssl header', async () => {
      process.env['NODE_ENV'] = 'production';
      const hook = createTlsEnforcementHook();

      const request = {
        headers: { 'x-forwarded-ssl': 'on' } as Record<string, string | undefined>,
        hostname: 'example.com',
        url: '/api/test',
      };
      const reply = { redirect: vi.fn() };

      await hook(request, reply);
      expect(reply.redirect).not.toHaveBeenCalled();
    });
  });

  describe('createSecurityHeadersHook', () => {
    it('should set HSTS header', async () => {
      const hook = createSecurityHeadersHook();
      const reply = { header: vi.fn() };

      await hook({}, reply);

      expect(reply.header).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    });

    it('should set X-Content-Type-Options header', async () => {
      const hook = createSecurityHeadersHook();
      const reply = { header: vi.fn() };

      await hook({}, reply);

      expect(reply.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });

    it('should set X-Frame-Options header', async () => {
      const hook = createSecurityHeadersHook();
      const reply = { header: vi.fn() };

      await hook({}, reply);

      expect(reply.header).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('should set X-XSS-Protection header', async () => {
      const hook = createSecurityHeadersHook();
      const reply = { header: vi.fn() };

      await hook({}, reply);

      expect(reply.header).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    it('should set Referrer-Policy header', async () => {
      const hook = createSecurityHeadersHook();
      const reply = { header: vi.fn() };

      await hook({}, reply);

      expect(reply.header).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
    });
  });
});
