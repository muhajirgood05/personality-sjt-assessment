/**
 * Candidate progress table with status indicators.
 * Displays candidate progress updated within 30 seconds of status change.
 *
 * Validates: Requirement 12.3
 */

import { useState, useEffect, useCallback } from 'react';
import type { CandidateProgressDto } from '@assessment/shared';
import { AssessmentStatus } from '@assessment/shared';
import { getSessionCandidates } from '../../services/admin-api.js';

export interface CandidateProgressTableProps {
  sessionId: string;
  onViewAntiFaking?: (candidateId: string) => void;
  onViewReport?: (candidateId: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  [AssessmentStatus.NotStarted]: 'Belum Dimulai',
  [AssessmentStatus.InProgress]: 'Sedang Berlangsung',
  [AssessmentStatus.Completed]: 'Selesai',
  [AssessmentStatus.Interrupted]: 'Terputus',
  [AssessmentStatus.Expired]: 'Waktu Habis',
};

const STATUS_CLASSES: Record<string, string> = {
  [AssessmentStatus.NotStarted]: 'status-not-started',
  [AssessmentStatus.InProgress]: 'status-in-progress',
  [AssessmentStatus.Completed]: 'status-completed',
  [AssessmentStatus.Interrupted]: 'status-interrupted',
  [AssessmentStatus.Expired]: 'status-expired',
};

export function CandidateProgressTable({ sessionId, onViewAntiFaking, onViewReport }: CandidateProgressTableProps) {
  const [candidates, setCandidates] = useState<CandidateProgressDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const fetchCandidates = useCallback(async () => {
    try {
      const result = await getSessionCandidates(sessionId);
      if (result.success && result.data) {
        setCandidates(result.data.candidates);
      } else {
        setError(result.error?.message ?? 'Gagal memuat data kandidat');
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void fetchCandidates();
  }, [fetchCandidates]);

  // Auto-refresh every 30 seconds (Requirement 12.3)
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchCandidates();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchCandidates]);

  const filteredCandidates = candidates.filter((c) => {
    if (filter === 'all') return true;
    return c.overallStatus === filter;
  });

  const statusCounts = {
    all: candidates.length,
    [AssessmentStatus.NotStarted]: candidates.filter((c) => c.overallStatus === AssessmentStatus.NotStarted).length,
    [AssessmentStatus.InProgress]: candidates.filter((c) => c.overallStatus === AssessmentStatus.InProgress).length,
    [AssessmentStatus.Completed]: candidates.filter((c) => c.overallStatus === AssessmentStatus.Completed).length,
    [AssessmentStatus.Interrupted]: candidates.filter((c) => c.overallStatus === AssessmentStatus.Interrupted).length,
  };

  if (loading) {
    return <div className="loading-state" aria-label="Memuat data kandidat...">Memuat data kandidat...</div>;
  }

  if (error) {
    return (
      <div className="error-banner" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="candidate-progress">
      {/* Filter tabs */}
      <div className="filter-tabs" role="tablist" aria-label="Filter status kandidat">
        <button
          role="tab"
          aria-selected={filter === 'all'}
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Semua ({statusCounts.all})
        </button>
        <button
          role="tab"
          aria-selected={filter === AssessmentStatus.NotStarted}
          className={`filter-tab ${filter === AssessmentStatus.NotStarted ? 'active' : ''}`}
          onClick={() => setFilter(AssessmentStatus.NotStarted)}
        >
          Belum Dimulai ({statusCounts[AssessmentStatus.NotStarted]})
        </button>
        <button
          role="tab"
          aria-selected={filter === AssessmentStatus.InProgress}
          className={`filter-tab ${filter === AssessmentStatus.InProgress ? 'active' : ''}`}
          onClick={() => setFilter(AssessmentStatus.InProgress)}
        >
          Berlangsung ({statusCounts[AssessmentStatus.InProgress]})
        </button>
        <button
          role="tab"
          aria-selected={filter === AssessmentStatus.Completed}
          className={`filter-tab ${filter === AssessmentStatus.Completed ? 'active' : ''}`}
          onClick={() => setFilter(AssessmentStatus.Completed)}
        >
          Selesai ({statusCounts[AssessmentStatus.Completed]})
        </button>
        <button
          role="tab"
          aria-selected={filter === AssessmentStatus.Interrupted}
          className={`filter-tab ${filter === AssessmentStatus.Interrupted ? 'active' : ''}`}
          onClick={() => setFilter(AssessmentStatus.Interrupted)}
        >
          Terputus ({statusCounts[AssessmentStatus.Interrupted]})
        </button>
      </div>

      {/* Candidates table */}
      {filteredCandidates.length === 0 ? (
        <p className="empty-state">Tidak ada kandidat dengan status ini.</p>
      ) : (
        <table className="candidates-table" aria-label="Tabel progress kandidat">
          <thead>
            <tr>
              <th>Nama</th>
              <th>ID Pegawai</th>
              <th>Tes Kepribadian</th>
              <th>Tes SJT</th>
              <th>Status Keseluruhan</th>
              <th>Mulai</th>
              <th>Selesai</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredCandidates.map((candidate) => (
              <tr key={candidate.candidateId}>
                <td>{candidate.candidateName}</td>
                <td>{candidate.employeeId}</td>
                <td>
                  <span className={`status-indicator ${STATUS_CLASSES[candidate.personalityStatus] ?? ''}`}>
                    {STATUS_LABELS[candidate.personalityStatus] ?? candidate.personalityStatus}
                  </span>
                </td>
                <td>
                  <span className={`status-indicator ${STATUS_CLASSES[candidate.sjtStatus] ?? ''}`}>
                    {STATUS_LABELS[candidate.sjtStatus] ?? candidate.sjtStatus}
                  </span>
                </td>
                <td>
                  <span className={`status-indicator ${STATUS_CLASSES[candidate.overallStatus] ?? ''}`}>
                    {STATUS_LABELS[candidate.overallStatus] ?? candidate.overallStatus}
                  </span>
                </td>
                <td>
                  {candidate.startedAt
                    ? new Date(candidate.startedAt).toLocaleString('id-ID')
                    : '—'}
                </td>
                <td>
                  {candidate.completedAt
                    ? new Date(candidate.completedAt).toLocaleString('id-ID')
                    : '—'}
                </td>
                <td>
                  {candidate.overallStatus === AssessmentStatus.Completed && onViewReport && (
                    <button
                      onClick={() => onViewReport(candidate.candidateId)}
                      className="btn-link"
                      aria-label={`Lihat laporan ${candidate.candidateName}`}
                    >
                      Laporan
                    </button>
                  )}
                  {candidate.overallStatus === AssessmentStatus.Completed && onViewAntiFaking && (
                    <button
                      onClick={() => onViewAntiFaking(candidate.candidateId)}
                      className="btn-link"
                      aria-label={`Lihat indikator anti-faking ${candidate.candidateName}`}
                    >
                      Anti-Faking
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default CandidateProgressTable;
