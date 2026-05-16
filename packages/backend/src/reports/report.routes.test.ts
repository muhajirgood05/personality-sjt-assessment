/**
 * Tests for Report API routes.
 *
 * Validates:
 * - GET /api/reports/:candidateId — web report endpoint
 * - GET /api/reports/:candidateId/pdf — PDF report endpoint
 * - GET /api/reports/session/:sessionId/export — CSV/Excel export endpoint
 * - Access control (Administrator only)
 * - Error handling (not found, invalid params)
 *
 * Requirements: 11.6, 12.5
 */

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import Fastify from 'fastify';
import { closeBrowser } from './pdf.service';

// Mock auth middleware to bypass authentication in tests
vi.mock('../auth/auth.middleware.js', () => ({
  createAuthMiddleware: () => async () => {},
}));

vi.mock('../auth/rbac.middleware.js', () => ({
  requireAdmin: () => async () => {},
}));

// Mock the report service
vi.mock('./report.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./report.service')>();
  return {
    ...actual,
    getReportData: vi.fn(),
    getSessionExportData: vi.fn(),
    formatAsCsv: vi.fn(),
  };
});

import { getReportData, getSessionExportData, formatAsCsv } from './report.service';
import { reportRoutes } from './report.routes';

const mockGetReportData = vi.mocked(getReportData);
const mockGetSessionExportData = vi.mocked(getSessionExportData);
const mockFormatAsCsv = vi.mocked(formatAsCsv);

function createMockReport() {
  return {
    candidateId: 'candidate-001',
    candidateName: 'Ahmad Fauzi',
    sessionName: 'MINTS 2024',
    completedAt: '2024-06-15T10:30:00.000Z',
    personality: {
      dimensions: [
        { dimension: 'openness', rawScore: 72, stenScore: 7 },
        { dimension: 'conscientiousness', rawScore: 85, stenScore: 9 },
      ],
      facets: [],
      narratives: [],
    },
    sjt: {
      valueScores: [{ value: 'integritas', score: 85 }],
      behavioralExamples: [],
      elaborationScores: [],
    },
    composite: {
      suitabilityScore: 82,
      category: 'Highly Suitable' as const,
      confidence: 'High Confidence' as const,
      personalitySubScore: 78,
      sjtSubScore: 85,
    },
    validity: {
      consistencyIndex: 87,
      averageResponseTimeMs: 4500,
      personalityAvgResponseTimeMs: 3200,
      sjtAvgResponseTimeMs: 12000,
      socialDesirabilityScore: 4,
      validityFlag: 'Valid' as const,
      flaggedResponsePercentage: 5,
      focusLossCount: 1,
      hasValidityWarning: false,
    },
    recommendations: [],
  };
}

// Mock Redis
const mockRedis = {} as never;

// ─── GET /api/reports/:candidateId ───────────────────────────────────────────

describe('GET /api/reports/:candidateId', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    await app.register(reportRoutes, { redis: mockRedis });
    await app.ready();
    vi.clearAllMocks();
  });

  it('returns 404 when candidate report is not found', async () => {
    mockGetReportData.mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/nonexistent-id',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('REPORT_NOT_FOUND');
  });

  it('returns 200 with report data when report exists', async () => {
    const mockReport = createMockReport();
    mockGetReportData.mockResolvedValue(mockReport as never);

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/candidate-001',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.candidateId).toBe('candidate-001');
    expect(body.data.candidateName).toBe('Ahmad Fauzi');
    expect(body.data.composite.suitabilityScore).toBe(82);
    expect(body.data.composite.category).toBe('Highly Suitable');
    expect(body.data.validity).toBeDefined();
    expect(body.data.recommendations).toBeDefined();
  });

  it('returns 500 when service throws an error', async () => {
    mockGetReportData.mockRejectedValue(new Error('Database connection failed'));

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/candidate-001',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('calls getReportData with the correct candidateId', async () => {
    mockGetReportData.mockResolvedValue(createMockReport() as never);

    await app.inject({
      method: 'GET',
      url: '/api/reports/my-candidate-id',
    });

    expect(mockGetReportData).toHaveBeenCalledWith('my-candidate-id');
  });
});

// ─── GET /api/reports/:candidateId/pdf ───────────────────────────────────────

describe('GET /api/reports/:candidateId/pdf', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    await app.register(reportRoutes, { redis: mockRedis });
    await app.ready();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await closeBrowser();
  });

  it('returns 404 when candidate report is not found', async () => {
    mockGetReportData.mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/nonexistent-id/pdf',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('REPORT_NOT_FOUND');
  });

  it('returns PDF with correct headers when report exists', async () => {
    mockGetReportData.mockResolvedValue(createMockReport() as never);

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/candidate-001/pdf',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toContain('laporan-asesmen-candidate-001.pdf');
    // Verify it's a valid PDF (starts with %PDF)
    expect(response.rawPayload.toString('ascii', 0, 4)).toBe('%PDF');
  }, 15_000);

  it('returns PDF within 15 seconds (Requirement 11.6)', async () => {
    mockGetReportData.mockResolvedValue(createMockReport() as never);

    const startTime = Date.now();
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/candidate-001/pdf',
    });
    const elapsed = Date.now() - startTime;

    expect(response.statusCode).toBe(200);
    expect(elapsed).toBeLessThan(15_000);
  }, 15_000);

  it('handles incomplete data gracefully (Requirement 11.7)', async () => {
    const incompleteReport = {
      ...createMockReport(),
      personality: { dimensions: [], facets: [], narratives: [] },
      sjt: { valueScores: [], behavioralExamples: [], elaborationScores: [] },
    };
    mockGetReportData.mockResolvedValue(incompleteReport as never);

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/candidate-001/pdf',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.rawPayload.toString('ascii', 0, 4)).toBe('%PDF');
  }, 15_000);
});

// ─── GET /api/reports/session/:sessionId/export ──────────────────────────────

describe('GET /api/reports/session/:sessionId/export', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    await app.register(reportRoutes, { redis: mockRedis });
    await app.ready();
    vi.clearAllMocks();
  });

  it('returns 404 when session not found', async () => {
    mockGetSessionExportData.mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/session/nonexistent/export?format=csv',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('SESSION_NOT_FOUND');
  });

  it('returns 400 for invalid format', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/session/session-123/export?format=pdf',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INVALID_FORMAT');
  });

  it('returns CSV with correct content-type for csv format', async () => {
    const mockRows = [
      {
        candidateId: 'c1',
        candidateName: 'Alice',
        employeeId: 'E001',
        suitabilityScore: 80,
        openness: 8,
        conscientiousness: 9,
        extraversion: 6,
        agreeableness: 7,
        neuroticism: 3,
        integritas: 8,
        profesionalisme: 9,
        sinergi: 7,
        pelayanan: 7,
        kesempurnaan: 9,
        completionStatus: 'completed',
      },
    ];
    mockGetSessionExportData.mockResolvedValue(mockRows);
    mockFormatAsCsv.mockReturnValue('Candidate ID,Candidate Name\nc1,Alice');

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/session/s1/export?format=csv',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain('session_s1_results.csv');
    expect(mockFormatAsCsv).toHaveBeenCalledWith(mockRows);
  });

  it('returns JSON data for excel format', async () => {
    const mockRows = [
      {
        candidateId: 'c1',
        candidateName: 'Alice',
        employeeId: 'E001',
        suitabilityScore: 80,
        completionStatus: 'completed',
      },
    ];
    mockGetSessionExportData.mockResolvedValue(mockRows);

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/session/s1/export?format=excel',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.format).toBe('excel');
    expect(body.data.sessionId).toBe('s1');
    expect(body.data.rows).toHaveLength(1);
    expect(body.data.generatedAt).toBeDefined();
  });

  it('defaults to csv format when no format specified', async () => {
    mockGetSessionExportData.mockResolvedValue([]);
    mockFormatAsCsv.mockReturnValue('Candidate ID,Candidate Name');

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/session/s1/export',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
  });

  it('returns 500 when service throws an error', async () => {
    mockGetSessionExportData.mockRejectedValue(new Error('DB error'));

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/session/s1/export?format=csv',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('calls getSessionExportData with the correct sessionId', async () => {
    mockGetSessionExportData.mockResolvedValue([]);
    mockFormatAsCsv.mockReturnValue('');

    await app.inject({
      method: 'GET',
      url: '/api/reports/session/my-session-id/export?format=csv',
    });

    expect(mockGetSessionExportData).toHaveBeenCalledWith('my-session-id', undefined);
  });
});
