import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import AcerolaInputGroup from './acerola-input-group.svelte';

const data = { label: 'Valor da peça', name: 'price', value: '120,00' };

describe('AcerolaInputGroup', () => {
  // feliz
  it('links the label to the input and shows the value', () => {
    render(AcerolaInputGroup, { props: { data } });

    expect(screen.getByLabelText('Valor da peça')).toHaveValue('120,00');
  });

  it('tells the form what the person typed', async () => {
    const onChange = vi.fn();
    render(AcerolaInputGroup, { props: { data, actions: { onChange } } });

    await fireEvent.input(screen.getByLabelText('Valor da peça'), { target: { value: '99' } });

    expect(onChange).toHaveBeenCalledWith('99');
  });

  /* A altura de campo de formulário mora no componente, não na tela. */
  it('has the form field height and the control radius', () => {
    const { container } = render(AcerolaInputGroup, { props: { data } });

    const group = container.querySelector('[data-slot="input-group"]');
    expect(group?.className).toContain('control-lg');
    expect(group?.className).toContain('rounded-control');
  });

  // triste
  it('announces the error and marks the input as invalid', () => {
    render(AcerolaInputGroup, { props: { data, state: { error: 'Informe o valor' } } });

    expect(screen.getByRole('alert')).toHaveTextContent('Informe o valor');
    expect(screen.getByLabelText('Valor da peça')).toHaveAttribute('aria-invalid', 'true');
  });

  it('locks the input when disabled', () => {
    render(AcerolaInputGroup, { props: { data, state: { isDisabled: true } } });

    expect(screen.getByLabelText('Valor da peça')).toBeDisabled();
  });
});
