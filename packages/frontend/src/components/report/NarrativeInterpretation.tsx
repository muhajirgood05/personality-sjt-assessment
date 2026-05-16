import { OceanDimension } from '@assessment/shared';

export interface NarrativeInterpretationProps {
  dimension: OceanDimension;
  /** Narrative text (max 200 words per dimension) */
  narrative: string;
}

const MAX_WORDS = 200;

/**
 * Displays narrative interpretation for a single OCEAN dimension.
 * Enforces the 200-word maximum by truncating if necessary.
 *
 * Requirements: 11.2
 */
export function NarrativeInterpretation({
  dimension,
  narrative,
}: NarrativeInterpretationProps) {
  const displayText = truncateToMaxWords(narrative, MAX_WORDS);
  const wordCount = narrative.split(/\s+/).filter(Boolean).length;
  const isTruncated = wordCount > MAX_WORDS;

  return (
    <div
      className="narrative-interpretation"
      data-testid={`narrative-${dimension}`}
    >
      <h4 className="narrative-interpretation__title">Interpretasi Naratif</h4>
      <p className="narrative-interpretation__text">{displayText}</p>
      {isTruncated && (
        <p className="narrative-interpretation__truncated-notice">
          <em>(Teks dipotong pada {MAX_WORDS} kata)</em>
        </p>
      )}
    </div>
  );
}

function truncateToMaxWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return text;
  }
  return words.slice(0, maxWords).join(' ') + '…';
}
