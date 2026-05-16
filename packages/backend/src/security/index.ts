/**
 * Security module exports.
 * Provides encryption at rest (AES-256), TLS enforcement, and data retention.
 *
 * Validates: Requirements 14.1, 14.2, 14.6
 */

export {
  EncryptionService,
  EncryptionConfig,
  EncryptedData,
  getEncryptionService,
  createEncryptionConfigFromEnv,
  resetEncryptionService,
} from './encryption.service.js';

export {
  TlsConfig,
  createTlsConfigFromEnv,
  buildHttpsOptions,
  createTlsEnforcementHook,
  createSecurityHeadersHook,
} from './tls.config.js';

export {
  DataRetentionService,
  RetentionPolicy,
  RetentionResult,
  createRetentionConfigFromEnv,
} from './data-retention.service.js';
