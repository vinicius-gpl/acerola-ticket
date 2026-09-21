import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';

import EmptyState from './empty-state.component.svelte';

describe('EmptyState', () => {
  // feliz
  it('says what is empty and what to do next', () => {
    render(EmptyState, {
      props: {
        data: { title: 'Nenhuma tarefa ainda', description: 'Cadastre a primeira.' },
      },
    });

    expect(screen.getByText('Nenhuma tarefa ainda')).toBeInTheDocument();
    expect(screen.getByText('Cadastre a primeira.')).toBeInTheDocument();
  });

  it('shows the suggested action', () => {
    const children = createRawSnippet(() => ({
      render: () => '<button type="button">Nova tarefa</button>',
    }));

    render(EmptyState, {
      props: {
        data: { title: 'Nenhuma tarefa' },
        children,
      },
    });

    expect(screen.getByRole('button', { name: 'Nova tarefa' })).toBeInTheDocument();
  });

  // triste
  it('does not draw an empty description line when there is none', () => {
    const { container } = render(EmptyState, {
      props: {
        data: { title: 'Nada' },
      },
    });

    expect(container.querySelectorAll('p')).toHaveLength(1);
  });
});
