/**
 * AES-256 encryption service for assessment data at rest.
 * Provides encrypt/decrypt operations using AES-256-GCM (authenticated encryption).
 *
 * Validates: Requirements 14.1
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/** Configuration for the encryption service */
export interface EncryptionConfig {
  /** Base64-encoded 32-byte encryption key, or a passphrase to derive a key from */
  encryptionKey: string;
  /** Whether the key is a raw base64 key or a passphrase requiring derivation */
  keyType: 'raw' | 'passphrase';
  /** Salt for key derivation (required when keyType is 'passphrase') */
  keySalt?: string;
}

/** Result of an encryption operation */
export interface EncryptedData {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Base64-encoded authentication tag (GCM) */
  authTag: string;
  /** Algorithm identifier */
  algorithm: 'aes-256-gcm';
}

const ALGORITHM = 'aes-256-gcm' as const;
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Encryption service implementing AES-256-GCM for data at rest.
 * GCM mode provides both confidentiality and authenticity.
 */
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: EncryptionConfig) {
    if (config.keyType === 'raw') {
      this.key = Buffer.from(config.encryptionKey, 'base64');
      if (this.key.length !== KEY_LENGTH) {
        throw new Error(
          `Encryption key must be exactly ${KEY_LENGTH} bytes (256 bits). Got ${this.key.length} bytes.`
        );
      }
    } else {
      // Derive key from passphrase using scrypt
      const salt = config.keySalt ?? 'assessment-platform-default-salt';
      this.key = scryptSync(config.encryptionKey, salt, KEY_LENGTH);
    }
  }

  /**
   * Encrypt plaintext data using AES-256-GCM.
   * Returns the ciphertext, IV, and authentication tag.
   */
  encrypt(plaintext: string): EncryptedData {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: ALGORITHM,
    };
  }

  /**
   * Decrypt ciphertext using AES-256-GCM.
   * Verifies the authentication tag to ensure data integrity.
   */
  decrypt(encryptedData: EncryptedData): string {
    if (encryptedData.algorithm !== ALGORITHM) {
      throw new Error(`Unsupported algorithm: ${encryptedData.algorithm}`);
    }

    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');

    const decipher = createDecipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt a JSON-serializable object.
   */
  encryptObject<T>(data: T): EncryptedData {
    const plaintext = JSON.stringify(data);
    return this.encrypt(plaintext);
  }

  /**
   * Decrypt and parse a JSON object.
   */
  decryptObject<T>(encryptedData: EncryptedData): T {
    const plaintext = this.decrypt(encryptedData);
    return JSON.parse(plaintext) as T;
  }

  /**
   * Encrypt data and return a single compact string (for database storage).
   * Format: base64(iv):base64(authTag):base64(ciphertext)
   */
  encryptToString(plaintext: string): string {
    const result = this.encrypt(plaintext);
    return `${result.iv}:${result.authTag}:${result.ciphertext}`;
  }

  /**
   * Decrypt a compact encrypted string back to plaintext.
   */
  decryptFromString(encryptedString: string): string {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted string format. Expected iv:authTag:ciphertext');
    }

    const [iv, authTag, ciphertext] = parts;
    return this.decrypt({
      iv: iv!,
      authTag: authTag!,
      ciphertext: ciphertext!,
      algorithm: ALGORITHM,
    });
  }
}

// ─── Singleton Instance ──────────────────────────────────────────────────────

let encryptionInstance: EncryptionService | null = null;

/**
 * Get or create the singleton encryption service instance.
 * Reads configuration from environment variables.
 */
export function getEncryptionService(config?: EncryptionConfig): EncryptionService {
  if (!encryptionInstance) {
    const resolvedConfig = config ?? createEncryptionConfigFromEnv();
    encryptionInstance = new EncryptionService(resolvedConfig);
  }
  return encryptionInstance;
}

/**
 * Create encryption configuration from environment variables.
 */
export function createEncryptionConfigFromEnv(): EncryptionConfig {
  const key = process.env['ENCRYPTION_KEY'] ?? '';
  const keyType = (process.env['ENCRYPTION_KEY_TYPE'] as 'raw' | 'passphrase') ?? 'passphrase';
  const keySalt = process.env['ENCRYPTION_KEY_SALT'];

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. ' +
      'Set a base64-encoded 32-byte key (keyType=raw) or a passphrase (keyType=passphrase).'
    );
  }

  return { encryptionKey: key, keyType, keySalt };
}

/**
 * Reset the singleton (for testing).
 */
export function resetEncryptionService(): void {
  encryptionInstance = null;
}
