import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import PendingArea from './pending-area.svelte';

const data = {
  title: 'Inventário',
  summary: 'Os computadores da empresa, com o que cada um tem dentro.',
  features: ['Cada máquina se cadastra sozinha.', 'Nota de saúde de 0 a 100.'],
};

describe('PendingArea', () => {
  // feliz
  it('names the area and says what it is for', () => {
    render(PendingArea, { props: { data } });

    expect(screen.getByRole('heading', { name: 'Inventário' })).toBeInTheDocument();
    expect(screen.getByText(data.summary)).toBeInTheDocument();
  });

  /* Sem isto a tela seria um "em breve" vazio, e quem abre não teria como conferir se o que
     está previsto é o que ele precisa. */
  it('lists what the area will do', () => {
    render(PendingArea, { props: { data } });

    expect(screen.getByText('Cada máquina se cadastra sozinha.')).toBeInTheDocument();
    expect(screen.getByText('Nota de saúde de 0 a 100.')).toBeInTheDocument();
  });

  it('says plainly that the area is not built yet', () => {
    render(PendingArea, { props: { data } });

    expect(screen.getByText(/ainda não foi construída/i)).toBeInTheDocument();
  });

  it('names what has to come first when something blocks it', () => {
    render(PendingArea, { props: { data: { ...data, dependsOn: 'o Inventário' } } });

    expect(screen.getByText(/antes desta área/i)).toBeInTheDocument();
    expect(screen.getByText('o Inventário')).toBeInTheDocument();
  });

  /* A frase é nominal justamente para não concordar em número: com verbo, duas dependências
     produziriam "depende de ... estar pronto", que não é português. */
  it('reads correctly when two things have to come first', () => {
    render(PendingArea, {
      props: { data: { ...data, dependsOn: 'o Inventário e os Chamados' } },
    });

    expect(screen.getByText('o Inventário e os Chamados')).toBeInTheDocument();
    expect(screen.queryByText(/estar pronto/i)).not.toBeInTheDocument();
  });

  // triste
  /* Uma área sem bloqueio não deve insinuar que está esperando algo. */
  it('says nothing about dependencies when nothing blocks it', () => {
    render(PendingArea, { props: { data } });

    expect(screen.queryByText(/antes desta área/i)).not.toBeInTheDocument();
  });

  it('treats a null dependency the same as none', () => {
    render(PendingArea, { props: { data: { ...data, dependsOn: null } } });

    expect(screen.queryByText(/antes desta área/i)).not.toBeInTheDocument();
  });

  it('draws no bullets when there is nothing listed yet', () => {
    render(PendingArea, { props: { data: { ...data, features: [] } } });

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
