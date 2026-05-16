import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeneralInstructionsPage } from './GeneralInstructionsPage';

describe('GeneralInstructionsPage', () => {
  it('should display the page title in Bahasa Indonesia', () => {
    render(<GeneralInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText('Selamat Datang di Platform Asesmen MINTS')).toBeInTheDocument();
  });

  it('should display assessment purpose section', () => {
    render(<GeneralInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText('Tujuan Asesmen')).toBeInTheDocument();
  });

  it('should display total duration information (45 min + 60 min)', () => {
    render(<GeneralInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText(/105 menit/)).toBeInTheDocument();
    expect(screen.getByText(/45 menit/)).toBeInTheDocument();
    expect(screen.getByText(/60 menit/)).toBeInTheDocument();
  });

  it('should display section overview', () => {
    render(<GeneralInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText('Gambaran Umum Bagian Asesmen')).toBeInTheDocument();
    expect(screen.getByText(/Tes Kepribadian \(Forced-Choice\)/)).toBeInTheDocument();
    // "Tes Penilaian Situasional (SJT)" appears in both duration and overview sections
    const sjtElements = screen.getAllByText(/Tes Penilaian Situasional \(SJT\)/);
    expect(sjtElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should have the continue button disabled initially', () => {
    render(<GeneralInstructionsPage onContinue={() => {}} />);
    const button = screen.getByRole('button', { name: /lanjutkan/i });
    expect(button).toBeDisabled();
  });

  it('should enable the continue button after checking the acknowledgment', async () => {
    const user = userEvent.setup();
    render(<GeneralInstructionsPage onContinue={() => {}} />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const button = screen.getByRole('button', { name: /lanjutkan/i });
    expect(button).toBeEnabled();
  });

  it('should call onContinue when the button is clicked after acknowledgment', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<GeneralInstructionsPage onContinue={onContinue} />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const button = screen.getByRole('button', { name: /lanjutkan/i });
    await user.click(button);

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('should display all content in Bahasa Indonesia', () => {
    render(<GeneralInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText('Durasi Total')).toBeInTheDocument();
    expect(screen.getByText('Informasi Penting')).toBeInTheDocument();
    expect(screen.getByText(/Saya telah membaca dan memahami instruksi/)).toBeInTheDocument();
  });
});
