/**
 * Report API Fastify route handlers.
 *
 * Endpoints:
 * - GET /api/reports/:candidateId — Get web report data for a candidate
 * - GET /api/reports/session/:sessionId/export — Export session results as CSV/Excel
 *
 * Access: Restricted to Administrators only.
 *
 * Validates: Requirements 11.6, 12.5
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type Redis from 'ioredis';
import type { Database } from '../db/connection.js';
import type { ExportSessionResultsQuery } from '@assessment/shared';
import { createAuthMiddleware } from '../auth/auth.middleware.js';
import { requireAdmin } from '../auth/rbac.middleware.js';
import { getReportData, getSessionExportData, formatAsCsv } from './report.service.js';
import { generateReportPdf, PdfGenerationTimeoutError } from './pdf.service.js';

// ─── Route Options ───────────────────────────────────────────────────────────

export interface ReportRoutesOptions {
  redis: Redis;
  db?: Database;
}

// ─── Route Registration ──────────────────────────────────────────────────────

export async function reportRoutes(
  app: FastifyInstance,
  options: ReportRoutesOptions
): Promise<void> {
  const authMiddleware = createAuthMiddleware({ redis: options.redis });
  const adminGuard = requireAdmin();

  /**
   * GET /api/reports/:candidateId
   *
   * Returns comprehensive web report data for a candidate.
   * Includes personality profile, SJT results, composite score,
   * validity indicators, and improvement recommendations.
   *
   * Access: Administrator only
   */
  app.get(
    '/api/reports/:candidateId',
    { preHandler: [authMiddleware, adminGuard] },
    async (
      request: FastifyRequest<{ Params: { candidateId: string } }>,
      reply: FastifyReply
    ) => {
      const { candidateId } = request.params;

      if (!candidateId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'candidateId parameter is required',
          },
        });
      }

      try {
        const report = await getReportData(candidateId);

        if (!report) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'REPORT_NOT_FOUND',
              message: 'No completed assessment report found for this candidate',
            },
          });
        }

        return reply.status(200).send({
          success: true,
          data: report,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Reports] Get candidate report failed:', message);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to generate candidate report',
          },
        });
      }
    }
  );

  /**
   * GET /api/reports/:candidateId/pdf
   *
   * Download PDF report for a candidate.
   * Renders the report as HTML and converts to PDF using Puppeteer.
   *
   * Requirements:
   * - 11.6: Report available in downloadable PDF format within 15 seconds
   * - 11.7: Incomplete data renders with section-level notices
   *
   * Access: Administrator only
   */
  app.get(
    '/api/reports/:candidateId/pdf',
    { preHandler: [authMiddleware, adminGuard] },
    async (
      request: FastifyRequest<{ Params: { candidateId: string } }>,
      reply: FastifyReply
    ) => {
      const { candidateId } = request.params;

      if (!candidateId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'candidateId parameter is required',
          },
        });
      }

      try {
        const report = await getReportData(candidateId);

        if (!report) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'REPORT_NOT_FOUND',
              message: 'No completed assessment report found for this candidate',
            },
          });
        }

        // Generate PDF from report data
        const pdfBuffer = await generateReportPdf(report);

        // Set response headers for PDF download
        const filename = `laporan-asesmen-${candidateId}.pdf`;
        return reply
          .status(200)
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .header('Content-Length', pdfBuffer.length)
          .send(pdfBuffer);
      } catch (error) {
        if (error instanceof PdfGenerationTimeoutError) {
          return reply.status(504).send({
            success: false,
            error: {
              code: 'PDF_GENERATION_TIMEOUT',
              message: 'PDF generation exceeded the 15 second time limit. Please try again.',
            },
          });
        }

        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Reports] PDF generation failed:', message);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'PDF_GENERATION_ERROR',
            message: 'An error occurred while generating the PDF report.',
          },
        });
      }
    }
  );

  /**
   * GET /api/reports/session/:sessionId/export
   *
   * Exports assessment results for all candidates in a session.
   * Supports CSV format (default) and Excel format.
   * Contains: Suitability_Score, OCEAN dimension scores,
   * Kemenkeu_Values alignment scores, and completion status.
   *
   * Query params:
   * - format: 'csv' | 'excel' (default: 'csv')
   *
   * Access: Administrator only
   */
  app.get(
    '/api/reports/session/:sessionId/export',
    { preHandler: [authMiddleware, adminGuard] },
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
        Querystring: ExportSessionResultsQuery;
      }>,
      reply: FastifyReply
    ) => {
      const { sessionId } = request.params;
      const { format = 'csv' } = request.query;

      if (!sessionId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'sessionId parameter is required',
          },
        });
      }

      if (format !== 'csv' && format !== 'excel') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Export format must be "csv" or "excel"',
          },
        });
      }

      try {
        const exportData = await getSessionExportData(sessionId, options.db);

        if (!exportData) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'SESSION_NOT_FOUND',
              message: 'Assessment session not found',
            },
          });
        }

        if (format === 'csv') {
          const csv = formatAsCsv(exportData);
          return reply
            .status(200)
            .header('Content-Type', 'text/csv; charset=utf-8')
            .header(
              'Content-Disposition',
              `attachment; filename="session_${sessionId}_results.csv"`
            )
            .send(csv);
        }

        // Excel format: return as JSON with metadata for client-side Excel generation
        // (Full Excel generation would require a library like exceljs)
        return reply.status(200).send({
          success: true,
          data: {
            format: 'excel',
            sessionId,
            rows: exportData,
            generatedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Reports] Session export failed:', message);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to export session results',
          },
        });
      }
    }
  );
}
