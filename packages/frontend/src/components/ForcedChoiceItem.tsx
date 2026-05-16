import { useState, useCallback } from 'react';
import './ForcedChoiceItem.css';

export interface ForcedChoiceItemProps {
  /** Unique item identifier */
  itemId: string;
  /** Left statement text */
  statementLeft: string;
  /** Right statement text */
  statementRight: string;
  /** Called when the candidate selects a response (value 1-5) */
  onResponse: (itemId: string, value: number) => void;
  /** Whether the component is disabled (e.g., during submission) */
  disabled?: boolean;
}

const SCALE_OPTIONS = [
  { value: 1, label: 'Sangat menggambarkan saya (kiri)' },
  { value: 2, label: 'Agak menggambarkan saya (kiri)' },
  { value: 3, label: 'Netral' },
  { value: 4, label: 'Agak menggambarkan saya (kanan)' },
  { value: 5, label: 'Sangat menggambarkan saya (kanan)' },
];

export function ForcedChoiceItem({
  itemId,
  statementLeft,
  statementRight,
  onResponse,
  disabled = false,
}: ForcedChoiceItemProps) {
  const [selectedValue, setSelectedValue] = useState<number | null>(null);

  const handleSelect = useCallback(
    (value: number) => {
      if (disabled) return;
      setSelectedValue(value);
      onResponse(itemId, value);
    },
    [disabled, itemId, onResponse]
  );

  return (
    <div className="forced-choice" role="group" aria-label="Pilihan pernyataan">
      <div className="forced-choice__statements">
        <div className="forced-choice__statement forced-choice__statement--left">
          {statementLeft}
        </div>
        <div className="forced-choice__statement forced-choice__statement--right">
          {statementRight}
        </div>
      </div>

      <div className="forced-choice__scale" role="radiogroup" aria-label="Skala penilaian">
        {SCALE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`forced-choice__scale-option${
              selectedValue === option.value ? ' forced-choice__scale-option--selected' : ''
            }`}
          >
            <input
              type="radio"
              name={`forced-choice-${itemId}`}
              value={option.value}
              checked={selectedValue === option.value}
              onChange={() => handleSelect(option.value)}
              disabled={disabled}
              className="forced-choice__radio"
              aria-label={option.label}
            />
            <span className="forced-choice__scale-label">{option.label}</span>
          </label>
        ))}
      </div>

      <div className="forced-choice__scale-labels">
        <span>← Pernyataan kiri</span>
        <span>Pernyataan kanan →</span>
      </div>
    </div>
  );
}
