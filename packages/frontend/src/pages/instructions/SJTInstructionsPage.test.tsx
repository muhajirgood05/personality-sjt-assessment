import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SJTInstructionsPage } from './SJTInstructionsPage';

describe('SJTInstructionsPage', () => {
  it('should display the page title in Bahasa Indonesia', () => {
    render(<SJTInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText('Instruksi Tes Penilaian Situasional (SJT)')).toBeInTheDocument();
  });

  it('should explain the ranking format', () => {
    render(<SJTInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText('Format Tes')).toBeInTheDocument();
    expect(screen.getByText(/Mengurutkan/)).toBeInTheDocument();
    // "paling efektif" appears in multiple places, verify at least one exists
    const elements = screen.getAllByText(/paling efektif/);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('should explain the elaboration requirement', () => {
    render(<SJTInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText(/Memberikan penjelasan/)).toBeInTheDocument();
    // The "50–500 karakter" text is split across elements, so check for the parent text
    expect(screen.getByText(/mengapa Anda memilih respons tertentu/)).toBeInTheDocument();
  });

  it('should display the five Kemenkeu values', () => {
    render(<SJTInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText(/Integritas/)).toBeInTheDocument();
    expect(screen.getByText(/Profesionalisme/)).toBeInTheDocument();
    expect(screen.getByText(/Sinergi/)).toBeInTheDocument();
    expect(screen.getByText(/Pelayanan/)).toBeInTheDocument();
    expect(screen.getByText(/Kesempurnaan/)).toBeInTheDocument();
  });

  it('should display practice scenarios section', () => {
    render(<SJTInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText('Latihan')).toBeInTheDocument();
    // Text is split across elements (<strong>2 skenario latihan</strong>)
    expect(screen.getByText('2 skenario latihan')).toBeInTheDocument();
  });

  it('should show the first practice scenario', () => {
    render(<SJTInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText('Skenario Latihan 1')).toBeInTheDocument();
    expect(screen.getByText(/rekan kerja Anda secara rutin menggunakan fasilitas kantor/)).toBeInTheDocument();
  });

  it('should have the continue button disabled before completing 2 practice scenarios', () => {
    render(<SJTInstructionsPage onContinue={() => {}} />);
    const button = screen.getByRole('button', { name: /mulai tes/i });
    expect(button).toBeDisabled();
  });

  it('should disable submit button when ranking is incomplete', () => {
    render(<SJTInstructionsPage onContinue={() => {}} />);
    const submitBtn = screen.getByRole('button', { name: /kirim jawaban skenario/i });
    expect(submitBtn).toBeDisabled();
  });

  it('should show validation errors for incomplete ranking', () => {
    render(<SJTInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText(/Anda harus memberikan peringkat untuk semua pilihan/)).toBeInTheDocument();
  });

  it('should show validation error for short elaboration', () => {
    render(<SJTInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText(/Penjelasan harus minimal 50 karakter/)).toBeInTheDocument();
  });

  it('should enable submit after completing ranking and elaboration', async () => {
    const user = userEvent.setup();
    render(<SJTInstructionsPage onContinue={() => {}} />);

    // Fill in all rankings
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0]!, '1');
    await user.selectOptions(selects[1]!, '2');
    await user.selectOptions(selects[2]!, '3');
    await user.selectOptions(selects[3]!, '4');

    // Fill in elaboration (minimum 50 characters)
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Melaporkan langsung kepada atasan adalah tindakan yang paling tepat karena menunjukkan integritas.');

    const submitBtn = screen.getByRole('button', { name: /kirim jawaban skenario/i });
    expect(submitBtn).toBeEnabled();
  });

  it('should show feedback after submitting a practice scenario', async () => {
    const user = userEvent.setup();
    render(<SJTInstructionsPage onContinue={() => {}} />);

    // Fill in all rankings
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0]!, '1');
    await user.selectOptions(selects[1]!, '2');
    await user.selectOptions(selects[2]!, '4');
    await user.selectOptions(selects[3]!, '3');

    // Fill in elaboration
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Melaporkan langsung kepada atasan adalah tindakan yang paling tepat karena menunjukkan integritas.');

    // Submit
    const submitBtn = screen.getByRole('button', { name: /kirim jawaban skenario/i });
    await user.click(submitBtn);

    // Feedback should be shown
    expect(screen.getByText(/Urutan yang direkomendasikan/)).toBeInTheDocument();
    expect(screen.getByText(/nilai Integritas/)).toBeInTheDocument();
  });

  it('should enable continue button after completing 2 practice scenarios', async () => {
    const user = userEvent.setup();
    render(<SJTInstructionsPage onContinue={() => {}} />);

    // Complete scenario 1
    let selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0]!, '1');
    await user.selectOptions(selects[1]!, '2');
    await user.selectOptions(selects[2]!, '4');
    await user.selectOptions(selects[3]!, '3');

    let textareas = screen.getAllByRole('textbox');
    let enabledTextareas = textareas.filter((t) => !(t as HTMLTextAreaElement).disabled);
    await user.type(enabledTextareas[0]!, 'Melaporkan langsung kepada atasan adalah tindakan yang paling tepat karena menunjukkan integritas.');

    let submitBtn = screen.getByRole('button', { name: /kirim jawaban skenario/i });
    await user.click(submitBtn);

    // Complete scenario 2
    selects = screen.getAllByRole('combobox');
    const enabledSelects = selects.filter((s) => !(s as HTMLSelectElement).disabled);
    await user.selectOptions(enabledSelects[0]!, '2');
    await user.selectOptions(enabledSelects[1]!, '1');
    await user.selectOptions(enabledSelects[2]!, '3');
    await user.selectOptions(enabledSelects[3]!, '4');

    textareas = screen.getAllByRole('textbox');
    enabledTextareas = textareas.filter((t) => !(t as HTMLTextAreaElement).disabled);
    await user.type(enabledTextareas[0]!, 'Berkomunikasi dengan atasan anggota tim untuk mencari solusi struktural menunjukkan kemampuan sinergi.');

    submitBtn = screen.getByRole('button', { name: /kirim jawaban skenario/i });
    await user.click(submitBtn);

    const continueBtn = screen.getByRole('button', { name: /mulai tes/i });
    expect(continueBtn).toBeEnabled();
  });

  it('should call onContinue when the button is clicked after completing practice', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<SJTInstructionsPage onContinue={onContinue} />);

    // Complete scenario 1
    let selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0]!, '1');
    await user.selectOptions(selects[1]!, '2');
    await user.selectOptions(selects[2]!, '4');
    await user.selectOptions(selects[3]!, '3');

    let textareas = screen.getAllByRole('textbox');
    let enabledTextareas = textareas.filter((t) => !(t as HTMLTextAreaElement).disabled);
    await user.type(enabledTextareas[0]!, 'Melaporkan langsung kepada atasan adalah tindakan yang paling tepat karena menunjukkan integritas.');

    let submitBtn = screen.getByRole('button', { name: /kirim jawaban skenario/i });
    await user.click(submitBtn);

    // Complete scenario 2
    selects = screen.getAllByRole('combobox');
    const enabledSelects = selects.filter((s) => !(s as HTMLSelectElement).disabled);
    await user.selectOptions(enabledSelects[0]!, '2');
    await user.selectOptions(enabledSelects[1]!, '1');
    await user.selectOptions(enabledSelects[2]!, '3');
    await user.selectOptions(enabledSelects[3]!, '4');

    textareas = screen.getAllByRole('textbox');
    enabledTextareas = textareas.filter((t) => !(t as HTMLTextAreaElement).disabled);
    await user.type(enabledTextareas[0]!, 'Berkomunikasi dengan atasan anggota tim untuk mencari solusi struktural menunjukkan kemampuan sinergi.');

    submitBtn = screen.getByRole('button', { name: /kirim jawaban skenario/i });
    await user.click(submitBtn);

    const continueBtn = screen.getByRole('button', { name: /mulai tes/i });
    await user.click(continueBtn);

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('should display all content in Bahasa Indonesia', () => {
    render(<SJTInstructionsPage onContinue={() => {}} />);
    expect(screen.getByText('Cara Menjawab')).toBeInTheDocument();
    expect(screen.getByText('Nilai yang Diukur')).toBeInTheDocument();
    expect(screen.getByText(/Baca skenario dengan seksama/)).toBeInTheDocument();
  });
});
