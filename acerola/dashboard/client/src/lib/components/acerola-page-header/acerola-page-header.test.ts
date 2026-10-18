import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';

import PageHeader from './acerola-page-header.svelte';

describe('AcerolaPageHeader', () => {
  // feliz
  it('renders the title as the page heading', () => {
    render(PageHeader, {
      props: {
        data: { title: 'Chamados' },
      },
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Chamados' })).toBeInTheDocument();
  });

  it('renders the actions it receives', () => {
    const children = createRawSnippet(() => ({
      render: () => '<button type="button">Novo chamado</button>',
    }));

    render(PageHeader, {
      props: {
        data: { title: 'Chamados' },
        children,
      },
    });

    expect(screen.getByRole('button', { name: 'Novo chamado' })).toBeInTheDocument();
  });

  // triste
  it('does not draw an empty description line when there is none', () => {
    const { container } = render(PageHeader, {
      props: {
        data: { title: 'Chamados' },
      },
    });

    expect(container.querySelector('p')).toBeNull();
  });
});
