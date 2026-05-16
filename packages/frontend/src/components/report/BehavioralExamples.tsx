import { KemenkeuValue } from '@assessment/shared';
import type { ValueBehavioralExampleDto } from '@assessment/shared';

export interface BehavioralExamplesProps {
  examples: ValueBehavioralExampleDto[];
}

const VALUE_LABELS: Record<KemenkeuValue, string> = {
  [KemenkeuValue.Integritas]: 'Integritas',
  [KemenkeuValue.Profesionalisme]: 'Profesionalisme',
  [KemenkeuValue.Sinergi]: 'Sinergi',
  [KemenkeuValue.Pelayanan]: 'Pelayanan',
  [KemenkeuValue.Kesempurnaan]: 'Kesempurnaan',
};

/**
 * Behavioral examples section showing 1-3 examples per Kemenkeu value,
 * extracted from candidate elaboration responses.
 *
 * Requirements: 11.3
 */
export function BehavioralExamples({ examples }: BehavioralExamplesProps) {
  if (examples.length === 0) {
    return (
      <section className="behavioral-examples" aria-labelledby="behavioral-examples-title">
        <h3 id="behavioral-examples-title">Contoh Perilaku</h3>
        <p className="behavioral-examples__empty">
          Tidak ada contoh perilaku yang tersedia.
        </p>
      </section>
    );
  }

  return (
    <section className="behavioral-examples" aria-labelledby="behavioral-examples-title">
      <h3 id="behavioral-examples-title">Contoh Perilaku</h3>
      <div className="behavioral-examples__list" data-testid="behavioral-examples-list">
        {examples.map((item) => (
          <div
            key={item.value}
            className="behavioral-examples__value-group"
            data-testid={`examples-${item.value}`}
          >
            <h4 className="behavioral-examples__value-name">
              {VALUE_LABELS[item.value]}
            </h4>
            <ul className="behavioral-examples__examples">
              {item.examples.slice(0, 3).map((example, idx) => (
                <li key={idx} className="behavioral-examples__example-item">
                  {example}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
