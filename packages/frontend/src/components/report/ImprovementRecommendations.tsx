import { KemenkeuValue } from '@assessment/shared';
import type { ImprovementRecommendation } from '@assessment/shared';

export interface ImprovementRecommendationsProps {
  recommendations: ImprovementRecommendation[];
}

const VALUE_LABELS: Record<KemenkeuValue, string> = {
  [KemenkeuValue.Integritas]: 'Integritas',
  [KemenkeuValue.Profesionalisme]: 'Profesionalisme',
  [KemenkeuValue.Sinergi]: 'Sinergi',
  [KemenkeuValue.Pelayanan]: 'Pelayanan',
  [KemenkeuValue.Kesempurnaan]: 'Kesempurnaan',
};

/**
 * Improvement recommendations section for below-threshold Kemenkeu values.
 * Each recommendation includes the target value, current score, and a development suggestion.
 *
 * Requirements: 11.5
 */
export function ImprovementRecommendations({
  recommendations,
}: ImprovementRecommendationsProps) {
  if (recommendations.length === 0) {
    return (
      <section
        className="improvement-recommendations"
        aria-labelledby="recommendations-title"
      >
        <h2 id="recommendations-title">Rekomendasi Pengembangan</h2>
        <p className="improvement-recommendations__none" data-testid="no-recommendations">
          Semua nilai berada di atas ambang batas. Tidak ada rekomendasi pengembangan khusus.
        </p>
      </section>
    );
  }

  return (
    <section
      className="improvement-recommendations"
      aria-labelledby="recommendations-title"
    >
      <h2 id="recommendations-title">Rekomendasi Pengembangan</h2>
      <div
        className="improvement-recommendations__list"
        data-testid="recommendations-list"
      >
        {recommendations.map((rec) => (
          <div
            key={rec.value}
            className="improvement-recommendations__item"
            data-testid={`recommendation-${rec.value}`}
          >
            <div className="improvement-recommendations__header">
              <h3 className="improvement-recommendations__value-name">
                {VALUE_LABELS[rec.value]}
              </h3>
              <span className="improvement-recommendations__current-score">
                Skor saat ini: {Math.round(rec.currentScore)} / 100
              </span>
            </div>
            <p className="improvement-recommendations__suggestion">
              {rec.suggestion}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
