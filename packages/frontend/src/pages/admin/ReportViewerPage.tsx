/**
 * Report Viewer page.
 * Displays a candidate's full assessment report with PDF download option.
 *
 * Validates: Requirements 11.6, 12.6
 */

import { useState, useEffect, useCallback } from 'react';
import type { CandidateReportResponse } from '@assessment/shared';
import { getCandidateReport, downloadReportPdf } from '../../services/admin-api.js';
import { CandidateReport } from '../../components/report/CandidateReport.js';

export interface ReportViewerPageProps {
  candidateId: string;
  onBack?: () => void;
}

export function ReportViewerPage({ candidateId, onBack }: ReportViewerPageProps) {
  const [report, setReport] = useState<CandidateReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCandidateReport(candidateId);

      if (response.success && response.data) {
        setReport(response.data);
      } else {
        setError(response.error?.message ?? 'Gagal memuat laporan');
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setDownloadError(null);

    try {
      const blob = await downloadReportPdf(candidateId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `laporan-asesmen-${candidateId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Gagal mengunduh PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="report-viewer" data-testid="report-viewer">
        <p>Memuat laporan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-viewer" data-testid="report-viewer">
        <header className="report-viewer__header">
          <button className="btn-back" onClick={onBack} data-testid="back-btn">
            ← Kembali
          </button>
        </header>
        <div className="report-viewer__error" role="alert">
          <p>{error}</p>
          <button onClick={fetchReport}>Coba Lagi</button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="report-viewer" data-testid="report-viewer">
        <header className="report-viewer__header">
          <button className="btn-back" onClick={onBack} data-testid="back-btn">
            ← Kembali
          </button>
        </header>
        <p>Laporan tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="report-viewer" data-testid="report-viewer">
      <header className="report-viewer__header">
        <button className="btn-back" onClick={onBack} data-testid="back-btn">
          ← Kembali
        </button>
        <h1>Laporan Asesmen</h1>
        <button
          className="btn-primary"
          onClick={handleDownloadPdf}
          disabled={downloading}
          data-testid="download-pdf-btn"
        >
          {downloading ? 'Mengunduh...' : 'Unduh PDF'}
        </button>
      </header>

      {downloadError && (
        <div className="report-viewer__download-error" role="alert">
          <p>{downloadError}</p>
        </div>
      )}

      <div className="report-viewer__content">
        <CandidateReport report={report} />
      </div>
    </div>
  );
}

export default ReportViewerPage;
