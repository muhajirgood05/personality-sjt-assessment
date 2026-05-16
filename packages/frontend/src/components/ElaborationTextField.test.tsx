import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ElaborationTextField,
  validateElaboration,
  MIN_ELABORATION_LENGTH,
  MAX_ELABORATION_LENGTH,
} from './ElaborationTextField';

describe('ElaborationTextField', () => {
  it('should render with default label in Bahasa Indonesia', () => {
    render(<ElaborationTextField value="" onChange={() => {}} />);

    expect(
      screen.getByText(/Jelaskan mengapa Anda memilih respons tersebut/),
    ).toBeInTheDocument();
  });

  it('should display character count', () => {
    render(<ElaborationTextField value="Hello" onChange={() => {}} />);

    // Text is split across elements, use a function matcher
    const charCountEl = screen.getByText((_content, element) => {
      return element?.id === 'elaboration-field-char-count' &&
        element.textContent?.includes('5') === true &&
        element.textContent?.includes('500') === true &&
        element.textContent?.includes('karakter') === true;
    });
    expect(charCountEl).toBeInTheDocument();
  });

  it('should display minimum character hint when under minimum', () => {
    render(<ElaborationTextField value="Teks pendek" onChange={() => {}} />);

    expect(screen.getByText(/minimal 50/)).toBeInTheDocument();
  });

  it('should call onChange when text is typed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ElaborationTextField value="" onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'A');

    expect(onChange).toHaveBeenCalledWith('A');
  });

  it('should disable textarea when disabled prop is true', () => {
    render(<ElaborationTextField value="Some text" onChange={() => {}} disabled={true} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('should display validation errors', () => {
    render(
      <ElaborationTextField
        value=""
        onChange={() => {}}
        errors={['Penjelasan wajib diisi.']}
      />,
    );

    expect(screen.getByText('Penjelasan wajib diisi.')).toBeInTheDocument();
  });

  it('should show valid state when character count is within range', () => {
    const validText = 'A'.repeat(MIN_ELABORATION_LENGTH);
    render(<ElaborationTextField value={validText} onChange={() => {}} />);

    const charCount = screen.getByText(
      `${MIN_ELABORATION_LENGTH}/${MAX_ELABORATION_LENGTH} karakter`,
    );
    expect(charCount).toBeInTheDocument();
  });

  it('should have accessible aria attributes', () => {
    render(<ElaborationTextField value="" onChange={() => {}} id="test-elaboration" />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-label', 'Penjelasan jawaban');
    expect(textarea).toHaveAttribute('aria-describedby', 'test-elaboration-char-count');
  });

  it('should support custom label', () => {
    render(
      <ElaborationTextField
        value=""
        onChange={() => {}}
        label="Label kustom"
      />,
    );

    expect(screen.getByText('Label kustom')).toBeInTheDocument();
  });
});

describe('validateElaboration', () => {
  it('should return invalid for empty text', () => {
    const result = validateElaboration('');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('wajib diisi');
  });

  it('should return invalid for text shorter than 50 characters', () => {
    const result = validateElaboration('Teks pendek');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('minimal 50 karakter');
  });

  it('should return valid for text exactly 50 characters', () => {
    const result = validateElaboration('A'.repeat(50));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return valid for text exactly 500 characters', () => {
    const result = validateElaboration('A'.repeat(500));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return invalid for text longer than 500 characters', () => {
    const result = validateElaboration('A'.repeat(501));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('maksimal 500 karakter');
  });

  it('should return valid for text within range', () => {
    const result = validateElaboration('A'.repeat(200));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
