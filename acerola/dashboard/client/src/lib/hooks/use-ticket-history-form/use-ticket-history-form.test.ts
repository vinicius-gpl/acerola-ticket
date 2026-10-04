import {
  isClosingTicketHistoryType,
  TICKET_HISTORY_TYPES,
} from '@template/shared/domain/ticket-history.util';
import { TICKET_STATUSES } from '@template/shared/domain/ticket-status.util';
import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-ticket-history-form-harness.test.svelte';
import {
  initialTypeFor,
  initialValuesFor,
  submitLabelFor,
  toOptionGroups,
  type TicketHistoryFormModel,
} from './use-ticket-history-form.svelte';

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: { createHistory: vi.fn() },
}));

const { ticketsApi } = await import('$lib/api/tickets.api');

function ticket(over: Partial<Ticket> = {}): Ticket {
  return {
    id: 22,
    protocol: 'CH-0022',
    status: 'in_progress',
    priority: 'high',
    requesterName: 'Ana Souza',
    area: 'infra',
    department: 'contabil',
    problemType: 'network',
    participantAreas: [],
    computerId: null,
    computerName: null,
    anydeskId: null,
    contactPhone: '62999990022',
    notifyWhatsapp: false,
    description: 'A internet caiu na minha sala.',
    screenshotUrl: null,
    assignee: 'Suporte TI',
    solution: null,
    createdAt: '2026-09-23T12:00:00.000Z',
    startedAt: '2026-09-23T12:30:00.000Z',
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

function mountModel(current: Ticket = ticket(), onRecorded = vi.fn()): TicketHistoryFormModel {
  let model!: TicketHistoryFormModel;
  render(Harness, {
    props: {
      ticket: current,
      onRecorded,
      onReady: (ready: TicketHistoryFormModel) => (model = ready),
    },
  });

  return model;
}

describe('toOptionGroups', () => {
  // feliz
  it('separates what gives the ticket a step from what closes it', () => {
    const groups = toOptionGroups('in_progress');

    expect(groups.continuing.map((option) => option.label)).toEqual([
      'Andamento',
      'Aguardando solicitante',
      'Aguardando terceiro ou peça',
    ]);
    expect(groups.closing.map((option) => option.label)).toEqual([
      'Solução',
      'Encerramento com ressalva',
      'Cancelamento',
    ]);
  });

  /* A separação é a do DOMÍNIO, em qualquer estágio: nada que encerra aparece do lado de
     quem dá andamento, e o contrário. */
  it('never mixes a closing type among the ones that keep the ticket running', () => {
    for (const status of TICKET_STATUSES) {
      const groups = toOptionGroups(status);

      for (const option of groups.continuing) {
        expect(isClosingTicketHistoryType(option.value), `${status}/${option.value}`).toBe(false);
      }
      for (const option of groups.closing) {
        expect(isClosingTicketHistoryType(option.value), `${status}/${option.value}`).toBe(true);
      }
    }
  });

  // triste
  it('offers only the reopening on a closed ticket, and nothing that closes it again', () => {
    const groups = toOptionGroups('resolved');

    expect(groups.continuing.map((option) => option.value)).toEqual(['reopening']);
    expect(groups.closing).toEqual([]);
  });
});

describe('initialTypeFor', () => {
  // feliz
  it('starts on the plain progress note, the most common and the most harmless', () => {
    expect(initialTypeFor('open')).toBe('note');
    expect(initialTypeFor('waiting_requester')).toBe('note');
  });

  it('starts on the reopening when it is the only thing that fits', () => {
    expect(initialTypeFor('cancelled')).toBe('reopening');
  });

  // triste
  /* O gesto que tira o chamado da fila tem de ser ESCOLHIDO, nunca herdado de um padrão. */
  it('never starts on a type that closes the ticket, whatever the stage', () => {
    for (const status of TICKET_STATUSES) {
      expect(isClosingTicketHistoryType(initialTypeFor(status)), status).toBe(false);
    }
  });
});

describe('initialValuesFor', () => {
  // feliz
  it('starts visible to the requester, with nothing typed', () => {
    expect(initialValuesFor('open')).toEqual({
      type: 'note',
      description: '',
      isVisibleToRequester: true,
      minutesSpent: '',
    });
  });
});

describe('submitLabelFor', () => {
  // feliz
  it('says in words that the button closes the ticket', () => {
    expect(submitLabelFor('resolution')).toBe('Encerrar chamado');
    expect(submitLabelFor('cancellation')).toBe('Encerrar chamado');
  });

  // triste
  it('does not announce a closing for a type that keeps the ticket running', () => {
    for (const type of TICKET_HISTORY_TYPES.filter((type) => !isClosingTicketHistoryType(type))) {
      expect(submitLabelFor(type as never), type).toBe('Registrar histórico');
    }
  });
});

describe('useTicketHistoryFormModel', () => {
  beforeEach(() => {
    vi.mocked(ticketsApi.createHistory).mockReset();
    vi.mocked(ticketsApi.createHistory).mockResolvedValue({} as never);
  });

  // feliz
  it('tells what the chosen type will do to the ticket, before it is sent', async () => {
    const model = mountModel();

    expect(model.data.effect).toBe('keeps');

    model.actions.onTypeChange('resolution');

    await waitFor(() => expect(model.data.effect).toBe('closes'));
    expect(model.data.effectLabel).toContain('Encerra o chamado');
  });

  it('records the history with its files and tells whoever is listening', async () => {
    const onRecorded = vi.fn();
    const model = mountModel(ticket(), onRecorded);
    const file = new File(['x'], 'nota.pdf', { type: 'application/pdf' });

    model.actions.onTypeChange('waiting_third_party');
    model.actions.onChange('description', 'Pedi a fonte ao fornecedor.');
    model.actions.onChange('minutesSpent', '20');
    model.actions.onVisibilityChange(false);
    model.actions.onChosenFilesChange([file]);
    model.actions.onSubmit();

    await waitFor(() => expect(onRecorded).toHaveBeenCalledOnce());
    expect(ticketsApi.createHistory).toHaveBeenCalledWith(
      22,
      {
        type: 'waiting_third_party',
        description: 'Pedi a fonte ao fornecedor.',
        isVisibleToRequester: false,
        minutesSpent: '20',
      },
      [file],
    );
  });

  it('clears what was typed after recording, ready for the next history', async () => {
    const model = mountModel();

    model.actions.onChange('description', 'Testei o cabo.');
    model.actions.onChosenFilesChange([new File(['x'], 'foto.png', { type: 'image/png' })]);
    model.actions.onSubmit();

    await waitFor(() => expect(model.data.fields.description.value).toBe(''));
    expect(model.data.chosenFiles).toEqual([]);
  });

  // triste
  it('does not send a history without saying what happened', async () => {
    const model = mountModel();

    model.actions.onSubmit();

    await waitFor(() =>
      expect(model.data.fields.description.error).toBe('Descreva o que aconteceu'),
    );
    expect(ticketsApi.createHistory).not.toHaveBeenCalled();
  });

  it('refuses a time that is not a whole number of minutes', async () => {
    const model = mountModel();

    model.actions.onChange('description', 'Testei o cabo.');
    model.actions.onChange('minutesSpent', 'meia hora');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(model.data.fields.minutesSpent.error).toBe('Informe o tempo em minutos inteiros'),
    );
    expect(ticketsApi.createHistory).not.toHaveBeenCalled();
  });

  /* A recusa do servidor (cargo que não encerra, estágio que mudou por trás) aparece na tela e
     o que foi digitado FICA: perder o texto por causa de uma recusa é o pior dos dois males. */
  it('shows the refusal of the server and keeps what was typed', async () => {
    vi.mocked(ticketsApi.createHistory).mockRejectedValue(
      new ApiError(403, 'Só quem administra alguma área deste chamado pode encerrá-lo ou reabri-lo.'),
    );
    const onRecorded = vi.fn();
    const model = mountModel(ticket(), onRecorded);

    model.actions.onTypeChange('resolution');
    model.actions.onChange('description', 'Troquei o cabo.');
    model.actions.onSubmit();

    await waitFor(() => expect(model.state.error).toMatch(/Só quem administra/));
    expect(model.data.fields.description.value).toBe('Troquei o cabo.');
    expect(onRecorded).not.toHaveBeenCalled();
  });

  it('keeps the refusal of a chosen file apart from the refusal of the server', () => {
    const model = mountModel();

    model.actions.onAttachmentError('O arquivo passa de 10 MB.');

    expect(model.state.attachmentError).toBe('O arquivo passa de 10 MB.');
    expect(model.state.error).toBeNull();
  });
});
