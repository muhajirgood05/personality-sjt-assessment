/**
 * Admin Dashboard - Main overview page.
 * Shows active assessments count, candidate completion summary, and aggregate statistics.
 *
 * Validates: Requirement 12.1
 */

import { useState, useEffect, useCallback } from 'react';
import type { SessionSummaryDto } from '@assessment/shared';
import { listSessions } from '../../services/admin-api.js';
import { SessionCreationForm } from './SessionCreationForm.js';
import { CandidateProgressTable } from './CandidateProgressTable.js';
import { AnalyticsView } from './AnalyticsView.js';
import { AntiFakingIndicators } from './AntiFakingIndicators.js';
import './admin.css';

export type AdminView = 'overview' | 'create-session' | 'candidates' | 'analytics' | 'anti-faking';

export interface AdminDashboardProps {
  onViewReport?: (candidateId: string) => void;
}

export function AdminDashboard({ onViewReport }: AdminDashboardProps) {
  const [sessions, setSessions] = useState<SessionSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AdminView>('overview');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listSessions();
      if (result.success && result.data) {
        setSessions(result.data.sessions);
      } else {
        setError(result.error?.message ?? 'Gagal memuat data sesi');
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  // Auto-refresh sessions every 30 seconds (Requirement 12.3)
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchSessions();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const activeSessions = sessions.filter((s) => s.status === 'active');
  const totalCandidates = sessions.reduce((sum, s) => sum + s.totalCandidates, 0);
  const totalCompleted = sessions.reduce((sum, s) => sum + s.completedCount, 0);
  const totalInProgress = sessions.reduce((sum, s) => sum + s.inProgressCount, 0);
  const totalNotStarted = sessions.reduce((sum, s) => sum + s.notStartedCount, 0);
  const completionPercentage = totalCandidates > 0
    ? Math.round((totalCompleted / totalCandidates) * 100)
    : 0;

  const handleViewCandidates = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setCurrentView('candidates');
  };

  const handleViewAnalytics = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setCurrentView('analytics');
  };

  const handleViewAntiFaking = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setCurrentView('anti-faking');
  };

  const handleSessionCreated = () => {
    setCurrentView('overview');
    void fetchSessions();
  };

  const handleBack = () => {
    setCurrentView('overview');
    setSelectedSessionId(null);
    setSelectedCandidateId(null);
  };

  if (currentView === 'create-session') {
    return (
      <div className="admin-dashboard">
        <header className="admin-header">
          <h1>Buat Sesi Assessment Baru</h1>
          <button onClick={handleBack} className="btn-secondary">
            ← Kembali ke Dashboard
          </button>
        </header>
        <SessionCreationForm onSuccess={handleSessionCreated} onCancel={handleBack} />
      </div>
    );
  }

  if (currentView === 'candidates' && selectedSessionId) {
    return (
      <div className="admin-dashboard">
        <header className="admin-header">
          <h1>Progress Kandidat</h1>
          <button onClick={handleBack} className="btn-secondary">
            ← Kembali ke Dashboard
          </button>
        </header>
        <CandidateProgressTable
          sessionId={selectedSessionId}
          onViewAntiFaking={handleViewAntiFaking}
          onViewReport={onViewReport}
        />
      </div>
    );
  }

  if (currentView === 'analytics' && selectedSessionId) {
    return (
      <div className="admin-dashboard">
        <header className="admin-header">
          <h1>Analitik Sesi</h1>
          <button onClick={handleBack} className="btn-secondary">
            ← Kembali ke Dashboard
          </button>
        </header>
        <AnalyticsView sessionId={selectedSessionId} />
      </div>
    );
  }

  if (currentView === 'anti-faking' && selectedCandidateId) {
    return (
      <div className="admin-dashboard">
        <header className="admin-header">
          <h1>Indikator Anti-Faking</h1>
          <button onClick={handleBack} className="btn-secondary">
            ← Kembali ke Dashboard
          </button>
        </header>
        <AntiFakingIndicators candidateId={selectedCandidateId} />
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Dashboard Administrator</h1>
        <button
          onClick={() => setCurrentView('create-session')}
          className="btn-primary"
        >
          + Buat Sesi Baru
        </button>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {loading && sessions.length === 0 ? (
        <div className="loading-state" aria-label="Memuat data...">
          Memuat data...
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <section className="stats-grid" aria-label="Ringkasan statistik">
            <div className="stat-card">
              <span className="stat-value">{activeSessions.length}</span>
              <span className="stat-label">Sesi Aktif</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{totalCandidates}</span>
              <span className="stat-label">Total Kandidat</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{totalCompleted}</span>
              <span className="stat-label">Selesai</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{totalInProgress}</span>
              <span className="stat-label">Sedang Berlangsung</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{totalNotStarted}</span>
              <span className="stat-label">Belum Dimulai</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{completionPercentage}%</span>
              <span className="stat-label">Tingkat Penyelesaian</span>
            </div>
          </section>

          {/* Sessions Table */}
          <section className="sessions-section" aria-label="Daftar sesi assessment">
            <h2>Sesi Assessment</h2>
            {sessions.length === 0 ? (
              <p className="empty-state">Belum ada sesi assessment. Buat sesi baru untuk memulai.</p>
            ) : (
              <table className="sessions-table" aria-label="Tabel sesi assessment">
                <thead>
                  <tr>
                    <th>Nama Sesi</th>
                    <th>Status</th>
                    <th>Tanggal Mulai</th>
                    <th>Tanggal Selesai</th>
                    <th>Kandidat</th>
                    <th>Progress</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const sessionCompletion = session.totalCandidates > 0
                      ? Math.round((session.completedCount / session.totalCandidates) * 100)
                      : 0;
                    return (
                      <tr key={session.id}>
                        <td>{session.name}</td>
                        <td>
                          <span className={`status-badge status-${session.status}`}>
                            {session.status === 'active' ? 'Aktif' : session.status}
                          </span>
                        </td>
                        <td>{new Date(session.startDate).toLocaleDateString('id-ID')}</td>
                        <td>{new Date(session.endDate).toLocaleDateString('id-ID')}</td>
                        <td>{session.totalCandidates}</td>
                        <td>
                          <div className="progress-bar-container">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${sessionCompletion}%` }}
                              aria-valuenow={sessionCompletion}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              role="progressbar"
                            />
                            <span className="progress-text">{sessionCompletion}%</span>
                          </div>
                        </td>
                        <td className="actions-cell">
                          <button
                            onClick={() => handleViewCandidates(session.id)}
                            className="btn-link"
                            aria-label={`Lihat kandidat sesi ${session.name}`}
                          >
                            Kandidat
                          </button>
                          <button
                            onClick={() => handleViewAnalytics(session.id)}
                            className="btn-link"
                            aria-label={`Lihat analitik sesi ${session.name}`}
                          >
                            Analitik
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
