import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TextAreaField from './text-area-field.svelte';

const data = { label: 'Descrição', name: 'description', value: '' };

describe('TextAreaField', () => {
  // feliz
  it('ties the label to the field and reports every keystroke', async () => {
    const onChange = vi.fn();
    render(TextAreaField, { props: { data, actions: { onChange } } });

    await userEvent.type(screen.getByLabelText('Descrição'), 'a');

    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('hides the counter while far from the limit', () => {
    render(TextAreaField, {
      props: { data: { ...data, value: 'curto', maxLength: 100 } },
    });

    expect(screen.queryByText('5/100')).not.toBeInTheDocument();
  });

  it('shows the counter near the limit', () => {
    render(TextAreaField, {
      props: { data: { ...data, value: 'a'.repeat(85), maxLength: 100 } },
    });

    expect(screen.getByText('85/100')).toBeInTheDocument();
  });

  // triste
  it('announces the error to assistive technology', () => {
    render(TextAreaField, {
      props: { data, state: { error: 'Descreva a tarefa' } },
    });

    const field = screen.getByLabelText('Descrição');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAttribute('aria-describedby', screen.getByRole('alert').id);
  });

  it('does not describe the field by an error that is not there', () => {
    render(TextAreaField, { props: { data } });

    expect(screen.getByLabelText('Descrição')).not.toHaveAttribute('aria-describedby');
  });
});
