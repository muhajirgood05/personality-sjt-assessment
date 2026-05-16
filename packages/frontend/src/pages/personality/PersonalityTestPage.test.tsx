import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PersonalityTestPage } from './PersonalityTestPage';
import type { PersonalityItemDto, TimerSync } from '@assessment/shared';

describe('PersonalityTestPage', () => {
  const mockTimerSync: TimerSync = {
    sectionId: 'section-1',
    remainingMs: 45 * 60 * 1000, // 45 minutes
    serverTimestamp: Date.now(),
  };

  const mockItem: PersonalityItemDto = {
    type: 'forced_choice',
    itemId: 'item-1',
    statementLeft: 'Saya senang mencoba hal-hal baru',
    statementRight: 'Saya lebih suka rutinitas yang sudah terbukti',
    renderedAt: Date.now(),
  };

  const mockNextItem: PersonalityItemDto = {
    type: 'forced_choice',
    itemId: 'item-2',
    statementLeft: 'Saya suka bekerja dalam tim',
    statementRight: 'Saya lebih suka bekerja sendiri',
    renderedAt: Date.now(),
  };

  const defaultProps = {
    assessmentId: 'assessment-1',
    initialItem: mockItem,
    totalItems: 120,
    initialIndex: 0,
    timerSync: mockTimerSync,
    onSubmitResponse: vi.fn(),
    onAutoSave: vi.fn(),
    onSectionComplete: vi.fn(),
    onTimerExpired: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    defaultProps.onSubmitResponse.mockResolvedValue({
      nextItem: mockNextItem,
      timerSync: mockTimerSync,
      sectionComplete: false,
    });
    defaultProps.onAutoSave.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the progress indicator showing current item and total', () => {
    render(<PersonalityTestPage {...defaultProps} />);

    expect(screen.getByTestId('progress-text')).toHaveTextContent('Soal 1 dari 120');
  });

  it('renders the progress bar with correct percentage', () => {
    render(<PersonalityTestPage {...defaultProps} initialIndex={59} />);

    const fill = screen.getByTestId('progress-fill');
    // (60/120) * 100 = 50%
    expect(fill).toHaveStyle({ width: '50%' });
  });

  it('renders the forced-choice item with statements', () => {
    render(<PersonalityTestPage {...defaultProps} />);

    expect(screen.getByText(mockItem.statementLeft)).toBeInTheDocument();
    expect(screen.getByText(mockItem.statementRight)).toBeInTheDocument();
  });

  it('does not render a back button (forward-only navigation)', () => {
    render(<PersonalityTestPage {...defaultProps} />);

    expect(screen.queryByRole('button', { name: /kembali/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sebelumnya/i })).not.toBeInTheDocument();
  });

  it('does not render a skip button', () => {
    render(<PersonalityTestPage {...defaultProps} />);

    expect(screen.queryByRole('button', { name: /lewati/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();
  });

  it('submits response and advances to next item on selection', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PersonalityTestPage {...defaultProps} />);

    const radios = screen.getAllByRole('radio');
    await user.click(radios[2]!); // Select neutral (value 3)

    await waitFor(() => {
      expect(defaultProps.onSubmitResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          assessmentId: 'assessment-1',
          itemId: 'item-1',
          response: 3,
          responseTimeMs: expect.any(Number),
          clientTimestamp: expect.any(Number),
        })
      );
    });

    // After response, next item should be displayed
    await waitFor(() => {
      expect(screen.getByText(mockNextItem.statementLeft)).toBeInTheDocument();
    });
  });

  it('calls onSectionComplete when the last item is answered', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    defaultProps.onSubmitResponse.mockResolvedValue({
      nextItem: null,
      timerSync: mockTimerSync,
      sectionComplete: true,
    });

    render(<PersonalityTestPage {...defaultProps} />);

    const radios = screen.getAllByRole('radio');
    await user.click(radios[0]!);

    await waitFor(() => {
      expect(defaultProps.onSectionComplete).toHaveBeenCalled();
    });
  });

  it('shows inactivity reminder after 120 seconds of no response', async () => {
    render(<PersonalityTestPage {...defaultProps} />);

    // Initially no reminder
    expect(screen.queryByTestId('inactivity-reminder')).not.toBeInTheDocument();

    // Advance time by 120 seconds
    await act(async () => {
      vi.advanceTimersByTime(120_000);
    });

    expect(screen.getByTestId('inactivity-reminder')).toBeInTheDocument();
    expect(screen.getByText(/belum memberikan jawaban selama 2 menit/i)).toBeInTheDocument();
  });

  it('dismisses inactivity reminder when button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PersonalityTestPage {...defaultProps} />);

    // Trigger reminder
    await act(async () => {
      vi.advanceTimersByTime(120_000);
    });

    expect(screen.getByTestId('inactivity-reminder')).toBeInTheDocument();

    // Dismiss
    await user.click(screen.getByRole('button', { name: /mengerti/i }));

    expect(screen.queryByTestId('inactivity-reminder')).not.toBeInTheDocument();
  });

  it('triggers auto-save every 30 seconds', async () => {
    render(<PersonalityTestPage {...defaultProps} />);

    // Advance 30 seconds
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    await waitFor(() => {
      expect(defaultProps.onAutoSave).toHaveBeenCalledWith('assessment-1');
    });

    // Advance another 30 seconds
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    await waitFor(() => {
      expect(defaultProps.onAutoSave).toHaveBeenCalledTimes(2);
    });
  });

  it('shows auto-save status indicator when saving', async () => {
    // Make auto-save take some time
    defaultProps.onAutoSave.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500))
    );

    render(<PersonalityTestPage {...defaultProps} />);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    await waitFor(() => {
      const indicator = screen.getByTestId('auto-save-indicator');
      expect(indicator).toHaveTextContent('Menyimpan...');
    });
  });

  it('includes response time in the submission payload', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PersonalityTestPage {...defaultProps} />);

    // Wait a bit before responding to get a measurable response time
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    const radios = screen.getAllByRole('radio');
    await user.click(radios[0]!);

    await waitFor(() => {
      const call = defaultProps.onSubmitResponse.mock.calls[0]![0];
      expect(call.responseTimeMs).toBeGreaterThanOrEqual(3000);
    });
  });

  it('renders the section timer', () => {
    render(<PersonalityTestPage {...defaultProps} />);

    expect(screen.getByRole('timer')).toBeInTheDocument();
  });

  it('updates progress text after advancing to next item', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PersonalityTestPage {...defaultProps} />);

    const radios = screen.getAllByRole('radio');
    await user.click(radios[0]!);

    await waitFor(() => {
      expect(screen.getByTestId('progress-text')).toHaveTextContent('Soal 2 dari 120');
    });
  });
});
