import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type FormFieldState } from '$lib/types/form-field.type';
import TicketAnswerDialog, { type TicketAnswerField } from './acerola-ticket-answer-dialog.svelte';

const field = (value: string, error: string | null = null): FormFieldState => ({ value, error });

const ticket: Ticket = {
  id: 7,
  protocol: 'CH-0007',
  status: 'open',
  priority: 'high',
  requesterName: 'Bia Costa',
  area: 'infra',
  department: 'financeiro',
  problemType: 'printer',
  participantAreas: [],
  anydeskId: '111 222 333',
  contactPhone: '62999990001',
  notifyWhatsapp: true,
  description: 'A impressora não puxa papel.',
  screenshotUrl: null,
  computerId: null,
  computerName: null,
  assignee: null,
  solution: null,
  createdAt: '2026-09-15T12:10:00.000Z',
  startedAt: null,
  resolvedAt: null,
  updatedAt: null,
  updatedBy: null,
};

const fields: Record<TicketAnswerField, FormFieldState> = {
  status: field('open'),
  priority: field('high'),
  area: field('infra'),
  problemType: field('printer'),
  computerId: field(''),
  assignee: field(''),
  solution: field(''),
};

const actions = {
  onChange: vi.fn(),
  onBlur: vi.fn(),
  onSubmit: vi.fn(),
  onClose: vi.fn(),
  onChosenFilesChange: vi.fn(),
  onAttachmentError: vi.fn(),
  onAttach: vi.fn(),
  onRemoveAttachment: vi.fn(),
  onChosenParticipantAreaChange: vi.fn(),
  onAddParticipantArea: vi.fn(),
  onRemoveParticipantArea: vi.fn(),
};

const baseData = {
  ticket,
  fields,
  whatsAppLink: null,
  machines: [],
  attachments: [],
  chosenFiles: [],
  availableParticipantAreas: [
    { value: 'sistema' as const, label: 'Sistema' },
    { value: 'manutencao' as const, label: 'Manutenção' },
  ],
  chosenParticipantArea: '' as const,
};

function setup(props: Record<string, unknown> = {}) {
  return render(TicketAnswerDialog, {
    props: {
      data: baseData,
      state: { isOpen: true },
      actions,
      ...props,
    },
  });
}

describe('AcerolaTicketAnswerDialog', () => {
  // feliz
  it('shows what the person asked for, so whoever attends can read it while answering', () => {
    setup();

    expect(screen.getByText(/CH-0007/)).toBeInTheDocument();
    expect(screen.getByText('A impressora não puxa papel.')).toBeInTheDocument();
    expect(screen.getByText(/111 222 333/)).toBeInTheDocument();
  });

  it('offers the fields the IT team fills in', () => {
    setup();

    expect(screen.getByLabelText(/quem está atendendo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/o que foi feito/i)).toBeInTheDocument();
  });

  it('asks to save when the button is pressed', async () => {
    const onSubmit = vi.fn();
    setup({ actions: { ...actions, onSubmit } });

    await userEvent.click(screen.getByRole('button', { name: /salvar atendimento/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('offers the notice link when the person asked to be warned', () => {
    setup({
      data: { ...baseData, whatsAppLink: 'https://wa.me/5562999990001?text=oi' },
    });

    expect(screen.getByRole('link', { name: /avisar no whatsapp/i })).toHaveAttribute(
      'href',
      'https://wa.me/5562999990001?text=oi',
    );
  });

  it('offers the screenshot when the ticket has one', () => {
    setup({
      data: { ...baseData, ticket: { ...ticket, screenshotUrl: 'https://x.invalid/print.png' } },
    });

    expect(screen.getByRole('link', { name: /abrir o print/i })).toBeInTheDocument();
  });

  // triste
  /* Corrigir o texto de outra pessoa apagaria o que ela de fato disse. */
  it('does not let anyone edit what the requester wrote', () => {
    setup();

    expect(screen.queryByLabelText(/descrição do problema/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/seu nome/i)).not.toBeInTheDocument();
  });

  /* Ter o telefone no chamado não é autorização para usá-lo. */
  it('hides the notice button when there is no link to offer', () => {
    setup();

    expect(screen.queryByRole('link', { name: /avisar no whatsapp/i })).not.toBeInTheDocument();
  });

  it('shows the server refusal without closing, so nothing typed is lost', () => {
    setup({
      data: { ...baseData, fields: { ...fields, solution: field('Troquei o rolete.') } },
      state: { isOpen: true, error: 'O banco recusou o valor enviado.' },
    });

    expect(screen.getByText(/o banco recusou o valor enviado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/o que foi feito/i)).toHaveValue('Troquei o rolete.');
  });

  it('blocks the fields while saving, so two clicks do not save twice', () => {
    setup({ state: { isOpen: true, isSubmitting: true } });

    expect(screen.getByLabelText(/quem está atendendo/i)).toBeDisabled();
  });

  it('says the AnyDesk was not informed instead of leaving a blank gap', () => {
    setup({
      data: { ...baseData, ticket: { ...ticket, anydeskId: null } },
    });

    /* O rótulo e o valor são elementos diferentes, então a conferência é sobre o texto
       renderizado — é o que a pessoa lê, independentemente de como foi marcado. */
    expect(document.body.textContent).toMatch(/AnyDesk\s*Não informado/);
  });

  // feliz
  it('lists the participant areas with a way to remove each one', async () => {
    const onRemoveParticipantArea = vi.fn();
    setup({
      data: { ...baseData, ticket: { ...ticket, participantAreas: ['manutencao'] } },
      actions: { ...actions, onRemoveParticipantArea },
    });

    const removeButton = screen.getByRole('button', { name: /remover manutenção/i });
    expect(removeButton).toBeInTheDocument();

    await userEvent.click(removeButton);

    expect(onRemoveParticipantArea).toHaveBeenCalledWith('manutencao');
  });

  // triste
  it('says there is no participant area yet instead of an empty gap', () => {
    setup();

    expect(screen.getByText(/nenhuma área participante ainda/i)).toBeInTheDocument();
  });
});
