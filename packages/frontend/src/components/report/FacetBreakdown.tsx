import type { FacetScore } from '@assessment/shared';

export interface FacetBreakdownProps {
  facets: FacetScore[];
}

/**
 * Displays facet breakdown for a single OCEAN dimension with sten scores.
 * Each facet is shown with a visual indicator on the 1-10 sten scale.
 *
 * Requirements: 11.2
 */
export function FacetBreakdown({ facets }: FacetBreakdownProps) {
  if (facets.length === 0) {
    return null;
  }

  return (
    <div className="facet-breakdown" data-testid="facet-breakdown">
      <h4 className="facet-breakdown__title">Rincian Faset</h4>
      <div className="facet-breakdown__list">
        {facets.map((facet) => (
          <div key={facet.facet} className="facet-breakdown__item">
            <span className="facet-breakdown__label">{formatFacetName(facet.facet)}</span>
            <div className="facet-breakdown__bar-container">
              <div
                className="facet-breakdown__bar"
                style={{ width: `${(facet.stenScore / 10) * 100}%` }}
                role="meter"
                aria-valuenow={facet.stenScore}
                aria-valuemin={1}
                aria-valuemax={10}
                aria-label={`${formatFacetName(facet.facet)}: ${facet.stenScore}/10`}
                data-testid={`facet-bar-${facet.facet}`}
              />
            </div>
            <span className="facet-breakdown__score">{facet.stenScore}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Converts snake_case facet names to readable format */
function formatFacetName(facet: string): string {
  return facet
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
