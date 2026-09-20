import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './empty-state.component';

describe('EmptyState', () => {
  // feliz
  it('says what is empty and what to do next', () => {
    render(
      <EmptyState data={{ title: 'Nenhuma tarefa ainda', description: 'Cadastre a primeira.' }} />,
    );

    expect(screen.getByText('Nenhuma tarefa ainda')).toBeInTheDocument();
    expect(screen.getByText('Cadastre a primeira.')).toBeInTheDocument();
  });

  it('shows the suggested action', () => {
    render(
      <EmptyState data={{ title: 'Nenhuma tarefa' }}>
        <button type="button">Nova tarefa</button>
      </EmptyState>,
    );

    expect(screen.getByRole('button', { name: 'Nova tarefa' })).toBeInTheDocument();
  });

  // triste
  it('does not draw an empty description line when there is none', () => {
    const { container } = render(<EmptyState data={{ title: 'Nada' }} />);

    expect(container.querySelectorAll('p')).toHaveLength(1);
  });
});
