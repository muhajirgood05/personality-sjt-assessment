/**
 * Database module exports.
 * Provides connection pooling, health checks, and migration utilities.
 */

export {
  Database,
  DatabaseConfig,
  HealthCheckResult,
  getDatabase,
  closeDatabase,
  createConfigFromEnv,
} from './connection.js';

export {
  runMigrations,
  getMigrationStatus,
} from './migrate.js';
