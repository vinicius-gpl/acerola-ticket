import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import AcerolaButtonGroup from './acerola-button-group.svelte';

const options = [
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
];
const ui = { ariaLabel: 'Recorte do período' };

describe('AcerolaButtonGroup', () => {
  // feliz
  it('names the group and marks only the chosen option', () => {
    render(AcerolaButtonGroup, { props: { data: { options, value: 'week' }, ui } });

    expect(screen.getByRole('group', { name: 'Recorte do período' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Semana' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Dia' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('tells the screen which option the person picked', async () => {
    const onChange = vi.fn();
    render(AcerolaButtonGroup, {
      props: { data: { options, value: 'week' }, ui, actions: { onChange } },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Mês' }));

    expect(onChange).toHaveBeenCalledWith('month');
  });

  // triste
  it('locks every option when disabled', () => {
    render(AcerolaButtonGroup, {
      props: { data: { options, value: 'week' }, ui, state: { isDisabled: true } },
    });

    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  });

  it('marks nothing when the value matches no option', () => {
    render(AcerolaButtonGroup, { props: { data: { options, value: '' }, ui } });

    for (const button of screen.getAllByRole('button'))
      expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});
