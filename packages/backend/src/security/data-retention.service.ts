/**
 * Data retention service implementing automatic archival and deletion
 * of assessment data after the configured retention period (2-year max).
 *
 * Validates: Requirements 14.6
 */

import { Database } from '../db/connection.js';

/** Data retention policy configuration */
export interface RetentionPolicy {
  /** Maximum retention period in days (default: 730 = 2 years) */
  maxRetentionDays: number;
  /** Action to take when data exceeds retention period */
  action: 'archive' | 'delete';
  /** Batch size for processing records (default: 100) */
  batchSize: number;
  /** Whether to run in dry-run mode (log only, no changes) */
  dryRun: boolean;
}

/** Result of a retention policy execution */
export interface RetentionResult {
  /** Number of assessments processed */
  assessmentsProcessed: number;
  /** Number of responses archived/deleted */
  responsesProcessed: number;
  /** Number of scoring results archived/deleted */
  scoringResultsProcessed: number;
  /** Number of anti-faking results archived/deleted */
  antiFakingResultsProcessed: number;
  /** Timestamp when the retention job ran */
  executedAt: Date;
  /** Whether this was a dry run */
  dryRun: boolean;
  /** Any errors encountered during processing */
  errors: string[];
}

/**
 * Service responsible for enforcing data retention policies.
 * Automatically archives or deletes assessment data older than the configured period.
 */
export class DataRetentionService {
  private readonly db: Database;
  private readonly policy: RetentionPolicy;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(db: Database, policy?: Partial<RetentionPolicy>) {
    this.db = db;
    this.policy = {
      maxRetentionDays: policy?.maxRetentionDays ?? 730, // 2 years
      action: policy?.action ?? 'archive',
      batchSize: policy?.batchSize ?? 100,
      dryRun: policy?.dryRun ?? false,
    };

    // Enforce maximum of 2 years (730 days)
    if (this.policy.maxRetentionDays > 730) {
      this.policy.maxRetentionDays = 730;
    }
  }

  /**
   * Get the current retention policy configuration.
   */
  getPolicy(): Readonly<RetentionPolicy> {
    return { ...this.policy };
  }

  /**
   * Execute the data retention policy.
   * Finds assessments older than the retention period and archives or deletes them.
   */
  async executeRetentionPolicy(): Promise<RetentionResult> {
    const result: RetentionResult = {
      assessmentsProcessed: 0,
      responsesProcessed: 0,
      scoringResultsProcessed: 0,
      antiFakingResultsProcessed: 0,
      executedAt: new Date(),
      dryRun: this.policy.dryRun,
      errors: [],
    };

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.policy.maxRetentionDays);

    try {
      // Find assessments that have exceeded the retention period
      const expiredAssessments = await this.findExpiredAssessments(cutoffDate);

      if (expiredAssessments.length === 0) {
        return result;
      }

      // Process in batches
      for (let i = 0; i < expiredAssessments.length; i += this.policy.batchSize) {
        const batch = expiredAssessments.slice(i, i + this.policy.batchSize);
        const batchIds = batch.map((a) => a.id);

        try {
          const batchResult = await this.processBatch(batchIds);
          result.assessmentsProcessed += batchResult.assessments;
          result.responsesProcessed += batchResult.responses;
          result.scoringResultsProcessed += batchResult.scoringResults;
          result.antiFakingResultsProcessed += batchResult.antiFakingResults;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Batch starting at index ${i}: ${errorMsg}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Policy execution failed: ${errorMsg}`);
    }

    return result;
  }

  /**
   * Find assessments that have exceeded the retention period.
   */
  private async findExpiredAssessments(
    cutoffDate: Date
  ): Promise<Array<{ id: string; completed_at: Date }>> {
    const query = `
      SELECT id, completed_at
      FROM assessments
      WHERE completed_at IS NOT NULL
        AND completed_at < $1
        AND status = 'completed'
      ORDER BY completed_at ASC
    `;

    const { rows } = await this.db.query<{ id: string; completed_at: Date }>(query, [cutoffDate]);
    return rows;
  }

  /**
   * Process a batch of assessment IDs according to the retention policy.
   */
  private async processBatch(
    assessmentIds: string[]
  ): Promise<{ assessments: number; responses: number; scoringResults: number; antiFakingResults: number }> {
    if (this.policy.dryRun) {
      // In dry-run mode, just count what would be affected
      return this.countAffectedRecords(assessmentIds);
    }

    if (this.policy.action === 'archive') {
      return this.archiveBatch(assessmentIds);
    } else {
      return this.deleteBatch(assessmentIds);
    }
  }

  /**
   * Count records that would be affected (for dry-run mode).
   */
  private async countAffectedRecords(
    assessmentIds: string[]
  ): Promise<{ assessments: number; responses: number; scoringResults: number; antiFakingResults: number }> {
    const responsesResult = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM responses WHERE assessment_id = ANY($1)',
      [assessmentIds]
    );
    const scoringResult = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM scoring_results WHERE assessment_id = ANY($1)',
      [assessmentIds]
    );
    const antiFakingResult = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM anti_faking_results WHERE assessment_id = ANY($1)',
      [assessmentIds]
    );

    return {
      assessments: assessmentIds.length,
      responses: parseInt(responsesResult.rows[0]?.count ?? '0', 10),
      scoringResults: parseInt(scoringResult.rows[0]?.count ?? '0', 10),
      antiFakingResults: parseInt(antiFakingResult.rows[0]?.count ?? '0', 10),
    };
  }

  /**
   * Archive a batch of assessments by marking them as archived.
   * Moves data to archived status while preserving it for potential audit needs.
   */
  private async archiveBatch(
    assessmentIds: string[]
  ): Promise<{ assessments: number; responses: number; scoringResults: number; antiFakingResults: number }> {
    return this.db.transaction(async (client) => {
      // Count affected records before archiving
      const responsesResult = await client.query(
        'SELECT COUNT(*) as count FROM responses WHERE assessment_id = ANY($1)',
        [assessmentIds]
      );
      const scoringResult = await client.query(
        'SELECT COUNT(*) as count FROM scoring_results WHERE assessment_id = ANY($1)',
        [assessmentIds]
      );
      const antiFakingResult = await client.query(
        'SELECT COUNT(*) as count FROM anti_faking_results WHERE assessment_id = ANY($1)',
        [assessmentIds]
      );

      // Mark assessments as archived (update status)
      await client.query(
        `UPDATE assessments SET status = 'expired' WHERE id = ANY($1)`,
        [assessmentIds]
      );

      // Mark the parent sessions as archived if all their assessments are now expired
      await client.query(
        `UPDATE assessment_sessions SET status = 'archived'
         WHERE id IN (
           SELECT DISTINCT session_id FROM assessments WHERE id = ANY($1)
         )
         AND NOT EXISTS (
           SELECT 1 FROM assessments a
           WHERE a.session_id = assessment_sessions.id
             AND a.status NOT IN ('expired')
             AND a.id != ALL($1)
         )`,
        [assessmentIds]
      );

      // Log the archival action in audit log
      await client.query(
        `INSERT INTO audit_log (user_id, user_role, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          '00000000-0000-0000-0000-000000000000', // system user
          'system',
          'data_retention_archive',
          'assessment',
          assessmentIds[0],
          JSON.stringify({
            assessmentIds,
            retentionDays: this.policy.maxRetentionDays,
            totalArchived: assessmentIds.length,
          }),
          '127.0.0.1',
        ]
      );

      return {
        assessments: assessmentIds.length,
        responses: parseInt(responsesResult.rows[0]?.count ?? '0', 10),
        scoringResults: parseInt(scoringResult.rows[0]?.count ?? '0', 10),
        antiFakingResults: parseInt(antiFakingResult.rows[0]?.count ?? '0', 10),
      };
    });
  }

  /**
   * Delete a batch of assessments and all related data permanently.
   */
  private async deleteBatch(
    assessmentIds: string[]
  ): Promise<{ assessments: number; responses: number; scoringResults: number; antiFakingResults: number }> {
    return this.db.transaction(async (client) => {
      // Count affected records before deletion
      const responsesResult = await client.query(
        'SELECT COUNT(*) as count FROM responses WHERE assessment_id = ANY($1)',
        [assessmentIds]
      );
      const scoringResult = await client.query(
        'SELECT COUNT(*) as count FROM scoring_results WHERE assessment_id = ANY($1)',
        [assessmentIds]
      );
      const antiFakingResult = await client.query(
        'SELECT COUNT(*) as count FROM anti_faking_results WHERE assessment_id = ANY($1)',
        [assessmentIds]
      );

      // Log the deletion action in audit log BEFORE deleting
      await client.query(
        `INSERT INTO audit_log (user_id, user_role, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          '00000000-0000-0000-0000-000000000000', // system user
          'system',
          'data_retention_delete',
          'assessment',
          assessmentIds[0],
          JSON.stringify({
            assessmentIds,
            retentionDays: this.policy.maxRetentionDays,
            totalDeleted: assessmentIds.length,
          }),
          '127.0.0.1',
        ]
      );

      // Delete in correct order (respecting foreign key constraints)
      // responses, scoring_results, anti_faking_results have CASCADE on assessment_id
      // but we delete explicitly for accurate counting
      await client.query(
        'DELETE FROM responses WHERE assessment_id = ANY($1)',
        [assessmentIds]
      );
      await client.query(
        'DELETE FROM scoring_results WHERE assessment_id = ANY($1)',
        [assessmentIds]
      );
      await client.query(
        'DELETE FROM anti_faking_results WHERE assessment_id = ANY($1)',
        [assessmentIds]
      );
      await client.query(
        'DELETE FROM assessments WHERE id = ANY($1)',
        [assessmentIds]
      );

      return {
        assessments: assessmentIds.length,
        responses: parseInt(responsesResult.rows[0]?.count ?? '0', 10),
        scoringResults: parseInt(scoringResult.rows[0]?.count ?? '0', 10),
        antiFakingResults: parseInt(antiFakingResult.rows[0]?.count ?? '0', 10),
      };
    });
  }

  /**
   * Start the retention policy scheduler.
   * Runs the retention check at the specified interval.
   * @param intervalMs - How often to check (default: 24 hours)
   */
  startScheduler(intervalMs: number = 24 * 60 * 60 * 1000): void {
    if (this.intervalHandle) {
      return; // Already running
    }

    // Run immediately on start
    this.executeRetentionPolicy().catch((err) => {
      console.error('[DataRetention] Initial execution failed:', err);
    });

    // Schedule periodic execution
    this.intervalHandle = setInterval(async () => {
      try {
        const result = await this.executeRetentionPolicy();
        if (result.assessmentsProcessed > 0) {
          console.log(
            `[DataRetention] Processed ${result.assessmentsProcessed} assessments ` +
            `(action: ${this.policy.action}, errors: ${result.errors.length})`
          );
        }
      } catch (err) {
        console.error('[DataRetention] Scheduled execution failed:', err);
      }
    }, intervalMs);
  }

  /**
   * Stop the retention policy scheduler.
   */
  stopScheduler(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a DataRetentionService from environment variables.
 */
export function createRetentionConfigFromEnv(): Partial<RetentionPolicy> {
  return {
    maxRetentionDays: parseInt(process.env['DATA_RETENTION_DAYS'] ?? '730', 10),
    action: (process.env['DATA_RETENTION_ACTION'] as 'archive' | 'delete') ?? 'archive',
    batchSize: parseInt(process.env['DATA_RETENTION_BATCH_SIZE'] ?? '100', 10),
    dryRun: process.env['DATA_RETENTION_DRY_RUN'] === 'true',
  };
}
