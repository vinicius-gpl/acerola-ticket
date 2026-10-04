import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import Harness from './acerola-filter-field-harness.test.svelte';

describe('AcerolaFilterField', () => {
  // feliz
  it('shows the name of the filter above its control', () => {
    render(Harness, { props: { label: 'Situação' } });

    const label = screen.getByText('Situação');
    const control = screen.getByRole('button', { name: 'Todas' });

    expect(label).toBeInTheDocument();
    /* O nome vem ANTES do controle na leitura — é ele que diz o que as pastilhas filtram. */
    expect(label.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('accepts an extra class from the screen without losing its own', () => {
    const { container } = render(Harness, { props: { label: 'Situação', className: 'ml-auto' } });

    expect(container.firstElementChild?.className).toContain('ml-auto');
    expect(container.firstElementChild?.className).toContain('flex-col');
  });

  // triste
  it('still shows the name when no control was given', () => {
    render(Harness, { props: { label: 'Situação', isEmpty: true } });

    expect(screen.getByText('Situação')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
