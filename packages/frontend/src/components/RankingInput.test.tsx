import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankingInput, validateRanking } from './RankingInput';

const mockOptions = [
  { id: 'a', text: 'Melaporkan langsung kepada atasan' },
  { id: 'b', text: 'Berbicara secara pribadi dengan rekan' },
  { id: 'c', text: 'Mengabaikan situasi' },
  { id: 'd', text: 'Mendiskusikan masalah dengan rekan lain' },
];

describe('RankingInput', () => {
  it('should render all options', () => {
    render(
      <RankingInput
        options={mockOptions}
        ranking={{}}
        onRankingChange={() => {}}
      />,
    );

    expect(screen.getByText('Melaporkan langsung kepada atasan')).toBeInTheDocument();
    expect(screen.getByText('Berbicara secara pribadi dengan rekan')).toBeInTheDocument();
    expect(screen.getByText('Mengabaikan situasi')).toBeInTheDocument();
    expect(screen.getByText('Mendiskusikan masalah dengan rekan lain')).toBeInTheDocument();
  });

  it('should display instruction text in Bahasa Indonesia', () => {
    render(
      <RankingInput
        options={mockOptions}
        ranking={{}}
        onRankingChange={() => {}}
      />,
    );

    expect(
      screen.getByText(/Urutkan semua pilihan dari yang paling efektif/),
    ).toBeInTheDocument();
  });

  it('should display rank badges for ranked options', () => {
    render(
      <RankingInput
        options={mockOptions}
        ranking={{ a: 1, b: 2, c: 3, d: 4 }}
        onRankingChange={() => {}}
      />,
    );

    // All selects should show the correct values
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(4);
  });

  it('should call onRankingChange when a rank is selected via dropdown', async () => {
    const user = userEvent.setup();
    const onRankingChange = vi.fn();

    render(
      <RankingInput
        options={mockOptions}
        ranking={{}}
        onRankingChange={onRankingChange}
      />,
    );

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0]!, '1');

    expect(onRankingChange).toHaveBeenCalledWith({ a: 1 });
  });

  it('should remove duplicate rank when assigning same rank to different option', async () => {
    const user = userEvent.setup();
    const onRankingChange = vi.fn();

    render(
      <RankingInput
        options={mockOptions}
        ranking={{ a: 1, b: 2 }}
        onRankingChange={onRankingChange}
      />,
    );

    // Assign rank 1 to option c (should remove rank 1 from option a)
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[2]!, '1');

    expect(onRankingChange).toHaveBeenCalledWith({ b: 2, c: 1 });
  });

  it('should disable all inputs when disabled prop is true', () => {
    render(
      <RankingInput
        options={mockOptions}
        ranking={{ a: 1, b: 2, c: 3, d: 4 }}
        onRankingChange={() => {}}
        disabled={true}
      />,
    );

    const selects = screen.getAllByRole('combobox');
    for (const select of selects) {
      expect(select).toBeDisabled();
    }
  });

  it('should display validation errors', () => {
    render(
      <RankingInput
        options={mockOptions}
        ranking={{}}
        onRankingChange={() => {}}
        errors={['Anda harus memberikan peringkat untuk semua pilihan respons.']}
      />,
    );

    expect(
      screen.getByText('Anda harus memberikan peringkat untuk semua pilihan respons.'),
    ).toBeInTheDocument();
  });

  it('should have accessible labels for each option', () => {
    render(
      <RankingInput
        options={mockOptions}
        ranking={{ a: 1 }}
        onRankingChange={() => {}}
      />,
    );

    expect(screen.getByLabelText('Peringkat untuk pilihan A')).toBeInTheDocument();
    expect(screen.getByLabelText('Peringkat untuk pilihan B')).toBeInTheDocument();
  });
});

describe('validateRanking', () => {
  it('should return valid for a complete permutation', () => {
    const result = validateRanking({ a: 1, b: 2, c: 3, d: 4 }, 4);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return invalid when not all options are ranked', () => {
    const result = validateRanking({ a: 1, b: 2 }, 4);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('peringkat untuk semua pilihan');
  });

  it('should return invalid when there are ties (duplicate ranks)', () => {
    const result = validateRanking({ a: 1, b: 1, c: 3, d: 4 }, 4);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('hanya boleh digunakan satu kali'),
      ]),
    );
  });

  it('should return invalid when there are gaps', () => {
    const result = validateRanking({ a: 1, b: 2, c: 3, d: 5 }, 4);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('berurutan dari 1 hingga'),
      ]),
    );
  });

  it('should return valid for a single option ranked 1', () => {
    const result = validateRanking({ a: 1 }, 1);
    expect(result.valid).toBe(true);
  });

  it('should return invalid for empty ranking', () => {
    const result = validateRanking({}, 4);
    expect(result.valid).toBe(false);
  });
});
