/**
 * Tests for the Admin Dashboard components.
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminDashboard } from './AdminDashboard.js';
import { SessionCreationForm } from './SessionCreationForm.js';
import { CandidateProgressTable } from './CandidateProgressTable.js';
import { AntiFakingIndicators } from './AntiFakingIndicators.js';
import { AssessmentStatus } from '@assessment/shared';

// Mock the admin-api module
vi.mock('../../services/admin-api.js', () => ({
  listSessions: vi.fn(),
  createSession: vi.fn(),
  getSessionCandidates: vi.fn(),
  getSessionAnalytics: vi.fn(),
  getCandidateReport: vi.fn(),
}));

import {
  listSessions,
  createSession,
  getSessionCandidates,
  getCandidateReport,
} from '../../services/admin-api.js';

const mockListSessions = vi.mocked(listSessions);
const mockCreateSession = vi.mocked(createSession);
const mockGetSessionCandidates = vi.mocked(getSessionCandidates);
const mockGetCandidateReport = vi.mocked(getCandidateReport);

describe('AdminDashboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    mockListSessions.mockReturnValue(new Promise(() => {})); // never resolves
    render(<AdminDashboard />);
    expect(screen.getByText('Memuat data...')).toBeInTheDocument();
  });

  it('renders dashboard overview with session statistics', async () => {
    mockListSessions.mockResolvedValue({
      success: true,
      data: {
        sessions: [
          {
            id: 'session-1',
            name: 'Batch 2024',
            startDate: '2024-01-01T00:00:00Z',
            endDate: '2024-02-01T00:00:00Z',
            status: 'active',
            totalCandidates: 50,
            completedCount: 20,
            inProgressCount: 15,
            notStartedCount: 15,
          },
          {
            id: 'session-2',
            name: 'Batch 2023',
            startDate: '2023-01-01T00:00:00Z',
            endDate: '2023-02-01T00:00:00Z',
            status: 'closed',
            totalCandidates: 30,
            completedCount: 30,
            inProgressCount: 0,
            notStartedCount: 0,
          },
        ],
      },
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      // Active sessions count
      expect(screen.getByText('1')).toBeInTheDocument();
      // Total candidates
      expect(screen.getByText('80')).toBeInTheDocument();
      // Completed count appears in stat card and possibly table
      expect(screen.getAllByText('50').length).toBeGreaterThan(0);
      // In progress
      expect(screen.getAllByText('15').length).toBeGreaterThan(0);
    });

    // Session names in table
    expect(screen.getByText('Batch 2024')).toBeInTheDocument();
    expect(screen.getByText('Batch 2023')).toBeInTheDocument();
  });

  it('shows error message when API fails', async () => {
    mockListSessions.mockResolvedValue({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Server error' },
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server error');
    });
  });

  it('navigates to session creation form', async () => {
    mockListSessions.mockResolvedValue({
      success: true,
      data: { sessions: [] },
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('+ Buat Sesi Baru')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Buat Sesi Baru'));
    expect(screen.getByText('Buat Sesi Assessment Baru')).toBeInTheDocument();
  });

  it('auto-refreshes sessions every 30 seconds', async () => {
    vi.useFakeTimers();
    mockListSessions.mockResolvedValue({
      success: true,
      data: { sessions: [] },
    });

    render(<AdminDashboard />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockListSessions).toHaveBeenCalledTimes(1);

    // Advance 30 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(mockListSessions).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe('SessionCreationForm', () => {
  const onSuccess = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all form fields', () => {
    render(<SessionCreationForm onSuccess={onSuccess} onCancel={onCancel} />);

    expect(screen.getByLabelText(/Nama Sesi/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tanggal Mulai/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tanggal Selesai/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Daftar Kandidat/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Durasi Tes Kepribadian/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Durasi Tes SJT/)).toBeInTheDocument();
  });

  it('shows validation errors for empty form submission', async () => {
    const user = userEvent.setup();
    render(<SessionCreationForm onSuccess={onSuccess} onCancel={onCancel} />);

    await user.click(screen.getByText('Buat Sesi'));

    await waitFor(() => {
      expect(screen.getByText('Nama sesi wajib diisi')).toBeInTheDocument();
      expect(screen.getByText('Tanggal mulai wajib diisi')).toBeInTheDocument();
      expect(screen.getByText('Tanggal selesai wajib diisi')).toBeInTheDocument();
      expect(screen.getByText('Daftar kandidat tidak boleh kosong')).toBeInTheDocument();
    });
  });

  it('validates end date must be after start date', async () => {
    const user = userEvent.setup();
    render(<SessionCreationForm onSuccess={onSuccess} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/Nama Sesi/), 'Test Session');
    fireEvent.change(screen.getByLabelText(/Tanggal Mulai/), { target: { value: '2024-06-15T10:00' } });
    fireEvent.change(screen.getByLabelText(/Tanggal Selesai/), { target: { value: '2024-06-14T10:00' } });
    await user.type(screen.getByLabelText(/Daftar Kandidat/), 'candidate-1');

    await user.click(screen.getByText('Buat Sesi'));

    await waitFor(() => {
      expect(screen.getByText('Tanggal selesai harus setelah tanggal mulai')).toBeInTheDocument();
    });
  });

  it('validates timer bounds (60-7200 seconds)', async () => {
    render(<SessionCreationForm onSuccess={onSuccess} onCancel={onCancel} />);

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Nama Sesi/), { target: { value: 'Test Session' } });
    fireEvent.change(screen.getByLabelText(/Tanggal Mulai/), { target: { value: '2024-06-15T10:00' } });
    fireEvent.change(screen.getByLabelText(/Tanggal Selesai/), { target: { value: '2024-06-20T10:00' } });
    fireEvent.change(screen.getByLabelText(/Daftar Kandidat/), { target: { value: 'candidate-1' } });

    // Set invalid timer value
    fireEvent.change(screen.getByLabelText(/Durasi Tes Kepribadian/), { target: { value: '30' } });

    // Submit the form
    fireEvent.submit(screen.getByRole('form', { name: /Form pembuatan sesi/ }));

    await waitFor(() => {
      // The error message should appear somewhere in the form
      expect(screen.getByText(/Durasi harus antara/)).toBeInTheDocument();
    });
  });

  it('submits valid form and calls onSuccess', async () => {
    const user = userEvent.setup();
    mockCreateSession.mockResolvedValue({
      success: true,
      data: {
        sessionId: 'new-session-id',
        name: 'Test Session',
        startDate: '2024-06-15T10:00:00Z',
        endDate: '2024-06-20T10:00:00Z',
        candidateCount: 2,
      },
    });

    render(<SessionCreationForm onSuccess={onSuccess} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/Nama Sesi/), 'Test Session');
    fireEvent.change(screen.getByLabelText(/Tanggal Mulai/), { target: { value: '2024-06-15T10:00' } });
    fireEvent.change(screen.getByLabelText(/Tanggal Selesai/), { target: { value: '2024-06-20T10:00' } });
    await user.type(screen.getByLabelText(/Daftar Kandidat/), 'candidate-1\ncandidate-2');

    await user.click(screen.getByText('Buat Sesi'));

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Session',
          candidateIds: ['candidate-1', 'candidate-2'],
          personalityTimerSeconds: 2700,
          sjtTimerSeconds: 3600,
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<SessionCreationForm onSuccess={onSuccess} onCancel={onCancel} />);

    await user.click(screen.getByText('Batal'));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('CandidateProgressTable', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders candidate progress with status indicators', async () => {
    mockGetSessionCandidates.mockResolvedValue({
      success: true,
      data: {
        sessionId: 'session-1',
        candidates: [
          {
            candidateId: 'c1',
            candidateName: 'Ahmad',
            employeeId: 'EMP001',
            personalityStatus: AssessmentStatus.Completed,
            sjtStatus: AssessmentStatus.InProgress,
            overallStatus: AssessmentStatus.InProgress,
            startedAt: '2024-06-15T10:00:00Z',
            completedAt: null,
          },
          {
            candidateId: 'c2',
            candidateName: 'Budi',
            employeeId: 'EMP002',
            personalityStatus: AssessmentStatus.NotStarted,
            sjtStatus: AssessmentStatus.NotStarted,
            overallStatus: AssessmentStatus.NotStarted,
            startedAt: null,
            completedAt: null,
          },
        ],
      },
    });

    render(<CandidateProgressTable sessionId="session-1" />);

    await waitFor(() => {
      expect(screen.getByText('Ahmad')).toBeInTheDocument();
      expect(screen.getByText('Budi')).toBeInTheDocument();
      expect(screen.getByText('EMP001')).toBeInTheDocument();
      expect(screen.getByText('EMP002')).toBeInTheDocument();
    });

    // Status indicators
    expect(screen.getAllByText('Selesai').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sedang Berlangsung').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Belum Dimulai').length).toBeGreaterThan(0);
  });

  it('filters candidates by status', async () => {
    mockGetSessionCandidates.mockResolvedValue({
      success: true,
      data: {
        sessionId: 'session-1',
        candidates: [
          {
            candidateId: 'c1',
            candidateName: 'Ahmad',
            employeeId: 'EMP001',
            personalityStatus: AssessmentStatus.Completed,
            sjtStatus: AssessmentStatus.Completed,
            overallStatus: AssessmentStatus.Completed,
            startedAt: '2024-06-15T10:00:00Z',
            completedAt: '2024-06-15T11:00:00Z',
          },
          {
            candidateId: 'c2',
            candidateName: 'Budi',
            employeeId: 'EMP002',
            personalityStatus: AssessmentStatus.NotStarted,
            sjtStatus: AssessmentStatus.NotStarted,
            overallStatus: AssessmentStatus.NotStarted,
            startedAt: null,
            completedAt: null,
          },
        ],
      },
    });

    render(<CandidateProgressTable sessionId="session-1" />);

    await waitFor(() => {
      expect(screen.getByText('Ahmad')).toBeInTheDocument();
      expect(screen.getByText('Budi')).toBeInTheDocument();
    });

    // Click "Selesai" filter
    fireEvent.click(screen.getByRole('tab', { name: /Selesai/ }));

    expect(screen.getByText('Ahmad')).toBeInTheDocument();
    expect(screen.queryByText('Budi')).not.toBeInTheDocument();
  });

  it('auto-refreshes every 30 seconds', async () => {
    vi.useFakeTimers();
    mockGetSessionCandidates.mockResolvedValue({
      success: true,
      data: { sessionId: 'session-1', candidates: [] },
    });

    render(<CandidateProgressTable sessionId="session-1" />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockGetSessionCandidates).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(mockGetSessionCandidates).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe('AntiFakingIndicators', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all anti-faking indicators with descriptions', async () => {
    mockGetCandidateReport.mockResolvedValue({
      success: true,
      data: {
        candidateId: 'c1',
        candidateName: 'Ahmad',
        sessionName: 'Batch 2024',
        completedAt: '2024-06-15T11:00:00Z',
        personality: { dimensions: [], facets: [], narratives: [] },
        sjt: { valueScores: [], behavioralExamples: [], elaborationScores: [] },
        composite: {
          suitabilityScore: 75,
          category: 'Suitable' as const,
          confidence: 'High Confidence' as const,
          personalitySubScore: 70,
          sjtSubScore: 78,
        },
        validity: {
          consistencyIndex: 85,
          averageResponseTimeMs: 5000,
          personalityAvgResponseTimeMs: 4000,
          sjtAvgResponseTimeMs: 12000,
          socialDesirabilityScore: 3,
          validityFlag: 'Valid' as const,
          flaggedResponsePercentage: 5,
          focusLossCount: 1,
          hasValidityWarning: false,
        },
        recommendations: [],
      },
    });

    render(<AntiFakingIndicators candidateId="c1" />);

    await waitFor(() => {
      // Candidate name displayed
      expect(screen.getByText('Ahmad')).toBeInTheDocument();
      // Session name
      expect(screen.getByText(/Batch 2024/)).toBeInTheDocument();
      // All indicator names
      expect(screen.getByText('Indeks Konsistensi')).toBeInTheDocument();
      expect(screen.getByText('Waktu Respons Rata-rata')).toBeInTheDocument();
      expect(screen.getByText('Persentase Respons Cepat')).toBeInTheDocument();
      expect(screen.getByText('Skor Desirabilitas Sosial')).toBeInTheDocument();
      expect(screen.getByText('Kehilangan Fokus')).toBeInTheDocument();
      expect(screen.getByText('Status Validitas')).toBeInTheDocument();
    });

    // Check values
    expect(screen.getByText('85.0%')).toBeInTheDocument();
    expect(screen.getByText('3/10')).toBeInTheDocument();
    expect(screen.getByText('5.0 detik')).toBeInTheDocument();
  });

  it('shows flagged indicators with critical styling', async () => {
    mockGetCandidateReport.mockResolvedValue({
      success: true,
      data: {
        candidateId: 'c2',
        candidateName: 'Budi',
        sessionName: 'Batch 2024',
        completedAt: '2024-06-15T11:00:00Z',
        personality: { dimensions: [], facets: [], narratives: [] },
        sjt: { valueScores: [], behavioralExamples: [], elaborationScores: [] },
        composite: {
          suitabilityScore: 45,
          category: 'Conditionally Suitable' as const,
          confidence: 'Low Confidence' as const,
          personalitySubScore: 40,
          sjtSubScore: 48,
        },
        validity: {
          consistencyIndex: 45,
          averageResponseTimeMs: 2000,
          personalityAvgResponseTimeMs: 1200,
          sjtAvgResponseTimeMs: 5000,
          socialDesirabilityScore: 9,
          validityFlag: 'Invalid' as const,
          flaggedResponsePercentage: 35,
          focusLossCount: 8,
          hasValidityWarning: true,
          validityWarningMessage: 'Re-assessment disarankan karena terdapat 3+ flag inkonsistensi.',
        },
        recommendations: [],
      },
    });

    render(<AntiFakingIndicators candidateId="c2" />);

    await waitFor(() => {
      expect(screen.getByText('Budi')).toBeInTheDocument();
      // Validity flag translated
      expect(screen.getByText('Tidak Valid')).toBeInTheDocument();
      // Validity warning
      expect(screen.getByText(/Re-assessment disarankan/)).toBeInTheDocument();
    });

    // Critical badges should be present
    const criticalBadges = screen.getAllByText('✗ Kritis');
    expect(criticalBadges.length).toBeGreaterThan(0);
  });

  it('shows error when report fails to load', async () => {
    mockGetCandidateReport.mockResolvedValue({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Laporan tidak ditemukan' },
    });

    render(<AntiFakingIndicators candidateId="c-invalid" />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Laporan tidak ditemukan');
    });
  });
});
