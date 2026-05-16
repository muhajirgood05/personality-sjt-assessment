/**
 * TLS 1.2+ enforcement configuration for the API server.
 * Ensures all data in transit is encrypted using TLS 1.2 or higher.
 *
 * Validates: Requirements 14.2
 */

import { readFileSync } from 'fs';
import { SecureContextOptions } from 'tls';

/** TLS configuration for the Fastify HTTPS server */
export interface TlsConfig {
  /** Whether TLS is enabled */
  enabled: boolean;
  /** Path to the TLS certificate file (PEM format) */
  certPath?: string;
  /** Path to the TLS private key file (PEM format) */
  keyPath?: string;
  /** Path to the CA certificate file (PEM format, optional) */
  caPath?: string;
  /** Minimum TLS version (default: TLSv1.2) */
  minVersion: 'TLSv1.2' | 'TLSv1.3';
}

/**
 * Create TLS configuration from environment variables.
 */
export function createTlsConfigFromEnv(): TlsConfig {
  return {
    enabled: process.env['TLS_ENABLED'] === 'true',
    certPath: process.env['TLS_CERT_PATH'],
    keyPath: process.env['TLS_KEY_PATH'],
    caPath: process.env['TLS_CA_PATH'],
    minVersion: (process.env['TLS_MIN_VERSION'] as 'TLSv1.2' | 'TLSv1.3') ?? 'TLSv1.2',
  };
}

/**
 * Build HTTPS server options from TLS configuration.
 * Returns null if TLS is not enabled (e.g., behind a reverse proxy).
 */
export function buildHttpsOptions(config: TlsConfig): SecureContextOptions | null {
  if (!config.enabled) {
    return null;
  }

  if (!config.certPath || !config.keyPath) {
    throw new Error(
      'TLS_CERT_PATH and TLS_KEY_PATH are required when TLS_ENABLED=true'
    );
  }

  const options: SecureContextOptions = {
    cert: readFileSync(config.certPath),
    key: readFileSync(config.keyPath),
    minVersion: config.minVersion,
  };

  if (config.caPath) {
    options.ca = readFileSync(config.caPath);
  }

  return options;
}

/**
 * Fastify hook to enforce HTTPS by redirecting HTTP requests.
 * Use this when the server handles both HTTP and HTTPS,
 * or when behind a load balancer that sets X-Forwarded-Proto.
 */
export function createTlsEnforcementHook() {
  return async (request: { headers: Record<string, string | undefined>; hostname: string; url: string }, reply: { redirect: (statusCode: number, url: string) => void }) => {
    const proto = request.headers['x-forwarded-proto'];
    const isSecure = proto === 'https' || request.headers['x-forwarded-ssl'] === 'on';

    // In production, enforce HTTPS
    if (process.env['NODE_ENV'] === 'production' && !isSecure) {
      const redirectUrl = `https://${request.hostname}${request.url}`;
      reply.redirect(301, redirectUrl);
    }
  };
}

/**
 * Security headers middleware for Fastify.
 * Adds HSTS and other transport security headers.
 */
export function createSecurityHeadersHook() {
  return async (_request: unknown, reply: { header: (name: string, value: string) => void }) => {
    // HTTP Strict Transport Security - enforce HTTPS for 1 year
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // Prevent MIME type sniffing
    reply.header('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    reply.header('X-Frame-Options', 'DENY');

    // XSS protection
    reply.header('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  };
}
