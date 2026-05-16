import { useCallback } from 'react';

export const MIN_ELABORATION_LENGTH = 50;
export const MAX_ELABORATION_LENGTH = 500;

export interface ElaborationTextFieldProps {
  /** Current elaboration text value */
  value: string;
  /** Callback when text changes */
  onChange: (value: string) => void;
  /** Whether the field is disabled (e.g., previously submitted scenario) */
  disabled?: boolean;
  /** Validation errors to display */
  errors?: string[];
  /** Custom label text */
  label?: string;
  /** HTML id for the textarea */
  id?: string;
}

/**
 * ElaborationTextField component with character count (50–500).
 * Requires candidates to explain their reasoning for the most effective choice.
 *
 * Requirements: 3.4, 3.8
 */
export function ElaborationTextField({
  value,
  onChange,
  disabled = false,
  errors,
  label,
  id = 'elaboration-field',
}: ElaborationTextFieldProps) {
  const charCount = value.length;
  const isUnderMin = charCount > 0 && charCount < MIN_ELABORATION_LENGTH;
  const isOverMax = charCount > MAX_ELABORATION_LENGTH;
  const isValid = charCount >= MIN_ELABORATION_LENGTH && charCount <= MAX_ELABORATION_LENGTH;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (disabled) return;
      onChange(e.target.value);
    },
    [disabled, onChange],
  );

  const getCharCountClass = (): string => {
    if (isOverMax) return 'elaboration-field__char-count--error';
    if (isValid) return 'elaboration-field__char-count--valid';
    if (isUnderMin) return 'elaboration-field__char-count--warning';
    return '';
  };

  return (
    <div className="elaboration-field">
      <label htmlFor={id} className="elaboration-field__label">
        {label ??
          `Jelaskan mengapa Anda memilih respons tersebut sebagai yang paling efektif (${MIN_ELABORATION_LENGTH}–${MAX_ELABORATION_LENGTH} karakter):`}
      </label>
      <textarea
        id={id}
        className={`elaboration-field__textarea${disabled ? ' elaboration-field__textarea--disabled' : ''}`}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        minLength={MIN_ELABORATION_LENGTH}
        maxLength={MAX_ELABORATION_LENGTH}
        placeholder="Tuliskan penjelasan Anda di sini..."
        aria-label="Penjelasan jawaban"
        aria-describedby={`${id}-char-count`}
        aria-invalid={isUnderMin || isOverMax ? 'true' : undefined}
      />
      <span
        id={`${id}-char-count`}
        className={`elaboration-field__char-count ${getCharCountClass()}`}
        aria-live="polite"
      >
        {charCount}/{MAX_ELABORATION_LENGTH} karakter
        {isUnderMin && ` (minimal ${MIN_ELABORATION_LENGTH})`}
      </span>

      {errors && errors.length > 0 && (
        <div className="elaboration-field__errors" role="alert" aria-live="polite">
          {errors.map((error, i) => (
            <p key={i} className="elaboration-field__error">{error}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Validation Utilities ────────────────────────────────────────────────────

/**
 * Validates elaboration text meets the 50–500 character requirement.
 */
export function validateElaboration(text: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (text.length === 0) {
    errors.push('Penjelasan wajib diisi.');
  } else if (text.length < MIN_ELABORATION_LENGTH) {
    errors.push(
      `Penjelasan harus minimal ${MIN_ELABORATION_LENGTH} karakter (saat ini: ${text.length}).`,
    );
  } else if (text.length > MAX_ELABORATION_LENGTH) {
    errors.push(
      `Penjelasan maksimal ${MAX_ELABORATION_LENGTH} karakter (saat ini: ${text.length}).`,
    );
  }

  return { valid: errors.length === 0, errors };
}
