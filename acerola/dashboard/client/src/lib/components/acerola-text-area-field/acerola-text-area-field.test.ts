import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TextAreaField from './acerola-text-area-field.svelte';

const data = { label: 'Descrição', name: 'description', value: '' };

describe('AcerolaTextAreaField', () => {
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

  /* O `*` é decoração de CSS (`aria-hidden`): quem ouve a tela precisa do `required` de
     verdade no campo, não de um caractere solto no meio do rótulo. */
  it('marks the field as required, for assistive technology and for CSS', () => {
    render(TextAreaField, { props: { data: { ...data, isRequired: true } } });

    expect(screen.getByLabelText(/descrição/i)).toBeRequired();
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

  it('does not mark a field as required unless asked', () => {
    render(TextAreaField, { props: { data } });

    expect(screen.getByLabelText('Descrição')).not.toBeRequired();
  });
});
