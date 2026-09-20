import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from './status-badge.component';

describe('StatusBadge', () => {
  // feliz
  it('shows the label', () => {
    render(<StatusBadge data={{ label: 'Em andamento' }} />);

    expect(screen.getByText('Em andamento')).toBeInTheDocument();
  });

  it('paints the tone it was given', () => {
    const { container } = render(
      <StatusBadge data={{ label: 'Concluída' }} ui={{ tone: 'success' }} />,
    );

    expect(container.firstElementChild?.className).toContain('emerald');
  });

  it('falls back to neutral when no tone was given, instead of having no color', () => {
    const { container } = render(<StatusBadge data={{ label: 'A fazer' }} />);

    expect(container.firstElementChild?.className).toContain('gray');
  });

  // triste
  /* Um selo cinza escrito "—" faria parecer que alguém respondeu algo. */
  it('does not draw a badge for an empty status: says it was not filled', () => {
    render(<StatusBadge data={{ label: null }} />);

    expect(screen.getByText('Não preenchido')).toBeInTheDocument();
  });

  it('treats empty string and undefined as not filled', () => {
    const { rerender } = render(<StatusBadge data={{ label: '' }} />);
    expect(screen.getByText('Não preenchido')).toBeInTheDocument();

    rerender(<StatusBadge data={{ label: undefined }} />);
    expect(screen.getByText('Não preenchido')).toBeInTheDocument();
  });

  it('accepts an extra class without losing its own', () => {
    const { container } = render(
      <StatusBadge data={{ label: 'Concluída' }} ui={{ tone: 'success', className: 'ml-4' }} />,
    );

    expect(container.firstElementChild?.className).toContain('ml-4');
    expect(container.firstElementChild?.className).toContain('emerald');
  });
});
