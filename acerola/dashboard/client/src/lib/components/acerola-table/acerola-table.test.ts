import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import Harness from './acerola-table-harness.test.svelte';

describe('AcerolaTable', () => {
  // feliz
  it('draws a real table with header, rows and actions', () => {
    render(Harness);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Peça' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Memória 8 GB' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver histórico' })).toBeInTheDocument();
  });

  /* A aparência da casa mora aqui, não no `ui/table`: superfície de cartão por fora. */
  it('wraps the table in a card surface', () => {
    const { container } = render(Harness);

    const surface = container.querySelector('[data-slot="table-surface"]');
    expect(surface?.className).toContain('rounded-surface');
    expect(surface?.className).toContain('shadow-xs');
  });

  it('shows the footer with the source and the count', () => {
    render(Harness, { props: { hasFooter: true } });

    expect(screen.getByText('Estoque de peças')).toBeInTheDocument();
    expect(screen.getByText('1 peça')).toBeInTheDocument();
  });

  /* Texto comprido quebra na célula; só a célula de ações fica numa linha só. */
  it('lets cell text wrap and keeps the screen class', () => {
    render(Harness, { props: { cellClass: 'font-medium' } });

    const cell = screen.getByRole('cell', { name: 'Memória 8 GB' });
    expect(cell.className).toContain('whitespace-normal');
    expect(cell.className).toContain('font-medium');
  });

  // triste
  it('draws no footer when the screen gives none', () => {
    render(Harness);

    expect(screen.queryByText('Estoque de peças')).toBeNull();
  });

  it('lets the screen drop the surface when the table already lives in a card', () => {
    const { container } = render(Harness, {
      props: { containerClass: 'rounded-none border-0 shadow-none' },
    });

    const surface = container.querySelector('[data-slot="table-surface"]');
    expect(surface?.className).toContain('rounded-none');
    expect(surface?.className).not.toContain('rounded-surface');
  });
});
