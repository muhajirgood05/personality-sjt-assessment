import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SectionTimer } from './SectionTimer';

describe('SectionTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeProps(overrides?: Partial<Parameters<typeof SectionTimer>[0]>) {
    return {
      remainingMs: 10 * 60 * 1000, // 10 minutes
      serverTimestamp: Date.now(),
      onExpired: vi.fn(),
      onEarlySubmit: vi.fn(),
      ...overrides,
    };
  }

  it('should render time in MM:SS format', () => {
    const props = makeProps();
    render(<SectionTimer {...props} />);
    expect(screen.getByTestId('timer-display')).toHaveTextContent('10:00');
  });

  it('should render 00:00 for zero remaining time', () => {
    const props = makeProps({ remainingMs: 0 });
    render(<SectionTimer {...props} />);
    expect(screen.getByTestId('timer-display')).toHaveTextContent('00:00');
  });

  it('should format single-digit seconds with leading zero', () => {
    const props = makeProps({ remainingMs: 65000 });
    render(<SectionTimer {...props} />);
    expect(screen.getByTestId('timer-display')).toHaveTextContent('01:05');
  });

  it('should count down every second', () => {
    const props = makeProps();
    render(<SectionTimer {...props} />);
    expect(screen.getByTestId('timer-display')).toHaveTextContent('10:00');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('timer-display')).toHaveTextContent('09:59');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('timer-display')).toHaveTextContent('09:58');
  });

  it('should apply warning class when ≤5 minutes remaining', () => {
    const props = makeProps({ remainingMs: 5 * 60 * 1000 });
    render(<SectionTimer {...props} />);
    const timer = screen.getByRole('timer');
    expect(timer).toHaveClass('section-timer--warning');
  });

  it('should not apply warning class when >5 minutes remaining', () => {
    const props = makeProps({ remainingMs: 6 * 60 * 1000 });
    render(<SectionTimer {...props} />);
    const timer = screen.getByRole('timer');
    expect(timer).not.toHaveClass('section-timer--warning');
  });

  it('should switch to warning style when countdown reaches 5 minutes', () => {
    const props = makeProps({ remainingMs: 5 * 60 * 1000 + 2000 });
    render(<SectionTimer {...props} />);
    const timer = screen.getByRole('timer');
    expect(timer).not.toHaveClass('section-timer--warning');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(timer).toHaveClass('section-timer--warning');
  });

  it('should call onExpired when timer reaches 0', () => {
    const onExpired = vi.fn();
    const props = makeProps({ remainingMs: 3000, onExpired });
    render(<SectionTimer {...props} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('should not call onExpired more than once', () => {
    const onExpired = vi.fn();
    const props = makeProps({ remainingMs: 2000, onExpired });
    render(<SectionTimer {...props} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('should not show early submit button by default', () => {
    const props = makeProps();
    render(<SectionTimer {...props} />);
    expect(screen.queryByText('Selesai Lebih Awal')).not.toBeInTheDocument();
  });

  it('should show early submit button when showEarlySubmit is true', () => {
    const props = makeProps({ showEarlySubmit: true });
    render(<SectionTimer {...props} />);
    expect(screen.getByText('Selesai Lebih Awal')).toBeInTheDocument();
  });

  it('should show confirmation dialog when early submit is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const props = makeProps({ showEarlySubmit: true });
    render(<SectionTimer {...props} />);

    await user.click(screen.getByText('Selesai Lebih Awal'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Konfirmasi Pengumpulan')).toBeInTheDocument();
  });

  it('should call onEarlySubmit when user confirms in dialog', async () => {
    const onEarlySubmit = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const props = makeProps({ showEarlySubmit: true, onEarlySubmit });
    render(<SectionTimer {...props} />);

    await user.click(screen.getByText('Selesai Lebih Awal'));
    await user.click(screen.getByText('Ya, Kumpulkan'));

    expect(onEarlySubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should close dialog without calling onEarlySubmit when user cancels', async () => {
    const onEarlySubmit = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const props = makeProps({ showEarlySubmit: true, onEarlySubmit });
    render(<SectionTimer {...props} />);

    await user.click(screen.getByText('Selesai Lebih Awal'));
    await user.click(screen.getByText('Batal'));

    expect(onEarlySubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should sync with new server time when props change', () => {
    const props = makeProps({ remainingMs: 10 * 60 * 1000 });
    const { rerender } = render(<SectionTimer {...props} />);

    // Simulate heartbeat response with updated time (8 minutes remaining)
    const newProps = makeProps({ remainingMs: 8 * 60 * 1000 });
    rerender(<SectionTimer {...newProps} />);

    expect(screen.getByTestId('timer-display')).toHaveTextContent('08:00');
  });

  it('should have role="timer" for accessibility', () => {
    const props = makeProps();
    render(<SectionTimer {...props} />);
    expect(screen.getByRole('timer')).toBeInTheDocument();
  });

  it('should not go below 00:00', () => {
    const props = makeProps({ remainingMs: 500 });
    render(<SectionTimer {...props} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByTestId('timer-display')).toHaveTextContent('00:00');
  });
});
