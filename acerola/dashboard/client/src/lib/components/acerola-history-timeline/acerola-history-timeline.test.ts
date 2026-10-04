import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import HistoryTimeline, {
  formatMinutesSpent,
  type HistoryTimelineEntry,
} from './acerola-history-timeline.svelte';

function history(over: Partial<HistoryTimelineEntry> = {}): HistoryTimelineEntry {
  return {
    id: 1,
    type: 'note',
    description: 'Liguei para o fornecedor.',
    statusAfter: 'in_progress',
    authorName: 'Suporte TI',
    createdAt: '2026-09-17T12:00:00.000Z',
    attachments: [],
    minutesSpent: null,
    isVisibleToRequester: true,
    ...over,
  };
}

function setup(histories: HistoryTimelineEntry[], props: Record<string, unknown> = {}) {
  return render(HistoryTimeline, { props: { data: { histories }, ...props } });
}

describe('formatMinutesSpent', () => {
  // feliz
  it('writes the time the way a person says it', () => {
    expect(formatMinutesSpent(45)).toBe('45 min');
    expect(formatMinutesSpent(120)).toBe('2 h');
    expect(formatMinutesSpent(90)).toBe('1 h 30 min');
  });

  // triste
  it('keeps zero as zero minutes, not as an empty text', () => {
    expect(formatMinutesSpent(0)).toBe('0 min');
  });
});

describe('AcerolaHistoryTimeline', () => {
  // feliz
  it('shows who, what kind, what happened and the stage the ticket was left in', () => {
    setup([history({ type: 'waiting_third_party', statusAfter: 'waiting_third_party' })]);

    expect(screen.getByText('Aguardando terceiro ou peça')).toBeInTheDocument();
    expect(screen.getByText('Suporte TI')).toBeInTheDocument();
    expect(screen.getByText('Liguei para o fornecedor.')).toBeInTheDocument();
    expect(screen.getByText('Estágio: Aguardando terceiro')).toBeInTheDocument();
  });

  it('keeps the histories in the order it was given, oldest first', () => {
    setup([
      history({ id: 1, description: 'Primeiro passo.' }),
      history({ id: 2, description: 'Segundo passo.' }),
    ]);

    const items = screen.getAllByRole('listitem');

    expect(within(items[0]!).getByText('Primeiro passo.')).toBeInTheDocument();
    expect(within(items[1]!).getByText('Segundo passo.')).toBeInTheDocument();
  });

  /* O que ENCERRA é dito com palavras, e não só com a cor do selo: cor sozinha some para quem
     não distingue as cores e some na impressão. */
  it.each(['resolution', 'closure_with_caveats', 'cancellation'] as const)(
    'says in words that a %s closed the ticket',
    (type) => {
      setup([history({ type })]);

      expect(screen.getByText('Encerrou o chamado')).toBeInTheDocument();
    },
  );

  it('shows the time spent when it was informed', () => {
    setup([history({ minutesSpent: 90 })]);

    expect(screen.getByText('Tempo: 1 h 30 min')).toBeInTheDocument();
  });

  it('marks the history the requester does not see', () => {
    setup([history({ isVisibleToRequester: false })]);

    expect(screen.getByText(/interno — quem abriu não vê/i)).toBeInTheDocument();
  });

  it('lists the files that came with the history', () => {
    setup([
      history({
        attachments: [
          {
            id: 9,
            ticketId: 7,
            historyId: 1,
            kind: 'pdf',
            origin: 'support',
            fileName: 'pedido-do-rolete.pdf',
            contentType: 'application/pdf',
            sizeBytes: 2048,
            viewUrl: 'https://example.invalid/abrir',
            downloadUrl: 'https://example.invalid/baixar',
            createdAt: '2026-09-17T12:00:00.000Z',
            createdBy: null,
          },
        ],
      }),
    ]);

    expect(screen.getByText('pedido-do-rolete.pdf')).toBeInTheDocument();
    /* A linha do tempo é registro: nenhum arquivo dela se apaga por aqui. */
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
  });

  // triste
  it('does not announce a closing for a history that keeps the ticket running', () => {
    setup([history({ type: 'note' }), history({ id: 2, type: 'reopening' })]);

    expect(screen.queryByText('Encerrou o chamado')).not.toBeInTheDocument();
  });

  /* A consulta pública não recebe o tempo nem a marca de visibilidade — e a linha do tempo
     não inventa o que não veio. */
  it('shows neither time nor the internal mark when they were not sent', () => {
    setup([
      {
        id: 1,
        type: 'note',
        description: 'Peça a caminho.',
        statusAfter: 'in_progress',
        authorName: 'Suporte TI',
        createdAt: '2026-09-17T12:00:00.000Z',
        attachments: [],
      },
    ]);

    expect(screen.queryByText(/tempo:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/interno/i)).not.toBeInTheDocument();
  });

  it('says there is nothing yet, in the words of the screen that uses it', () => {
    setup([], { ui: { emptyLabel: 'Ainda não há andamento registrado neste chamado.' } });

    expect(screen.getByText('Ainda não há andamento registrado neste chamado.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('says it is loading instead of saying there is nothing', () => {
    setup([], { state: { isLoading: true } });

    expect(screen.getByText(/carregando a linha do tempo/i)).toBeInTheDocument();
    expect(screen.queryByText(/nenhum histórico/i)).not.toBeInTheDocument();
  });

  it('shows the failure instead of an empty timeline', () => {
    setup([], { state: { error: 'Não consegui falar com o servidor.' } });

    expect(screen.getByText('Não consegui falar com o servidor.')).toBeInTheDocument();
  });
});
