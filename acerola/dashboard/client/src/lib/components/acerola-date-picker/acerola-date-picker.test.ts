import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import AcerolaDatePicker from './acerola-date-picker.svelte';

describe('AcerolaDatePicker', () => {
  // feliz
  it('shows the chosen day in Brazilian format and keeps the ISO value for the form', () => {
    render(AcerolaDatePicker, {
      props: { value: '2026-09-14', name: 'performedAt', ariaLabel: 'Data da manutenção' },
    });

    expect(screen.getByRole('button')).toHaveTextContent('14 de set. de 2026');
    expect(screen.getByLabelText('Data da manutenção')).toHaveValue('2026-09-14');
  });

  it('reads only the day when the value comes with time', () => {
    render(AcerolaDatePicker, { props: { value: '2026-09-14T10:30:00.000Z' } });

    expect(screen.getByRole('button')).toHaveTextContent('14 de set. de 2026');
  });

  // triste
  it('shows the placeholder while no date was chosen', () => {
    render(AcerolaDatePicker, { props: { value: null, placeholder: 'Quando foi feita?' } });

    expect(screen.getByRole('button')).toHaveTextContent('Quando foi feita?');
  });

  it('falls back to the placeholder when the value is not a date', () => {
    render(AcerolaDatePicker, { props: { value: 'ontem' } });

    expect(screen.getByRole('button')).toHaveTextContent('Selecione uma data');
  });

  it('locks the button when disabled', () => {
    render(AcerolaDatePicker, { props: { value: '2026-09-14', disabled: true } });

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
