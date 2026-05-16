import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SJTTestPage, SjtScenario } from './SJTTestPage';

const mockScenarios: SjtScenario[] = [
  {
    itemId: 'scenario-1',
    scenarioText: 'Anda menemukan rekan kerja menggunakan fasilitas kantor untuk kepentingan pribadi.',
    options: [
      { id: 'a', text: 'Melaporkan langsung kepada atasan' },
      { id: 'b', text: 'Berbicara secara pribadi dengan rekan' },
      { id: 'c', text: 'Mengabaikan situasi' },
      { id: 'd', text: 'Mendiskusikan dengan rekan lain' },
    ],
  },
  {
    itemId: 'scenario-2',
    scenarioText: 'Anda ditugaskan memimpin proyek lintas divisi dengan tenggat waktu ketat.',
    options: [
      { id: 'a', text: 'Membantu anggota tim menyelesaikan tugasnya' },
      { id: 'b', text: 'Berkomunikasi dengan atasan anggota tim' },
      { id: 'c', text: 'Mendistribusikan ulang tugas' },
      { id: 'd', text: 'Meminta perpanjangan tenggat waktu' },
    ],
  },
];

describe('SJTTestPage', () => {
  it('should display the first scenario', () => {
    render(
      <SJTTestPage scenarios={mockScenarios} onSubmitScenario={() => {}} />,
    );

    expect(screen.getByText('Tes Penilaian Situasional')).toBeInTheDocument();
    expect(screen.getByText(/Skenario 1 dari 2/)).toBeInTheDocument();
    expect(
      screen.getByText(/Anda menemukan rekan kerja menggunakan fasilitas kantor/),
    ).toBeInTheDocument();
  });

  it('should display all response options for the current scenario', () => {
    render(
      <SJTTestPage scenarios={mockScenarios} onSubmitScenario={() => {}} />,
    );

    expect(screen.getByText('Melaporkan langsung kepada atasan')).toBeInTheDocument();
    expect(screen.getByText('Berbicara secara pribadi dengan rekan')).toBeInTheDocument();
    expect(screen.getByText('Mengabaikan situasi')).toBeInTheDocument();
    expect(screen.getByText('Mendiskusikan dengan rekan lain')).toBeInTheDocument();
  });

  it('should show validation errors when submitting without complete ranking', async () => {
    const user = userEvent.setup();

    render(
      <SJTTestPage scenarios={mockScenarios} onSubmitScenario={() => {}} />,
    );

    const submitBtn = screen.getByRole('button', { name: /kirim jawaban/i });
    await user.click(submitBtn);

    const errors = screen.getAllByText(/Anda harus memberikan peringkat untuk semua pilihan respons/);
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });

  it('should show validation errors when submitting without elaboration', async () => {
    const user = userEvent.setup();

    render(
      <SJTTestPage scenarios={mockScenarios} onSubmitScenario={() => {}} />,
    );

    // Fill in all rankings
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0]!, '1');
    await user.selectOptions(selects[1]!, '2');
    await user.selectOptions(selects[2]!, '3');
    await user.selectOptions(selects[3]!, '4');

    const submitBtn = screen.getByRole('button', { name: /kirim jawaban/i });
    await user.click(submitBtn);

    const errors = screen.getAllByText(/Penjelasan wajib diisi/);
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });

  it('should show validation error for elaboration shorter than 50 characters', async () => {
    const user = userEvent.setup();

    render(
      <SJTTestPage scenarios={mockScenarios} onSubmitScenario={() => {}} />,
    );

    // Fill in all rankings
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0]!, '1');
    await user.selectOptions(selects[1]!, '2');
    await user.selectOptions(selects[2]!, '3');
    await user.selectOptions(selects[3]!, '4');

    // Type short elaboration
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Teks pendek');

    const submitBtn = screen.getByRole('button', { name: /kirim jawaban/i });
    await user.click(submitBtn);

    const errors = screen.getAllByText(/Penjelasan harus minimal 50 karakter/);
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });

  it('should submit successfully with valid ranking and elaboration', async () => {
    const user = userEvent.setup();
    const onSubmitScenario = vi.fn();

    render(
      <SJTTestPage scenarios={mockScenarios} onSubmitScenario={onSubmitScenario} />,
    );

    // Fill in all rankings
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0]!, '1');
    await user.selectOptions(selects[1]!, '2');
    await user.selectOptions(selects[2]!, '3');
    await user.selectOptions(selects[3]!, '4');

    // Type valid elaboration (50+ characters)
    const textarea = screen.getByRole('textbox');
    const validElaboration = 'Melaporkan kepada atasan adalah tindakan yang paling tepat karena menunjukkan integritas.';
    await user.type(textarea, validElaboration);

    const submitBtn = screen.getByRole('button', { name: /kirim jawaban/i });
    await user.click(submitBtn);

    expect(onSubmitScenario).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 'scenario-1',
        ranking: { a: 1, b: 2, c: 3, d: 4 },
        elaboration: validElaboration,
        submitted: true,
      }),
    );
  });

  it('should advance to next scenario after successful submission', async () => {
    const user = userEvent.setup();

    render(
      <SJTTestPage scenarios={mockScenarios} onSubmitScenario={() => {}} />,
    );

    // Fill in all rankings
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0]!, '1');
    await user.selectOptions(selects[1]!, '2');
    await user.selectOptions(selects[2]!, '3');
    await user.selectOptions(selects[3]!, '4');

    // Type valid elaboration
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Melaporkan kepada atasan adalah tindakan yang paling tepat karena menunjukkan integritas.');

    const submitBtn = screen.getByRole('button', { name: /kirim jawaban/i });
    await user.click(submitBtn);

    // Should now show scenario 2
    expect(screen.getByText(/Skenario 2 dari 2/)).toBeInTheDocument();
    expect(
      screen.getByText(/Anda ditugaskan memimpin proyek lintas divisi/),
    ).toBeInTheDocument();
  });

  it('should prevent modification of previously submitted scenarios', async () => {
    const user = userEvent.setup();

    render(
      <SJTTestPage
        scenarios={mockScenarios}
        initialResponses={[
          {
            itemId: 'scenario-1',
            ranking: { a: 1, b: 2, c: 3, d: 4 },
            elaboration: 'Penjelasan yang sudah dikirim sebelumnya untuk skenario pertama ini.',
            submitted: true,
          },
          {
            itemId: 'scenario-2',
            ranking: {},
            elaboration: '',
            submitted: false,
          },
        ]}
        onSubmitScenario={() => {}}
      />,
    );

    // Navigate back to scenario 1
    const navDot = screen.getByRole('button', { name: /Skenario 1.*selesai/i });
    await user.click(navDot);

    // Should show the submitted notice
    expect(
      screen.getByText(/Jawaban untuk skenario ini telah dikirim dan tidak dapat diubah/),
    ).toBeInTheDocument();

    // All selects should be disabled
    const selects = screen.getAllByRole('combobox');
    for (const select of selects) {
      expect(select).toBeDisabled();
    }

    // Textarea should be disabled
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('should display all validation errors in Bahasa Indonesia', async () => {
    const user = userEvent.setup();

    render(
      <SJTTestPage scenarios={mockScenarios} onSubmitScenario={() => {}} />,
    );

    const submitBtn = screen.getByRole('button', { name: /kirim jawaban/i });
    await user.click(submitBtn);

    // Check that error summary is in Bahasa Indonesia
    expect(
      screen.getByText('Harap lengkapi semua bidang sebelum mengirim:'),
    ).toBeInTheDocument();
  });

  it('should show completion message when all scenarios are done', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    render(
      <SJTTestPage
        scenarios={[mockScenarios[0]!]}
        onSubmitScenario={() => {}}
        onComplete={onComplete}
      />,
    );

    // Fill in all rankings
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0]!, '1');
    await user.selectOptions(selects[1]!, '2');
    await user.selectOptions(selects[2]!, '3');
    await user.selectOptions(selects[3]!, '4');

    // Type valid elaboration
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Melaporkan kepada atasan adalah tindakan yang paling tepat karena menunjukkan integritas.');

    const submitBtn = screen.getByRole('button', { name: /kirim jawaban/i });
    await user.click(submitBtn);

    expect(onComplete).toHaveBeenCalled();
  });

  it('should display progress indicator', () => {
    render(
      <SJTTestPage scenarios={mockScenarios} onSubmitScenario={() => {}} />,
    );

    expect(screen.getByText(/Skenario 1 dari 2/)).toBeInTheDocument();
  });
});
