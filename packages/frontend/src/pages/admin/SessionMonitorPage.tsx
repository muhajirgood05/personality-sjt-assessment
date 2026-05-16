/**
 * Session Monitor page.
 * Shows real-time candidate progress for a specific assessment session.
 * Provides navigation to individual candidate reports and session export.
 *
 * Validates: Requirements 12.3, 12.5
 */

import { useState, useEffect, useCallback } from 'react';
import type { CandidateProgressDto } from '@assessment/shared';
import { getSessionCandidates, exportSessionResults } from '../../services/admin-api.js';

export interface SessionMonitorPageProps {
  sessionId: string;
  onViewReport?: (candidateId: string) => void;
  onBack?: () => void;
}

export function SessionMonitorPage({
  sessionId,
  onViewReport,
  onBack,
}: SessionMonitorPageProps) {
  const [candidates, setCandidates] = useState<CandidateProgressDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    try {
      setError(null);
      const response = await getSessionCandidates(sessionId);

      if (response.success && response.data) {
        setCandidates(response.data.candidates);
      } else {
        setError(response.error?.message ?? 'Gagal memuat data kandidat');
      }
    } catch {
      setError('Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchCandidates();

    // Poll every 30 seconds for real-time progress updates (Requirement 12.3)
    const interval = setInterval(fetchCandidates, 30000);
    return () => clearInterval(interval);
  }, [fetchCandidates]);

  const handleExport = async (format: 'csv' | 'excel') => {
    setExporting(true);
    setExportError(null);

    try {
      const blob = await exportSessionResults(sessionId, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `session_${sessionId}_results.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Gagal mengekspor data');
    } finally {
      setExporting(false);
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'Selesai';
      case 'in_progress':
        return 'Berlangsung';
      case 'interrupted':
        return 'Terputus';
      case 'expired':
        return 'Kedaluwarsa';
      default:
        return 'Belum Mulai';
    }
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'status--completed';
      case 'in_progress':
        return 'status--in-progress';
      case 'interrupted':
        return 'status--interrupted';
      case 'expired':
        return 'status--expired';
      default:
        return 'status--not-started';
    }
  };

  // Summary counts
  const completedCount = candidates.filter((c) => c.overallStatus === 'completed').length;
  const inProgressCount = candidates.filter((c) => c.overallStatus === 'in_progress').length;
  const notStartedCount = candidates.filter(
    (c) => c.overallStatus === 'not_started'
  ).length;

  if (loading) {
    return (
      <div className="session-monitor" data-testid="session-monitor">
        <p>Memuat data kandidat...</p>
      </div>
    );
  }

  return (
    <div className="session-monitor" data-testid="session-monitor">
      <header className="session-monitor__header">
        <button className="btn-back" onClick={onBack} data-testid="back-btn">
          ← Kembali
        </button>
        <h1>Monitor Sesi</h1>
        <div className="session-monitor__actions">
          <button
            className="btn-secondary"
            onClick={() => handleExport('csv')}
            disabled={exporting}
            data-testid="export-csv-btn"
          >
            {exporting ? 'Mengekspor...' : 'Ekspor CSV'}
          </button>
          <button
            className="btn-secondary"
            onClick={() => handleExport('excel')}
            disabled={exporting}
            data-testid="export-excel-btn"
          >
            Ekspor Excel
          </button>
        </div>
      </header>

      {exportError && (
        <div className="session-monitor__export-error" role="alert">
          <p>{exportError}</p>
        </div>
      )}

      {error && (
        <div className="session-monitor__error" role="alert">
          <p>{error}</p>
          <button onClick={fetchCandidates}>Coba Lagi</button>
        </div>
      )}

      <section className="session-monitor__summary" data-testid="progress-summary">
        <div className="summary-card summary-card--completed">
          <span className="summary-card__value">{completedCount}</span>
          <span className="summary-card__label">Selesai</span>
        </div>
        <div className="summary-card summary-card--in-progress">
          <span className="summary-card__value">{inProgressCount}</span>
          <span className="summary-card__label">Berlangsung</span>
        </div>
        <div className="summary-card summary-card--not-started">
          <span className="summary-card__value">{notStartedCount}</span>
          <span className="summary-card__label">Belum Mulai</span>
        </div>
        <div className="summary-card summary-card--total">
          <span className="summary-card__value">{candidates.length}</span>
          <span className="summary-card__label">Total</span>
        </div>
      </section>

      <section className="session-monitor__candidates">
        <h2>Daftar Kandidat</h2>
        {candidates.length === 0 ? (
          <p>Tidak ada kandidat dalam sesi ini.</p>
        ) : (
          <table className="session-monitor__table" data-testid="candidates-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>ID Pegawai</th>
                <th>Personality</th>
                <th>SJT</th>
                <th>Status Keseluruhan</th>
                <th>Mulai</th>
                <th>Selesai</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.candidateId} data-testid={`candidate-row-${candidate.candidateId}`}>
                  <td>{candidate.candidateName}</td>
                  <td>{candidate.employeeId}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(candidate.personalityStatus)}`}>
                      {getStatusLabel(candidate.personalityStatus)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(candidate.sjtStatus)}`}>
                      {getStatusLabel(candidate.sjtStatus)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(candidate.overallStatus)}`}>
                      {getStatusLabel(candidate.overallStatus)}
                    </span>
                  </td>
                  <td>{candidate.startedAt ? formatDateTime(candidate.startedAt) : '-'}</td>
                  <td>{candidate.completedAt ? formatDateTime(candidate.completedAt) : '-'}</td>
                  <td>
                    {candidate.overallStatus === 'completed' && (
                      <button
                        className="btn-link"
                        onClick={() => onViewReport?.(candidate.candidateId)}
                        data-testid={`view-report-${candidate.candidateId}`}
                      >
                        Lihat Laporan
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function formatDateTime(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
}

export default SessionMonitorPage;
