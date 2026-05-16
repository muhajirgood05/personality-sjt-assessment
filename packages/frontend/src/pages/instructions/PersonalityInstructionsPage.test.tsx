import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonalityInstructionsPage } from './PersonalityInstructionsPage';

describe('PersonalityInstructionsPage', () => {
  it('should display the page title in Bahasa Indonesia', () => {
    render(<PersonalityInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText('Instruksi Tes Kepribadian')).toBeInTheDocument();
  });

  it('should explain the forced-choice format', () => {
    render(<PersonalityInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText('Format Tes')).toBeInTheDocument();
    expect(screen.getByText(/pasangan pernyataan/)).toBeInTheDocument();
    expect(screen.getByText(/skala 5 poin/)).toBeInTheDocument();
  });

  it('should display the scale explanation', () => {
    render(<PersonalityInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText('Skala Penilaian')).toBeInTheDocument();
    expect(screen.getByText(/Sangat menggambarkan saya \(pernyataan kiri\)/)).toBeInTheDocument();
    expect(screen.getByText(/Netral/)).toBeInTheDocument();
  });

  it('should display practice items section', () => {
    render(<PersonalityInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText('Latihan')).toBeInTheDocument();
    // Text is split across elements (<strong>2 soal latihan</strong>)
    expect(screen.getByText('2 soal latihan')).toBeInTheDocument();
  });

  it('should show the first practice item', () => {
    render(<PersonalityInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText('Soal Latihan 1')).toBeInTheDocument();
    expect(screen.getByText(/Saya senang mencoba hal-hal baru/)).toBeInTheDocument();
  });

  it('should have the continue button disabled before completing 2 practice items', () => {
    render(<PersonalityInstructionsPage onContinue={() => {}} />);
    const button = screen.getByRole('button', { name: /mulai tes kepribadian/i });
    expect(button).toBeDisabled();
  });

  it('should enable the continue button after completing 2 practice items', async () => {
    const user = userEvent.setup();
    render(<PersonalityInstructionsPage onContinue={() => {}} />);

    // Complete practice item 1
    const radios1 = screen.getAllByRole('radio');
    await user.click(radios1[2]!); // Select scale value 3 (neutral)
    const submitBtn1 = screen.getByRole('button', { name: /kirim jawaban latihan/i });
    await user.click(submitBtn1);

    // Complete practice item 2
    const radios2 = screen.getAllByRole('radio');
    const enabledRadios = radios2.filter((r) => !(r as HTMLInputElement).disabled);
    await user.click(enabledRadios[0]!);
    const submitBtn2 = screen.getByRole('button', { name: /kirim jawaban latihan/i });
    await user.click(submitBtn2);

    const continueBtn = screen.getByRole('button', { name: /mulai tes kepribadian/i });
    expect(continueBtn).toBeEnabled();
  });

  it('should show feedback after submitting a practice item', async () => {
    const user = userEvent.setup();
    render(<PersonalityInstructionsPage onContinue={() => {}} />);

    // Select a response and submit
    const radios = screen.getAllByRole('radio');
    await user.click(radios[0]!);
    const submitBtn = screen.getByRole('button', { name: /kirim jawaban latihan/i });
    await user.click(submitBtn);

    // Feedback should be shown - use getAllByText since the phrase appears in instructions too
    const feedbackElements = screen.getAllByText(/Tidak ada jawaban benar atau salah/);
    expect(feedbackElements.length).toBeGreaterThanOrEqual(2); // one in instructions, one in feedback
  });

  it('should disable the submit button when no scale value is selected', () => {
    render(<PersonalityInstructionsPage onContinue={() => {}} />);
    const submitBtn = screen.getByRole('button', { name: /kirim jawaban latihan/i });
    expect(submitBtn).toBeDisabled();
  });

  it('should call onContinue when the button is clicked after completing practice', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<PersonalityInstructionsPage onContinue={onContinue} />);

    // Complete 2 practice items
    const radios1 = screen.getAllByRole('radio');
    await user.click(radios1[2]!);
    await user.click(screen.getByRole('button', { name: /kirim jawaban latihan/i }));

    const radios2 = screen.getAllByRole('radio');
    const enabledRadios = radios2.filter((r) => !(r as HTMLInputElement).disabled);
    await user.click(enabledRadios[0]!);
    await user.click(screen.getByRole('button', { name: /kirim jawaban latihan/i }));

    const continueBtn = screen.getByRole('button', { name: /mulai tes kepribadian/i });
    await user.click(continueBtn);

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('should display all content in Bahasa Indonesia', () => {
    render(<PersonalityInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText('Cara Menjawab')).toBeInTheDocument();
    expect(screen.getByText(/Baca kedua pernyataan dengan seksama/)).toBeInTheDocument();
  });
});
