import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';

import EmptyState from './acerola-empty-state.svelte';

describe('AcerolaEmptyState', () => {
  // feliz
  it('says what is empty and what to do next', () => {
    render(EmptyState, {
      props: {
        data: { title: 'Nenhum chamado ainda', description: 'Cadastre a primeira.' },
      },
    });

    expect(screen.getByText('Nenhum chamado ainda')).toBeInTheDocument();
    expect(screen.getByText('Cadastre a primeira.')).toBeInTheDocument();
  });

  it('shows the suggested action', () => {
    const children = createRawSnippet(() => ({
      render: () => '<button type="button">Novo chamado</button>',
    }));

    render(EmptyState, {
      props: {
        data: { title: 'Nenhum chamado' },
        children,
      },
    });

    expect(screen.getByRole('button', { name: 'Novo chamado' })).toBeInTheDocument();
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
