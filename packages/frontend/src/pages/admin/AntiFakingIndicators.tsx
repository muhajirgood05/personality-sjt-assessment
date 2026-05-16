/**
 * Anti-faking indicators display with descriptions.
 * Shows all anti-faking indicators for a candidate with explanations
 * of what each indicator measures and the candidate's flagged status.
 *
 * Validates: Requirement 12.6
 */

import { useState, useEffect, useCallback } from 'react';
import type { CandidateReportResponse } from '@assessment/shared';
import { getCandidateReport } from '../../services/admin-api.js';

export interface AntiFakingIndicatorsProps {
  candidateId: string;
}

interface IndicatorInfo {
  name: string;
  description: string;
  value: string | number;
  status: 'normal' | 'warning' | 'critical';
  threshold: string;
}

export function AntiFakingIndicators({ candidateId }: AntiFakingIndicatorsProps) {
  const [report, setReport] = useState<CandidateReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCandidateReport(candidateId);
      if (result.success && result.data) {
        setReport(result.data);
      } else {
        setError(result.error?.message ?? 'Gagal memuat data indikator');
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  if (loading) {
    return <div className="loading-state" aria-label="Memuat indikator...">Memuat indikator...</div>;
  }

  if (error) {
    return (
      <div className="error-banner" role="alert">
        {error}
      </div>
    );
  }

  if (!report) {
    return <p className="empty-state">Data indikator tidak tersedia.</p>;
  }

  const { validity } = report;

  const indicators: IndicatorInfo[] = [
    {
      name: 'Indeks Konsistensi',
      description:
        'Mengukur konsistensi jawaban pada pasangan item yang serupa. Skor rendah menunjukkan pola jawaban yang tidak konsisten.',
      value: `${validity.consistencyIndex.toFixed(1)}%`,
      status: validity.consistencyIndex >= 80 ? 'normal' : validity.consistencyIndex >= 60 ? 'warning' : 'critical',
      threshold: 'Normal: ≥80% | Peringatan: 60-79% | Kritis: <60%',
    },
    {
      name: 'Waktu Respons Rata-rata',
      description:
        'Rata-rata waktu yang dihabiskan untuk menjawab setiap item. Waktu terlalu cepat dapat mengindikasikan jawaban asal.',
      value: `${(validity.averageResponseTimeMs / 1000).toFixed(1)} detik`,
      status: validity.averageResponseTimeMs >= 3000 ? 'normal' : validity.averageResponseTimeMs >= 1500 ? 'warning' : 'critical',
      threshold: 'Normal: ≥3 detik | Peringatan: 1.5-3 detik | Kritis: <1.5 detik',
    },
    {
      name: 'Persentase Respons Cepat',
      description:
        'Persentase jawaban yang diberikan di bawah batas waktu minimum. Lebih dari 20% menunjukkan kemungkinan faking.',
      value: `${validity.flaggedResponsePercentage.toFixed(1)}%`,
      status: validity.flaggedResponsePercentage <= 10 ? 'normal' : validity.flaggedResponsePercentage <= 20 ? 'warning' : 'critical',
      threshold: 'Normal: ≤10% | Peringatan: 10-20% | Kritis: >20%',
    },
    {
      name: 'Skor Desirabilitas Sosial',
      description:
        'Mengukur kecenderungan memilih jawaban yang dianggap baik secara sosial. Skor tinggi menunjukkan impression management.',
      value: `${validity.socialDesirabilityScore}/10`,
      status: validity.socialDesirabilityScore <= 5 ? 'normal' : validity.socialDesirabilityScore <= 7 ? 'warning' : 'critical',
      threshold: 'Normal: ≤5 | Peringatan: 6-7 | Kritis: >7 (persentil ke-90)',
    },
    {
      name: 'Kehilangan Fokus',
      description:
        'Jumlah kali kandidat berpindah tab atau jendela selama asesmen. Dapat mengindikasikan pencarian jawaban.',
      value: validity.focusLossCount,
      status: validity.focusLossCount === 0 ? 'normal' : validity.focusLossCount <= 3 ? 'warning' : 'critical',
      threshold: 'Normal: 0 | Peringatan: 1-3 | Kritis: >3',
    },
    {
      name: 'Status Validitas',
      description:
        'Penilaian keseluruhan validitas asesmen berdasarkan semua indikator anti-faking.',
      value: formatValidityFlag(validity.validityFlag),
      status: validity.validityFlag === 'Valid' ? 'normal' : validity.validityFlag === 'Cautionary' ? 'warning' : 'critical',
      threshold: 'Valid | Perlu Perhatian | Tidak Valid',
    },
  ];

  return (
    <div className="anti-faking-indicators" aria-label="Indikator anti-faking">
      <div className="candidate-info">
        <h3>{report.candidateName}</h3>
        <p>Sesi: {report.sessionName}</p>
      </div>

      {validity.hasValidityWarning && validity.validityWarningMessage && (
        <div className="validity-warning" role="alert">
          <strong>⚠️ Peringatan Validitas:</strong> {validity.validityWarningMessage}
        </div>
      )}

      <div className="indicators-grid">
        {indicators.map((indicator) => (
          <div
            key={indicator.name}
            className={`indicator-card indicator-card--${indicator.status}`}
          >
            <div className="indicator-header">
              <h4>{indicator.name}</h4>
              <span className={`indicator-badge indicator-badge--${indicator.status}`}>
                {indicator.status === 'normal' ? '✓ Normal' : indicator.status === 'warning' ? '⚠ Peringatan' : '✗ Kritis'}
              </span>
            </div>
            <p className="indicator-description">{indicator.description}</p>
            <div className="indicator-value">
              <span className="indicator-value-number">{indicator.value}</span>
            </div>
            <p className="indicator-threshold">{indicator.threshold}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatValidityFlag(flag: string): string {
  switch (flag) {
    case 'Valid':
      return 'Valid';
    case 'Cautionary':
      return 'Perlu Perhatian';
    case 'Invalid':
      return 'Tidak Valid';
    default:
      return flag;
  }
}

export default AntiFakingIndicators;
