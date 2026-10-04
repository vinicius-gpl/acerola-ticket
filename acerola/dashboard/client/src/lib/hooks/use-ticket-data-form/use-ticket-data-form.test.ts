import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-ticket-data-form-harness.test.svelte';
import {
  toAvailableParticipantAreas,
  toFormValues,
  toMachineOptions,
  toUpdateInput,
  type TicketDataFormModel,
} from './use-ticket-data-form.svelte';

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: { update: vi.fn(), addArea: vi.fn(), removeArea: vi.fn() },
}));

vi.mock('$lib/api/computers.api', () => ({
  computersApi: { list: vi.fn() },
}));

const { ticketsApi } = await import('$lib/api/tickets.api');
const { computersApi } = await import('$lib/api/computers.api');

function ticket(over: Partial<Ticket> = {}): Ticket {
  return {
    id: 22,
    protocol: 'CH-0022',
    status: 'in_progress',
    priority: 'medium',
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

function mountModel(current: Ticket = ticket()): TicketDataFormModel {
  let model!: TicketDataFormModel;
  render(Harness, {
    props: { ticket: current, onReady: (ready: TicketDataFormModel) => (model = ready) },
  });

  return model;
}

describe('toFormValues', () => {
  // feliz
  it('starts from what the ticket already has', () => {
    expect(toFormValues(ticket({ computerId: 11, priority: 'high' }))).toEqual({
      priority: 'high',
      area: 'infra',
      problemType: 'network',
      computerId: '11',
      assignee: 'Suporte TI',
    });
  });

  // triste
  it('reads no machine and no assignee as empty text, never as "null"', () => {
    const values = toFormValues(ticket({ assignee: null }));

    expect(values.computerId).toBe('');
    expect(values.assignee).toBe('');
  });
});

describe('toUpdateInput', () => {
  // feliz
  it('turns the machine back into a number', () => {
    expect(toUpdateInput({ ...toFormValues(ticket()), computerId: '11' }).computerId).toBe(11);
  });

  // triste
  /* Nulo DESVINCULA: é assim que se desfaz um vínculo errado. */
  it('sends null for no machine, which unlinks it', () => {
    expect(toUpdateInput(toFormValues(ticket())).computerId).toBeNull();
  });

  /* O estágio só muda por um histórico: ele não pode sair deste formulário nem por descuido. */
  it('never sends the stage nor the solution', () => {
    const input = toUpdateInput(toFormValues(ticket()));

    expect(input).not.toHaveProperty('status');
    expect(input).not.toHaveProperty('solution');
  });
});

describe('toAvailableParticipantAreas', () => {
  // feliz
  it('offers every area but the original one and the ones already in', () => {
    const areas = toAvailableParticipantAreas(ticket({ participantAreas: ['manutencao'] }));

    expect(areas.map((area) => area.value)).toEqual(['sistema']);
  });

  // triste
  it('offers nothing when every area is already on the ticket', () => {
    expect(
      toAvailableParticipantAreas(ticket({ participantAreas: ['sistema', 'manutencao'] })),
    ).toEqual([]);
  });
});

describe('toMachineOptions', () => {
  // feliz
  it('shows the nickname with the technical name next to it', () => {
    expect(toMachineOptions([{ id: 3, name: 'RECEPCAO-01', displayName: 'Recepção — balcão' }])).toEqual(
      [{ value: '3', label: 'Recepção — balcão (RECEPCAO-01)' }],
    );
  });

  // triste
  it('falls back to the technical name when there is no nickname', () => {
    expect(toMachineOptions([{ id: 3, name: 'RECEPCAO-01', displayName: '  ' }])[0]?.label).toBe(
      'RECEPCAO-01',
    );
  });
});

describe('useTicketDataFormModel', () => {
  beforeEach(() => {
    vi.mocked(ticketsApi.update).mockReset();
    vi.mocked(ticketsApi.update).mockResolvedValue(ticket());
    vi.mocked(ticketsApi.addArea).mockReset();
    vi.mocked(ticketsApi.removeArea).mockReset();
    vi.mocked(computersApi.list).mockResolvedValue({
      items: [{ id: 3, name: 'RECEPCAO-01', displayName: null }],
      total: 1,
      page: 1,
      pageSize: 200,
    } as never);
  });

  // feliz
  it('saves the corrected data and confirms it on screen', async () => {
    const model = mountModel();

    model.actions.onChange('priority', 'high');
    model.actions.onChange('computerId', '3');
    model.actions.onSubmit();

    await waitFor(() => expect(model.state.isSaved).toBe(true));
    expect(ticketsApi.update).toHaveBeenCalledWith(22, {
      priority: 'high',
      area: 'infra',
      problemType: 'network',
      computerId: 3,
      assignee: 'Suporte TI',
    });
  });

  it('offers the machines of the inventory to link the ticket to', async () => {
    const model = mountModel();

    await waitFor(() => expect(model.data.machines).toEqual([{ value: '3', label: 'RECEPCAO-01' }]));
  });

  it('adds a participant area right away, without waiting for the form', async () => {
    vi.mocked(ticketsApi.addArea).mockResolvedValue(ticket({ participantAreas: ['manutencao'] }));
    const model = mountModel();

    model.actions.onAddParticipantArea('manutencao');

    await waitFor(() => expect(model.data.ticket.participantAreas).toEqual(['manutencao']));
    expect(ticketsApi.addArea).toHaveBeenCalledWith(22, 'manutencao');
  });

  /* A área que entrou sai da lista das que ainda podem entrar: o botão dela some. */
  it('stops offering an area once it became a participant', async () => {
    vi.mocked(ticketsApi.addArea).mockResolvedValue(ticket({ participantAreas: ['manutencao'] }));
    const model = mountModel();

    model.actions.onAddParticipantArea('manutencao');

    await waitFor(() =>
      expect(model.data.availableParticipantAreas.map((area) => area.value)).not.toContain('manutencao'),
    );
  });

  it('removes a participant area', async () => {
    vi.mocked(ticketsApi.removeArea).mockResolvedValue(ticket());
    const model = mountModel(ticket({ participantAreas: ['manutencao'] }));

    model.actions.onRemoveParticipantArea('manutencao');

    await waitFor(() => expect(model.data.ticket.participantAreas).toEqual([]));
  });

  // triste
  it('stops saying it was saved as soon as something is changed again', async () => {
    const model = mountModel();

    model.actions.onSubmit();
    await waitFor(() => expect(model.state.isSaved).toBe(true));

    model.actions.onChange('assignee', 'Carlos');

    expect(model.state.isSaved).toBe(false);
  });

  it('shows the refusal of the server instead of pretending it saved', async () => {
    vi.mocked(ticketsApi.update).mockRejectedValue(
      new ApiError(403, 'Só quem gerencia alguma área deste chamado pode reclassificar ele.'),
    );
    const model = mountModel();

    model.actions.onChange('area', 'manutencao');
    model.actions.onChange('problemType', 'lighting');
    model.actions.onSubmit();

    await waitFor(() => expect(model.state.error).toMatch(/Só quem gerencia/));
    expect(model.state.isSaved).toBe(false);
  });

  it('says why a participant area could not be added', async () => {
    vi.mocked(ticketsApi.addArea).mockRejectedValue(new ApiError(403, 'Sem cargo nesta área.'));
    const model = mountModel();

    model.actions.onAddParticipantArea('sistema');

    await waitFor(() => expect(model.state.areaError).toBe('Sem cargo nesta área.'));
  });
});
