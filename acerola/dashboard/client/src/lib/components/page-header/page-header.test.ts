import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';

import PageHeader from './page-header.svelte';

describe('PageHeader', () => {
  // feliz
  it('renders the title as the page heading', () => {
    render(PageHeader, {
      props: {
        data: { title: 'Tarefas' },
      },
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Tarefas' })).toBeInTheDocument();
  });

  it('renders the actions it receives', () => {
    const children = createRawSnippet(() => ({
      render: () => '<button type="button">Nova tarefa</button>',
    }));

    render(PageHeader, {
      props: {
        data: { title: 'Tarefas' },
        children,
      },
    });

    expect(screen.getByRole('button', { name: 'Nova tarefa' })).toBeInTheDocument();
  });

  // triste
  it('does not draw an empty description line when there is none', () => {
    const { container } = render(PageHeader, {
      props: {
        data: { title: 'Tarefas' },
      },
    });

    expect(container.querySelector('p')).toBeNull();
  });
});
