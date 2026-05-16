import type { AssessmentValidityDto } from '@assessment/shared';

export interface AssessmentValidityProps {
  validity: AssessmentValidityDto;
}

/**
 * Assessment Validity section of the report.
 * Displays consistency index, response time metrics, social desirability score,
 * and overall validity flag.
 *
 * Requirements: 11.4
 */
export function AssessmentValidity({ validity }: AssessmentValidityProps) {
  const flagClass = getValidityFlagClass(validity.validityFlag);

  return (
    <section className="assessment-validity" aria-labelledby="assessment-validity-title">
      <h2 id="assessment-validity-title">Validitas Asesmen</h2>

      <div className="assessment-validity__flag" data-testid="validity-flag">
        <span className={`assessment-validity__flag-badge ${flagClass}`}>
          {validity.validityFlag}
        </span>
      </div>

      <div className="assessment-validity__metrics" data-testid="validity-metrics">
        <div className="assessment-validity__metric">
          <span className="assessment-validity__metric-label">Indeks Konsistensi</span>
          <span className="assessment-validity__metric-value">
            {validity.consistencyIndex.toFixed(1)}%
          </span>
        </div>

        <div className="assessment-validity__metric">
          <span className="assessment-validity__metric-label">
            Rata-rata Waktu Respons (Keseluruhan)
          </span>
          <span className="assessment-validity__metric-value">
            {formatResponseTime(validity.averageResponseTimeMs)}
          </span>
        </div>

        <div className="assessment-validity__metric">
          <span className="assessment-validity__metric-label">
            Rata-rata Waktu Respons (Kepribadian)
          </span>
          <span className="assessment-validity__metric-value">
            {formatResponseTime(validity.personalityAvgResponseTimeMs)}
          </span>
        </div>

        <div className="assessment-validity__metric">
          <span className="assessment-validity__metric-label">
            Rata-rata Waktu Respons (SJT)
          </span>
          <span className="assessment-validity__metric-value">
            {formatResponseTime(validity.sjtAvgResponseTimeMs)}
          </span>
        </div>

        <div className="assessment-validity__metric">
          <span className="assessment-validity__metric-label">
            Skor Desirabilitas Sosial
          </span>
          <span className="assessment-validity__metric-value">
            {validity.socialDesirabilityScore} / 10
          </span>
        </div>

        <div className="assessment-validity__metric">
          <span className="assessment-validity__metric-label">
            Respons Ditandai (Terlalu Cepat)
          </span>
          <span className="assessment-validity__metric-value">
            {validity.flaggedResponsePercentage.toFixed(1)}%
          </span>
        </div>

        <div className="assessment-validity__metric">
          <span className="assessment-validity__metric-label">
            Kehilangan Fokus
          </span>
          <span className="assessment-validity__metric-value">
            {validity.focusLossCount} kali
          </span>
        </div>
      </div>

      {validity.hasValidityWarning && validity.validityWarningMessage && (
        <div
          className="assessment-validity__warning"
          role="alert"
          data-testid="validity-warning"
        >
          <strong>⚠️ Peringatan Validitas:</strong> {validity.validityWarningMessage}
        </div>
      )}
    </section>
  );
}

function getValidityFlagClass(flag: string): string {
  switch (flag) {
    case 'Valid':
      return 'assessment-validity__flag-badge--valid';
    case 'Cautionary':
      return 'assessment-validity__flag-badge--cautionary';
    case 'Invalid':
      return 'assessment-validity__flag-badge--invalid';
    default:
      return '';
  }
}

function formatResponseTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }
  return `${(ms / 1000).toFixed(1)} detik`;
}
