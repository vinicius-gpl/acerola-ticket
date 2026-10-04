import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { TICKET_PRIORITY_LABELS } from '@template/shared/domain/ticket-status.util';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TicketDataForm, { type AcerolaTicketDataFormProps } from './acerola-ticket-data-form.svelte';

const ticket: Ticket = {
  id: 28,
  protocol: 'CH-0028',
  status: 'in_progress',
  priority: 'high',
  requesterName: 'Priscila Azevedo',
  area: 'infra',
  department: 'fiscal',
  problemType: 'other',
  participantAreas: [],
  computerId: null,
  computerName: null,
  anydeskId: null,
  contactPhone: '62999990028',
  notifyWhatsapp: true,
  description: 'O computador não liga.',
  screenshotUrl: null,
  assignee: 'Suporte TI',
  solution: null,
  createdAt: '2026-09-23T11:00:00.000Z',
  startedAt: '2026-09-23T11:40:00.000Z',
  resolvedAt: null,
  updatedAt: null,
  updatedBy: null,
};

function data(over: Partial<AcerolaTicketDataFormProps['data']> = {}): AcerolaTicketDataFormProps['data'] {
  return {
    ticket,
    fields: {
      priority: { value: 'high', error: null },
      area: { value: 'infra', error: null },
      problemType: { value: 'other', error: null },
      computerId: { value: '', error: null },
    },
    machines: [{ value: '3', label: 'FISCAL-02' }],
    availableParticipantAreas: [
      { value: 'sistema', label: 'Sistema' },
      { value: 'manutencao', label: 'Manutenção' },
    ],
    ...over,
  };
}

function actions(): AcerolaTicketDataFormProps['actions'] {
  return {
    onChange: vi.fn(),
    onBlur: vi.fn(),
    onSubmit: vi.fn(),
    onAddParticipantArea: vi.fn(),
    onRemoveParticipantArea: vi.fn(),
  };
}

function setup(props: Partial<AcerolaTicketDataFormProps> = {}) {
  const given = { data: data(), actions: actions(), ...props };
  render(TicketDataForm, { props: given });

  return given;
}

describe('AcerolaTicketDataForm', () => {
  // feliz
  it('shows the data of the ticket, ready to be corrected', () => {
    setup();

    expect(screen.getByText('Urgência')).toBeInTheDocument();
    expect(screen.getByText('Área')).toBeInTheDocument();
    expect(screen.getByText('Tipo do problema')).toBeInTheDocument();
    expect(screen.getByText('Máquina')).toBeInTheDocument();
  });

  it('passes on what is chosen and asks to save on submit', async () => {
    const { actions: given } = setup();

    await userEvent.click(screen.getByRole('button', { name: TICKET_PRIORITY_LABELS.low }));
    await userEvent.click(screen.getByRole('button', { name: /salvar dados/i }));

    expect(given.onChange).toHaveBeenCalledWith('priority', 'low');
    expect(given.onSubmit).toHaveBeenCalledOnce();
  });

  it('confirms the data was saved', () => {
    setup({ state: { isSaved: true } });

    expect(screen.getByRole('status')).toHaveTextContent('Dados salvos.');
  });

  it('lists the participant areas and lets one be removed', async () => {
    const { actions: given } = setup({
      data: data({ ticket: { ...ticket, participantAreas: ['manutencao'] } }),
    });

    await userEvent.click(screen.getByRole('button', { name: /remover .* do chamado/i }));

    expect(given.onRemoveParticipantArea).toHaveBeenCalledWith('manutencao');
  });

  /* Um clique na área adiciona — sem escolher primeiro e confirmar depois. */
  it('adds a participant area with a single click on it', async () => {
    const { actions: given } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar Sistema ao chamado' }));

    expect(given.onAddParticipantArea).toHaveBeenCalledWith('sistema');
  });

  // triste
  /* O estágio só muda lançando um histórico: este formulário não tem campo para ele. */
  it('has no field to change the stage of the ticket', () => {
    setup();

    expect(screen.queryByText(/situação/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/estágio/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/o que foi feito/i)).not.toBeInTheDocument();
  });

  /* Dois cliques seguidos não podem virar dois pedidos: enquanto uma área entra, as outras
     esperam. */
  it('locks the areas that can still be added while one is being added', () => {
    setup({ state: { isAddingArea: true } });

    for (const button of screen.getAllByRole('button', { name: /adicionar .* ao chamado/i }))
      expect(button).toBeDisabled();
  });

  it('offers nothing to add when every area already takes part', () => {
    setup({ data: data({ availableParticipantAreas: [] }) });

    expect(screen.queryByRole('button', { name: /adicionar .* ao chamado/i })).not.toBeInTheDocument();
  });

  it('says there is no participant area instead of showing an empty list', () => {
    setup();

    expect(screen.getByText(/nenhuma área participante ainda/i)).toBeInTheDocument();
  });

  it('does not say it was saved when it was not', () => {
    setup();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the refusal of the server and the failure of an area, each in its place', () => {
    setup({
      state: {
        error: 'Só quem gerencia alguma área deste chamado pode reclassificar ele.',
        areaError: 'Não consegui adicionar a área.',
      },
    });

    expect(screen.getByText(/Só quem gerencia alguma área/)).toBeInTheDocument();
    expect(screen.getByText('Não consegui adicionar a área.')).toBeInTheDocument();
  });

  /* O responsável não se troca à mão: quem assume o chamado vira responsável ao lançar o
     primeiro histórico. Aqui não há campo para ele. */
  it('has no field to change who is responsible for the ticket', () => {
    setup();

    expect(screen.queryByLabelText(/responsável/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Responsável')).not.toBeInTheDocument();
  });
});
