/**
 * Database migration runner using node-pg-migrate.
 * Runs SQL migration files in order from the migrations directory.
 */

import { resolve } from 'path';
import { readdir, readFile } from 'fs/promises';
import { getDatabase, createConfigFromEnv, closeDatabase } from './connection.js';

/**
 * Run all pending migrations in order.
 */
export async function runMigrations(): Promise<void> {
  const db = getDatabase(createConfigFromEnv());

  // Ensure migrations tracking table exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Get already-executed migrations
  const { rows: executed } = await db.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY filename'
  );
  const executedSet = new Set(executed.map((r) => r.filename));

  // Read migration files from directory
  const migrationsDir = resolve(import.meta.dirname ?? __dirname, 'migrations');
  const files = await readdir(migrationsDir);
  const sqlFiles = files
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // Run pending migrations
  for (const file of sqlFiles) {
    if (executedSet.has(file)) {
      continue;
    }

    console.log(`[Migration] Running: ${file}`);
    const filePath = resolve(migrationsDir, file);
    const sql = await readFile(filePath, 'utf-8');

    await db.transaction(async (client) => {
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file]
      );
    });

    console.log(`[Migration] Completed: ${file}`);
  }

  console.log('[Migration] All migrations up to date.');
}

/**
 * Rollback is not supported for raw SQL migrations.
 * Use a new migration to undo changes.
 */
export async function getMigrationStatus(): Promise<{ filename: string; executedAt: Date }[]> {
  const db = getDatabase(createConfigFromEnv());

  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows } = await db.query<{ filename: string; executed_at: Date }>(
    'SELECT filename, executed_at FROM schema_migrations ORDER BY filename'
  );

  return rows.map((r) => ({ filename: r.filename, executedAt: r.executed_at }));
}

// CLI entry point
if (process.argv[1] && (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'))) {
  const command = process.argv[2] ?? 'up';

  if (command === 'up') {
    runMigrations()
      .then(() => {
        console.log('[Migration] Done.');
        return closeDatabase();
      })
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('[Migration] Failed:', err);
        process.exit(1);
      });
  } else if (command === 'status') {
    getMigrationStatus()
      .then((migrations) => {
        console.log('[Migration] Status:');
        for (const m of migrations) {
          console.log(`  ✓ ${m.filename} (${m.executedAt.toISOString()})`);
        }
        return closeDatabase();
      })
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('[Migration] Failed:', err);
        process.exit(1);
      });
  } else {
    console.error(`Unknown command: ${command}. Use 'up' or 'status'.`);
    process.exit(1);
  }
}
