import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ForcedChoiceItem } from './ForcedChoiceItem';

describe('ForcedChoiceItem', () => {
  const defaultProps = {
    itemId: 'item-1',
    statementLeft: 'Saya senang mencoba hal-hal baru',
    statementRight: 'Saya lebih suka rutinitas yang sudah terbukti',
    onResponse: vi.fn(),
  };

  it('renders both statements', () => {
    render(<ForcedChoiceItem {...defaultProps} />);

    expect(screen.getByText(defaultProps.statementLeft)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.statementRight)).toBeInTheDocument();
  });

  it('renders 5 radio options for the graded scale', () => {
    render(<ForcedChoiceItem {...defaultProps} />);

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
  });

  it('calls onResponse with item ID and selected value when a scale option is clicked', async () => {
    const user = userEvent.setup();
    const onResponse = vi.fn();
    render(<ForcedChoiceItem {...defaultProps} onResponse={onResponse} />);

    const radios = screen.getAllByRole('radio');
    await user.click(radios[2]!); // Select neutral (value 3)

    expect(onResponse).toHaveBeenCalledWith('item-1', 3);
  });

  it('selects value 1 for the leftmost option', async () => {
    const user = userEvent.setup();
    const onResponse = vi.fn();
    render(<ForcedChoiceItem {...defaultProps} onResponse={onResponse} />);

    const radios = screen.getAllByRole('radio');
    await user.click(radios[0]!);

    expect(onResponse).toHaveBeenCalledWith('item-1', 1);
  });

  it('selects value 5 for the rightmost option', async () => {
    const user = userEvent.setup();
    const onResponse = vi.fn();
    render(<ForcedChoiceItem {...defaultProps} onResponse={onResponse} />);

    const radios = screen.getAllByRole('radio');
    await user.click(radios[4]!);

    expect(onResponse).toHaveBeenCalledWith('item-1', 5);
  });

  it('does not call onResponse when disabled', async () => {
    const user = userEvent.setup();
    const onResponse = vi.fn();
    render(<ForcedChoiceItem {...defaultProps} onResponse={onResponse} disabled={true} />);

    const radios = screen.getAllByRole('radio');
    await user.click(radios[0]!);

    expect(onResponse).not.toHaveBeenCalled();
  });

  it('visually highlights the selected option', async () => {
    const user = userEvent.setup();
    render(<ForcedChoiceItem {...defaultProps} />);

    const radios = screen.getAllByRole('radio');
    await user.click(radios[1]!);

    expect(radios[1]).toBeChecked();
  });

  it('has accessible radiogroup role', () => {
    render(<ForcedChoiceItem {...defaultProps} />);

    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('displays scale labels in Bahasa Indonesia', () => {
    render(<ForcedChoiceItem {...defaultProps} />);

    expect(screen.getByLabelText('Sangat menggambarkan saya (kiri)')).toBeInTheDocument();
    expect(screen.getByLabelText('Netral')).toBeInTheDocument();
    expect(screen.getByLabelText('Sangat menggambarkan saya (kanan)')).toBeInTheDocument();
  });
});
