import { KemenkeuValue } from '@assessment/shared';
import type { KemenkeuValueScore } from '@assessment/shared';
import { RadarChart, RadarChartDataPoint } from './RadarChart';

export interface KemenkeuValuesChartProps {
  valueScores: KemenkeuValueScore[];
}

const VALUE_LABELS: Record<KemenkeuValue, string> = {
  [KemenkeuValue.Integritas]: 'Integritas',
  [KemenkeuValue.Profesionalisme]: 'Profesionalisme',
  [KemenkeuValue.Sinergi]: 'Sinergi',
  [KemenkeuValue.Pelayanan]: 'Pelayanan',
  [KemenkeuValue.Kesempurnaan]: 'Kesempurnaan',
};

/**
 * Kemenkeu Values radar chart displaying per-value scores (0-100).
 * Used in the SJT results section of the assessment report.
 *
 * Requirements: 11.3
 */
export function KemenkeuValuesChart({ valueScores }: KemenkeuValuesChartProps) {
  const chartData: RadarChartDataPoint[] = valueScores.map((vs) => ({
    label: VALUE_LABELS[vs.value],
    value: vs.score,
    maxValue: 100,
  }));

  return (
    <section className="kemenkeu-values-chart" aria-labelledby="kemenkeu-values-title">
      <h2 id="kemenkeu-values-title">Hasil SJT — Nilai-Nilai Kemenkeu</h2>
      <div className="kemenkeu-values-chart__container">
        <RadarChart
          data={chartData}
          title="Radar Chart Nilai-Nilai Kemenkeu"
          size={320}
          fillColor="rgba(16, 185, 129, 0.3)"
          strokeColor="#10b981"
        />
      </div>
      <div className="kemenkeu-values-chart__scores" data-testid="kemenkeu-scores-list">
        {valueScores.map((vs) => (
          <div key={vs.value} className="kemenkeu-values-chart__score-item">
            <span className="kemenkeu-values-chart__value-name">
              {VALUE_LABELS[vs.value]}
            </span>
            <span className="kemenkeu-values-chart__value-score">
              {Math.round(vs.score)} / 100
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
