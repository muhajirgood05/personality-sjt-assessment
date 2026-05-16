import type { CandidateReportResponse } from '@assessment/shared';
import { PersonalityProfile } from './PersonalityProfile';
import { KemenkeuValuesChart } from './KemenkeuValuesChart';
import { BehavioralExamples } from './BehavioralExamples';
import { AssessmentValidity } from './AssessmentValidity';
import { ImprovementRecommendations } from './ImprovementRecommendations';

export interface CandidateReportProps {
  report: CandidateReportResponse;
  /** Chart display mode for personality profile */
  personalityChartType?: 'radar' | 'bar';
}

/**
 * Complete candidate assessment report view.
 * Composes all report sections: personality profile, SJT results,
 * assessment validity, and improvement recommendations.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
export function CandidateReport({
  report,
  personalityChartType = 'radar',
}: CandidateReportProps) {
  return (
    <article className="candidate-report" data-testid="candidate-report">
      <header className="candidate-report__header">
        <h1>Laporan Asesmen</h1>
        <div className="candidate-report__meta">
          <p><strong>Nama:</strong> {report.candidateName}</p>
          <p><strong>Sesi:</strong> {report.sessionName}</p>
          <p><strong>Tanggal Selesai:</strong> {formatDate(report.completedAt)}</p>
        </div>
        <div className="candidate-report__composite" data-testid="composite-summary">
          <div className="candidate-report__suitability">
            <span className="candidate-report__suitability-label">Skor Kesesuaian</span>
            <span className="candidate-report__suitability-score">
              {Math.round(report.composite.suitabilityScore)}
            </span>
            <span className="candidate-report__suitability-category">
              {report.composite.category}
            </span>
          </div>
          <div className="candidate-report__confidence">
            <span className="candidate-report__confidence-label">Tingkat Kepercayaan</span>
            <span className="candidate-report__confidence-value">
              {report.composite.confidence}
            </span>
          </div>
        </div>
      </header>

      <PersonalityProfile
        profile={report.personality}
        chartType={personalityChartType}
      />

      <KemenkeuValuesChart valueScores={report.sjt.valueScores} />

      <BehavioralExamples examples={report.sjt.behavioralExamples} />

      <AssessmentValidity validity={report.validity} />

      <ImprovementRecommendations recommendations={report.recommendations} />
    </article>
  );
}

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}
