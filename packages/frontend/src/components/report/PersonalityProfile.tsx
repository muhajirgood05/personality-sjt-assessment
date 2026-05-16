import { OceanDimension } from '@assessment/shared';
import type { PersonalityProfileDto } from '@assessment/shared';
import { RadarChart, RadarChartDataPoint } from './RadarChart';
import { BarChart, BarChartDataPoint } from './BarChart';
import { FacetBreakdown } from './FacetBreakdown';
import { NarrativeInterpretation } from './NarrativeInterpretation';

export interface PersonalityProfileProps {
  profile: PersonalityProfileDto;
  /** Display mode: 'radar' shows radar chart, 'bar' shows bar chart */
  chartType?: 'radar' | 'bar';
}

const DIMENSION_LABELS: Record<OceanDimension, string> = {
  [OceanDimension.Openness]: 'Openness',
  [OceanDimension.Conscientiousness]: 'Conscientiousness',
  [OceanDimension.Extraversion]: 'Extraversion',
  [OceanDimension.Agreeableness]: 'Agreeableness',
  [OceanDimension.Neuroticism]: 'Neuroticism',
};

/**
 * Personality profile section of the assessment report.
 * Displays OCEAN dimension scores as radar or bar chart,
 * facet breakdowns per dimension, and narrative interpretations.
 *
 * Requirements: 11.1, 11.2
 */
export function PersonalityProfile({
  profile,
  chartType = 'radar',
}: PersonalityProfileProps) {
  // Convert sten scores (1-10) to 0-100 scale for chart display
  const chartData: RadarChartDataPoint[] | BarChartDataPoint[] = profile.dimensions.map((dim) => ({
    label: DIMENSION_LABELS[dim.dimension],
    value: dim.stenScore * 10, // sten 1-10 → 0-100 display
    maxValue: 100,
  }));

  return (
    <section className="personality-profile" aria-labelledby="personality-profile-title">
      <h2 id="personality-profile-title">Profil Kepribadian (OCEAN)</h2>

      <div className="personality-profile__chart">
        {chartType === 'radar' ? (
          <RadarChart
            data={chartData}
            title="Profil Kepribadian OCEAN"
            size={320}
          />
        ) : (
          <BarChart
            data={chartData}
            title="Profil Kepribadian OCEAN"
            width={450}
          />
        )}
      </div>

      <div className="personality-profile__dimensions">
        {profile.dimensions.map((dim) => {
          const dimensionFacets = profile.facets.filter(
            (f) => f.dimension === dim.dimension
          );
          const narrative = profile.narratives.find(
            (n) => n.dimension === dim.dimension
          );

          return (
            <div
              key={dim.dimension}
              className="personality-profile__dimension"
              data-testid={`dimension-${dim.dimension}`}
            >
              <h3>{DIMENSION_LABELS[dim.dimension]}</h3>
              <p className="personality-profile__sten-score">
                Skor Sten: <strong>{dim.stenScore}</strong> / 10
              </p>

              <FacetBreakdown facets={dimensionFacets} />

              {narrative && (
                <NarrativeInterpretation
                  dimension={dim.dimension}
                  narrative={narrative.narrative}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
