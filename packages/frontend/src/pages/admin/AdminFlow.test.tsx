/**
 * Tests for AdminFlow orchestrator.
 * Verifies the admin flow wiring: Dashboard → Report Viewer with PDF download.
 *
 * Validates: Requirements 12.1, 11.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminFlow } from './AdminFlow';
import { AssessmentStatus } from '@assessment/shared';

// Mock the admin API service
const mockListSessions = vi.fn();
const mockGetSessionCandidates = vi.fn();
const mockGetCandidateReport = vi.fn();
const mockDownloadReportPdf = vi.fn();
const mockGetSessionAnalytics = vi.fn();

vi.mock('../../services/admin-api.js', () => ({
  listSessions: (...args: unknown[]) => mockListSessions(...args),
  createSession: vi.fn().mockResolvedValue({ success: true, data: { sessionId: 'new-1' } }),
  getSessionCandidates: (...args: unknown[]) => mockGetSessionCandidates(...args),
  getSessionAnalytics: (...args: unknown[]) => mockGetSessionAnalytics(...args),
  getCandidateReport: (...args: unknown[]) => mockGetCandidateReport(...args),
  downloadReportPdf: (...args: unknown[]) => mockDownloadReportPdf(...args),
  exportSessionResults: vi.fn().mockResolvedValue(new Blob(['csv'], { type: 'text/csv' })),
}));

// Mock the api-client
vi.mock('../../auth/api-client.js', () => ({
  apiRequest: vi.fn().mockResolvedValue(new Response()),
  apiJson: vi.fn().mockResolvedValue({ success: true }),
}));

describe('AdminFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockListSessions.mockResolvedValue({
      success: true,
      data: {
        sessions: [
          {
            id: 'session-1',
            name: 'MINTS Batch 2024-A',
            startDate: '2024-01-15T00:00:00.000Z',
            endDate: '2024-01-20T00:00:00.000Z',
            status: 'active',
            totalCandidates: 10,
            completedCount: 5,
            inProgressCount: 3,
            notStartedCount: 2,
          },
        ],
      },
    });

    mockGetSessionCandidates.mockResolvedValue({
      success: true,
      data: {
        sessionId: 'session-1',
        candidates: [
          {
            candidateId: 'candidate-1',
            candidateName: 'Budi Santoso',
            employeeId: 'EMP-001',
            personalityStatus: AssessmentStatus.Completed,
            sjtStatus: AssessmentStatus.Completed,
            overallStatus: AssessmentStatus.Completed,
            startedAt: '2024-01-15T08:00:00.000Z',
            completedAt: '2024-01-15T10:00:00.000Z',
          },
        ],
      },
    });

    mockGetCandidateReport.mockResolvedValue({
      success: true,
      data: {
        candidateId: 'candidate-1',
        candidateName: 'Budi Santoso',
        sessionName: 'MINTS Batch 2024-A',
        completedAt: '2024-01-15T10:00:00.000Z',
        personality: { dimensions: [], facets: [], narratives: [] },
        sjt: { valueScores: [], behavioralExamples: [], elaborationScores: [] },
        composite: {
          suitabilityScore: 75,
          category: 'Suitable',
          confidence: 'High Confidence',
          personalitySubScore: 70,
          sjtSubScore: 78,
        },
        validity: {
          consistencyIndex: 85,
          averageResponseTimeMs: 5000,
          personalityAvgResponseTimeMs: 4000,
          sjtAvgResponseTimeMs: 12000,
          socialDesirabilityScore: 3,
          validityFlag: 'Valid',
          flaggedResponsePercentage: 5,
          focusLossCount: 0,
          hasValidityWarning: false,
        },
        recommendations: [],
      },
    });

    mockDownloadReportPdf.mockResolvedValue(
      new Blob(['pdf-content'], { type: 'application/pdf' })
    );

    mockGetSessionAnalytics.mockResolvedValue({
      success: true,
      data: {
        sessionId: 'session-1',
        totalCandidates: 10,
        completionPercentage: 50,
        averageSuitabilityScore: 72,
        suitabilityDistribution: [],
        oceanDistribution: [],
        valueDistribution: [],
      },
    });
  });

  it('should render the admin flow container', async () => {
    render(<AdminFlow />);

    expect(screen.getByTestId('admin-flow')).toBeInTheDocument();
  });

  it('should display the admin navigation bar', async () => {
    render(<AdminFlow />);

    expect(screen.getByText('Assessment Platform — Admin')).toBeInTheDocument();
    expect(screen.getByTestId('logout-btn')).toBeInTheDocument();
  });

  it('should render the dashboard with session data', async () => {
    render(<AdminFlow />);

    await waitFor(() => {
      expect(screen.getByText('MINTS Batch 2024-A')).toBeInTheDocument();
    });
  });

  it('should call onLogout when logout button is clicked', async () => {
    const onLogout = vi.fn();
    render(<AdminFlow onLogout={onLogout} />);

    fireEvent.click(screen.getByTestId('logout-btn'));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('should navigate to report viewer when onViewReport is triggered', async () => {
    render(<AdminFlow />);

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('MINTS Batch 2024-A')).toBeInTheDocument();
    });

    // Click "Kandidat" to view candidates
    const kandidatBtn = screen.getByRole('button', { name: /Lihat kandidat sesi MINTS Batch 2024-A/ });
    fireEvent.click(kandidatBtn);

    // Wait for candidates to load
    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    });

    // Click "Laporan" button for the completed candidate
    const reportBtn = screen.getByRole('button', { name: /Lihat laporan Budi Santoso/ });
    fireEvent.click(reportBtn);

    // Should show report viewer
    await waitFor(() => {
      expect(screen.getByTestId('report-viewer')).toBeInTheDocument();
    });
  });

  it('should show PDF download button on report viewer', async () => {
    render(<AdminFlow />);

    // Navigate to candidates
    await waitFor(() => {
      expect(screen.getByText('MINTS Batch 2024-A')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Lihat kandidat sesi/ }));

    // Navigate to report
    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Lihat laporan Budi Santoso/ }));

    // Should show PDF download button
    await waitFor(() => {
      expect(screen.getByTestId('download-pdf-btn')).toBeInTheDocument();
    });
  });

  it('should navigate back from report viewer to dashboard', async () => {
    render(<AdminFlow />);

    // Navigate to candidates
    await waitFor(() => {
      expect(screen.getByText('MINTS Batch 2024-A')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Lihat kandidat sesi/ }));

    // Navigate to report
    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Lihat laporan Budi Santoso/ }));

    // Wait for report to load
    await waitFor(() => {
      expect(screen.getByTestId('report-viewer')).toBeInTheDocument();
    });

    // Click back button
    fireEvent.click(screen.getByTestId('back-btn'));

    // Should be back at dashboard
    await waitFor(() => {
      expect(screen.getByText('Dashboard Administrator')).toBeInTheDocument();
    });
  });
});
