import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from './page-header.component';

describe('PageHeader', () => {
  // feliz
  it('renders the title as the page heading', () => {
    render(<PageHeader data={{ title: 'Tarefas' }} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Tarefas' })).toBeInTheDocument();
  });

  it('renders the actions it receives', () => {
    render(
      <PageHeader data={{ title: 'Tarefas' }}>
        <button type="button">Nova tarefa</button>
      </PageHeader>,
    );

    expect(screen.getByRole('button', { name: 'Nova tarefa' })).toBeInTheDocument();
  });

  // triste
  it('does not draw an empty description line when there is none', () => {
    const { container } = render(<PageHeader data={{ title: 'Tarefas' }} />);

    expect(container.querySelector('p')).toBeNull();
  });
});
