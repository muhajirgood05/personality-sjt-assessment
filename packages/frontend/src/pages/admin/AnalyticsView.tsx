/**
 * Analytics view for a session.
 * Displays distribution charts for Suitability Scores, OCEAN dimensions,
 * and Kemenkeu Values alignment across all candidates in a session.
 *
 * Validates: Requirement 12.4
 */

import { useState, useEffect, useCallback } from 'react';
import type { SessionAnalyticsResponse } from '@assessment/shared';
import { getSessionAnalytics } from '../../services/admin-api.js';

export interface AnalyticsViewProps {
  sessionId: string;
}

export function AnalyticsView({ sessionId }: AnalyticsViewProps) {
  const [analytics, setAnalytics] = useState<SessionAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSessionAnalytics(sessionId);
      if (result.success && result.data) {
        setAnalytics(result.data);
      } else {
        setError(result.error?.message ?? 'Gagal memuat data analitik');
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return <div className="loading-state" aria-label="Memuat analitik...">Memuat analitik...</div>;
  }

  if (error) {
    return (
      <div className="error-banner" role="alert">
        {error}
      </div>
    );
  }

  if (!analytics) {
    return <p className="empty-state">Data analitik tidak tersedia.</p>;
  }

  return (
    <div className="analytics-view" aria-label="Analitik sesi">
      {/* Summary stats */}
      <section className="analytics-summary">
        <div className="stat-card">
          <span className="stat-value">{analytics.totalCandidates}</span>
          <span className="stat-label">Total Kandidat</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{analytics.completionPercentage}%</span>
          <span className="stat-label">Tingkat Penyelesaian</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {analytics.averageSuitabilityScore !== null
              ? analytics.averageSuitabilityScore.toFixed(1)
              : '—'}
          </span>
          <span className="stat-label">Rata-rata Skor Kesesuaian</span>
        </div>
      </section>

      {/* Suitability Score Distribution */}
      <section className="analytics-section" aria-label="Distribusi skor kesesuaian">
        <h3>Distribusi Skor Kesesuaian</h3>
        {analytics.suitabilityDistribution.length > 0 ? (
          <div className="distribution-chart">
            {analytics.suitabilityDistribution.map((bucket) => (
              <div key={bucket.label} className="distribution-bar">
                <span className="distribution-label">{bucket.label}</span>
                <div className="distribution-bar-container">
                  <div
                    className="distribution-bar-fill"
                    style={{
                      width: `${analytics.totalCandidates > 0 ? (bucket.count / analytics.totalCandidates) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="distribution-count">{bucket.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">Belum ada data distribusi.</p>
        )}
      </section>

      {/* OCEAN Dimension Distribution */}
      <section className="analytics-section" aria-label="Distribusi dimensi OCEAN">
        <h3>Distribusi Dimensi OCEAN</h3>
        {analytics.oceanDistribution.length > 0 ? (
          <div className="dimension-distributions">
            {analytics.oceanDistribution.map((dim) => (
              <div key={dim.dimension} className="dimension-card">
                <h4>{formatDimensionName(dim.dimension)}</h4>
                <p className="dimension-stats">
                  Rata-rata: {dim.mean.toFixed(1)} | Std Dev: {dim.stdDev.toFixed(2)}
                </p>
                <div className="distribution-chart distribution-chart--small">
                  {dim.buckets.map((bucket) => (
                    <div key={bucket.label} className="distribution-bar">
                      <span className="distribution-label">{bucket.label}</span>
                      <div className="distribution-bar-container">
                        <div
                          className="distribution-bar-fill"
                          style={{
                            width: `${analytics.totalCandidates > 0 ? (bucket.count / analytics.totalCandidates) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="distribution-count">{bucket.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">Belum ada data distribusi OCEAN.</p>
        )}
      </section>

      {/* Kemenkeu Values Distribution */}
      <section className="analytics-section" aria-label="Distribusi nilai Kemenkeu">
        <h3>Distribusi Nilai Kemenkeu</h3>
        {analytics.valueDistribution.length > 0 ? (
          <div className="dimension-distributions">
            {analytics.valueDistribution.map((val) => (
              <div key={val.value} className="dimension-card">
                <h4>{val.value}</h4>
                <p className="dimension-stats">
                  Rata-rata: {val.mean.toFixed(1)} | Std Dev: {val.stdDev.toFixed(2)}
                </p>
                <div className="distribution-chart distribution-chart--small">
                  {val.buckets.map((bucket) => (
                    <div key={bucket.label} className="distribution-bar">
                      <span className="distribution-label">{bucket.label}</span>
                      <div className="distribution-bar-container">
                        <div
                          className="distribution-bar-fill"
                          style={{
                            width: `${analytics.totalCandidates > 0 ? (bucket.count / analytics.totalCandidates) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="distribution-count">{bucket.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">Belum ada data distribusi nilai.</p>
        )}
      </section>
    </div>
  );
}

function formatDimensionName(dimension: string): string {
  const names: Record<string, string> = {
    openness: 'Openness (Keterbukaan)',
    conscientiousness: 'Conscientiousness (Kesadaran)',
    extraversion: 'Extraversion (Ekstraversi)',
    agreeableness: 'Agreeableness (Keramahan)',
    neuroticism: 'Neuroticism (Neurotisisme)',
  };
  return names[dimension] ?? dimension;
}

export default AnalyticsView;
