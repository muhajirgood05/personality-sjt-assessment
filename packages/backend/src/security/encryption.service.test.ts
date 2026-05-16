/**
 * Tests for AES-256 encryption service.
 * Validates: Requirements 14.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionService, EncryptionConfig } from './encryption.service.js';
import { randomBytes } from 'crypto';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    // Generate a valid 32-byte key for testing
    const key = randomBytes(32).toString('base64');
    service = new EncryptionService({
      encryptionKey: key,
      keyType: 'raw',
    });
  });

  describe('constructor', () => {
    it('should accept a valid 32-byte base64 key', () => {
      const key = randomBytes(32).toString('base64');
      expect(() => new EncryptionService({ encryptionKey: key, keyType: 'raw' })).not.toThrow();
    });

    it('should reject a key that is not 32 bytes', () => {
      const shortKey = randomBytes(16).toString('base64');
      expect(
        () => new EncryptionService({ encryptionKey: shortKey, keyType: 'raw' })
      ).toThrow('Encryption key must be exactly 32 bytes');
    });

    it('should derive a key from a passphrase', () => {
      expect(
        () =>
          new EncryptionService({
            encryptionKey: 'my-secure-passphrase',
            keyType: 'passphrase',
            keySalt: 'test-salt',
          })
      ).not.toThrow();
    });
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt plaintext correctly', () => {
      const plaintext = 'Hello, assessment data!';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for the same plaintext (random IV)', () => {
      const plaintext = 'Same data';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should use AES-256-GCM algorithm', () => {
      const encrypted = service.encrypt('test');
      expect(encrypted.algorithm).toBe('aes-256-gcm');
    });

    it('should include an authentication tag', () => {
      const encrypted = service.encrypt('test');
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.authTag.length).toBeGreaterThan(0);
    });

    it('should fail to decrypt with a tampered ciphertext', () => {
      const encrypted = service.encrypt('sensitive data');
      encrypted.ciphertext = Buffer.from('tampered').toString('base64');

      expect(() => service.decrypt(encrypted)).toThrow();
    });

    it('should fail to decrypt with a tampered auth tag', () => {
      const encrypted = service.encrypt('sensitive data');
      encrypted.authTag = randomBytes(16).toString('base64');

      expect(() => service.decrypt(encrypted)).toThrow();
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode text (Bahasa Indonesia)', () => {
      const plaintext = 'Penilaian kepribadian kandidat: Integritas tinggi, Profesionalisme baik';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle large data', () => {
      const plaintext = 'x'.repeat(10000);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryptObject/decryptObject', () => {
    it('should encrypt and decrypt JSON objects', () => {
      const data = {
        candidateId: '123',
        scores: { openness: 7, conscientiousness: 8 },
        completed: true,
      };

      const encrypted = service.encryptObject(data);
      const decrypted = service.decryptObject<typeof data>(encrypted);

      expect(decrypted).toEqual(data);
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3, 'test', { nested: true }];
      const encrypted = service.encryptObject(data);
      const decrypted = service.decryptObject<typeof data>(encrypted);

      expect(decrypted).toEqual(data);
    });
  });

  describe('encryptToString/decryptFromString', () => {
    it('should produce a compact string format', () => {
      const plaintext = 'assessment response data';
      const encrypted = service.encryptToString(plaintext);

      // Format: iv:authTag:ciphertext
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);
    });

    it('should decrypt a compact string back to plaintext', () => {
      const plaintext = 'assessment response data';
      const encrypted = service.encryptToString(plaintext);
      const decrypted = service.decryptFromString(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw on invalid format', () => {
      expect(() => service.decryptFromString('invalid')).toThrow(
        'Invalid encrypted string format'
      );
    });
  });

  describe('cross-instance decryption', () => {
    it('should decrypt data encrypted by another instance with the same key', () => {
      const key = randomBytes(32).toString('base64');
      const config: EncryptionConfig = { encryptionKey: key, keyType: 'raw' };

      const encryptor = new EncryptionService(config);
      const decryptor = new EncryptionService(config);

      const plaintext = 'shared secret';
      const encrypted = encryptor.encrypt(plaintext);
      const decrypted = decryptor.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should fail to decrypt with a different key', () => {
      const key1 = randomBytes(32).toString('base64');
      const key2 = randomBytes(32).toString('base64');

      const encryptor = new EncryptionService({ encryptionKey: key1, keyType: 'raw' });
      const decryptor = new EncryptionService({ encryptionKey: key2, keyType: 'raw' });

      const encrypted = encryptor.encrypt('secret');
      expect(() => decryptor.decrypt(encrypted)).toThrow();
    });
  });
});
