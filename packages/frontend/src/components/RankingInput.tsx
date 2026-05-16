import { useState, useCallback } from 'react';

export interface RankingOption {
  id: string;
  text: string;
}

export interface RankingInputProps {
  /** The list of options to rank */
  options: RankingOption[];
  /** Current ranking: maps option id to rank (1-based) */
  ranking: Record<string, number>;
  /** Callback when ranking changes */
  onRankingChange: (ranking: Record<string, number>) => void;
  /** Whether the input is disabled (e.g., previously submitted scenario) */
  disabled?: boolean;
  /** Validation errors to display */
  errors?: string[];
}

/**
 * RankingInput component with drag-and-drop ranking for SJT scenarios.
 * Candidates assign a rank to every response option from most effective to least effective.
 * No ties are permitted.
 *
 * Requirements: 3.3, 3.7
 */
export function RankingInput({
  options,
  ranking,
  onRankingChange,
  disabled = false,
  errors,
}: RankingInputProps) {
  const [draggedOptionId, setDraggedOptionId] = useState<string | null>(null);
  const [dragOverRank, setDragOverRank] = useState<number | null>(null);

  // Build ordered list: options sorted by their assigned rank, unranked at the end
  const rankedOptions = [...options].sort((a, b) => {
    const rankA = ranking[a.id];
    const rankB = ranking[b.id];
    if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
    if (rankA !== undefined) return -1;
    if (rankB !== undefined) return 1;
    return 0;
  });

  const handleDragStart = useCallback(
    (optionId: string) => {
      if (disabled) return;
      setDraggedOptionId(optionId);
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetRank: number) => {
      if (disabled) return;
      e.preventDefault();
      setDragOverRank(targetRank);
    },
    [disabled],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverRank(null);
  }, []);

  const handleDrop = useCallback(
    (targetRank: number) => {
      if (disabled || !draggedOptionId) return;

      const newRanking: Record<string, number> = {};
      const currentRank = ranking[draggedOptionId];

      if (currentRank === targetRank) {
        // No change needed
        setDraggedOptionId(null);
        setDragOverRank(null);
        return;
      }

      // Reorder: shift other items to make room
      for (const option of options) {
        const optRank = ranking[option.id];
        if (option.id === draggedOptionId) {
          newRanking[option.id] = targetRank;
        } else if (optRank !== undefined) {
          if (currentRank !== undefined) {
            // Moving from one position to another
            if (currentRank < targetRank) {
              // Moving down: shift items between old and new position up
              if (optRank > currentRank && optRank <= targetRank) {
                newRanking[option.id] = optRank - 1;
              } else {
                newRanking[option.id] = optRank;
              }
            } else {
              // Moving up: shift items between new and old position down
              if (optRank >= targetRank && optRank < currentRank) {
                newRanking[option.id] = optRank + 1;
              } else {
                newRanking[option.id] = optRank;
              }
            }
          } else {
            // Dragging an unranked item into a position
            if (optRank >= targetRank) {
              newRanking[option.id] = optRank + 1;
            } else {
              newRanking[option.id] = optRank;
            }
          }
        }
      }

      onRankingChange(newRanking);
      setDraggedOptionId(null);
      setDragOverRank(null);
    },
    [disabled, draggedOptionId, ranking, options, onRankingChange],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedOptionId(null);
    setDragOverRank(null);
  }, []);

  // Fallback: select-based ranking for accessibility and non-drag-and-drop users
  const handleSelectChange = useCallback(
    (optionId: string, newRank: number) => {
      if (disabled) return;

      const newRanking: Record<string, number> = { ...ranking };

      // Remove the rank from any other option that has it
      for (const key of Object.keys(newRanking)) {
        if (newRanking[key] === newRank) {
          delete newRanking[key];
        }
      }

      // Assign the rank to the selected option
      newRanking[optionId] = newRank;

      onRankingChange(newRanking);
    },
    [disabled, ranking, onRankingChange],
  );

  return (
    <div className="ranking-input" aria-label="Peringkat pilihan respons">
      <p className="ranking-input__instruction">
        Urutkan semua pilihan dari yang paling efektif (1) hingga paling tidak efektif ({options.length}).
        Seret dan lepas untuk mengubah urutan, atau gunakan dropdown.
      </p>

      <div className="ranking-input__list" role="list">
        {rankedOptions.map((option, index) => {
          const rank = ranking[option.id];
          const displayRank = rank ?? index + 1;
          const isDragging = draggedOptionId === option.id;
          const isDragOver = dragOverRank === displayRank;

          return (
            <div
              key={option.id}
              className={`ranking-input__item${isDragging ? ' ranking-input__item--dragging' : ''}${isDragOver ? ' ranking-input__item--drag-over' : ''}${disabled ? ' ranking-input__item--disabled' : ''}`}
              role="listitem"
              draggable={!disabled}
              onDragStart={() => handleDragStart(option.id)}
              onDragOver={(e) => handleDragOver(e, displayRank)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(displayRank)}
              onDragEnd={handleDragEnd}
              aria-label={`Pilihan ${option.id.toUpperCase()}: ${option.text}. Peringkat: ${rank ?? 'belum ditentukan'}`}
            >
              <span className="ranking-input__rank-badge">
                {rank ?? '—'}
              </span>
              <span className="ranking-input__drag-handle" aria-hidden="true">
                ⠿
              </span>
              <span className="ranking-input__option-text">{option.text}</span>
              <select
                className="ranking-input__select"
                value={rank ?? ''}
                onChange={(e) => handleSelectChange(option.id, Number(e.target.value))}
                disabled={disabled}
                aria-label={`Peringkat untuk pilihan ${option.id.toUpperCase()}`}
              >
                <option value="">Pilih</option>
                {options.map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {errors && errors.length > 0 && (
        <div className="ranking-input__errors" role="alert" aria-live="polite">
          {errors.map((error, i) => (
            <p key={i} className="ranking-input__error">{error}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Validation Utilities ────────────────────────────────────────────────────

/**
 * Validates that a ranking is complete: every option has a unique rank
 * forming a valid permutation of [1..N] with no ties and no gaps.
 */
export function validateRanking(
  ranking: Record<string, number>,
  optionCount: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const assignedRanks = Object.values(ranking);

  if (assignedRanks.length < optionCount) {
    errors.push('Anda harus memberikan peringkat untuk semua pilihan respons.');
    return { valid: false, errors };
  }

  // Check for valid permutation [1..N]
  const sorted = [...assignedRanks].sort((a, b) => a - b);
  const expected = Array.from({ length: optionCount }, (_, i) => i + 1);

  const hasTies = new Set(assignedRanks).size !== assignedRanks.length;
  const hasGaps = JSON.stringify(sorted) !== JSON.stringify(expected);

  if (hasTies) {
    errors.push('Setiap peringkat hanya boleh digunakan satu kali (tidak boleh ada peringkat yang sama).');
  }

  if (hasGaps) {
    errors.push('Peringkat harus berurutan dari 1 hingga ' + optionCount + ' tanpa ada yang terlewat.');
  }

  return { valid: errors.length === 0, errors };
}
