import {
  ticketHistoryEffect,
  ticketHistoryEffectLabel,
  ticketHistoryTone,
  ticketHistoryTypeGroups,
  ticketHistoryTypeLabel,
  type ManualTicketHistoryType,
} from '@template/shared/domain/ticket-history.util';
import { type TicketStatus } from '@template/shared/domain/ticket-status.util';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TicketHistoryForm, {
  type AcerolaTicketHistoryFormProps,
} from './acerola-ticket-history-form.svelte';

function actions(): AcerolaTicketHistoryFormProps['actions'] {
  return {
    onTypeChange: vi.fn(),
    onChange: vi.fn(),
    onBlur: vi.fn(),
    onVisibilityChange: vi.fn(),
    onChosenFilesChange: vi.fn(),
    onAttachmentError: vi.fn(),
    onSubmit: vi.fn(),
  };
}

/* As opções saem do DOMÍNIO, como na tela de verdade: o que o chamado naquele estágio
   realmente oferece, já nos dois grupos. */
function groupsFor(status: TicketStatus): AcerolaTicketHistoryFormProps['data']['groups'] {
  const groups = ticketHistoryTypeGroups(status);
  const toOption = (type: ManualTicketHistoryType) => ({
    value: type,
    label: ticketHistoryTypeLabel(type),
    tone: ticketHistoryTone(type),
  });

  return { continuing: groups.continuing.map(toOption), closing: groups.closing.map(toOption) };
}

function dataFor(
  status: TicketStatus,
  type: ManualTicketHistoryType,
  over: Partial<AcerolaTicketHistoryFormProps['data']> = {},
): AcerolaTicketHistoryFormProps['data'] {
  return {
    type,
    groups: groupsFor(status),
    effect: ticketHistoryEffect(type),
    effectLabel: ticketHistoryEffectLabel(type),
    fields: {
      description: { value: '', error: null },
      minutesSpent: { value: '', error: null },
    },
    isVisibleToRequester: true,
    chosenFiles: [],
    ...over,
  };
}

function setup(props: Partial<AcerolaTicketHistoryFormProps> = {}) {
  const given = { data: dataFor('in_progress', 'note'), actions: actions(), ...props };
  render(TicketHistoryForm, { props: given });

  return given;
}

describe('AcerolaTicketHistoryForm', () => {
  // feliz
  /* A separação que o formulário existe para mostrar: encerrar nunca fica misturado no meio
     de registrar andamento. */
  it('shows the types in two named groups: the ones that go on and the ones that close', () => {
    setup();

    const goingOn = screen.getByRole('group', { name: 'Dar andamento' });
    const closing = screen.getByRole('group', { name: 'Encerrar o chamado' });

    expect(within(goingOn).getByRole('radio', { name: 'Andamento' })).toBeChecked();
    expect(within(goingOn).queryByRole('radio', { name: 'Solução' })).not.toBeInTheDocument();
    expect(within(closing).getByRole('radio', { name: 'Solução' })).toBeInTheDocument();
    expect(within(closing).getByRole('radio', { name: 'Encerramento com ressalva' })).toBeInTheDocument();
    expect(within(closing).getByRole('radio', { name: 'Cancelamento' })).toBeInTheDocument();
  });

  it('asks to change the type when another one is picked', async () => {
    const { actions: given } = setup();

    await userEvent.click(screen.getByRole('radio', { name: 'Solução' }));

    expect(given.onTypeChange).toHaveBeenCalledWith('resolution');
  });

  /* Encerrar é dito três vezes: no grupo, na frase e no botão. */
  it('says the ticket will be closed, in the sentence and on the button', () => {
    setup({ data: dataFor('in_progress', 'resolution') });

    expect(screen.getByText(/Encerra o chamado\. Ele sai da fila como "Resolvido"\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Encerrar chamado' })).toBeInTheDocument();
    expect(screen.getByLabelText(/o que foi feito/i)).toBeInTheDocument();
  });

  it('says the stage will change, without calling it a closing', () => {
    setup({ data: dataFor('in_progress', 'waiting_third_party') });

    expect(screen.getByText('Muda o estágio do chamado para "Aguardando terceiro".')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar histórico' })).toBeInTheDocument();
  });

  it('passes on what is typed and asks to send on submit', async () => {
    const { actions: given } = setup();

    await userEvent.type(screen.getByLabelText(/o que aconteceu/i), 'T');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar histórico' }));

    expect(given.onChange).toHaveBeenCalledWith('description', 'T');
    expect(given.onSubmit).toHaveBeenCalledOnce();
  });

  it('lets the history be hidden from who opened the ticket', async () => {
    const { actions: given } = setup();

    await userEvent.click(screen.getByRole('checkbox', { name: /quem abriu o chamado pode ver/i }));

    expect(given.onVisibilityChange).toHaveBeenCalledWith(false);
  });

  // triste
  it('does not announce a closing for a plain progress note', () => {
    setup();

    expect(screen.queryByRole('button', { name: 'Encerrar chamado' })).not.toBeInTheDocument();
    expect(screen.getByText(/Não muda o estágio do chamado/)).toBeInTheDocument();
  });

  /* Num chamado encerrado só cabe a reabertura — e não existe grupo de encerrar de novo. */
  it('offers only the reopening on a closed ticket', () => {
    setup({ data: dataFor('resolved', 'reopening') });

    expect(screen.getAllByRole('radio')).toHaveLength(1);
    expect(screen.getByRole('radio', { name: 'Reabertura' })).toBeChecked();
    expect(screen.queryByRole('group', { name: 'Encerrar o chamado' })).not.toBeInTheDocument();
  });

  it('does not offer the start on a ticket that was already picked up', () => {
    setup();

    expect(screen.queryByRole('radio', { name: 'Início do atendimento' })).not.toBeInTheDocument();
  });

  it('shows the error under the field it belongs to', () => {
    setup({
      data: dataFor('in_progress', 'note', {
        fields: {
          description: { value: '', error: 'Descreva o que aconteceu' },
          minutesSpent: { value: 'dez', error: 'Informe o tempo em minutos inteiros' },
        },
      }),
    });

    expect(screen.getByText('Descreva o que aconteceu')).toBeInTheDocument();
    expect(screen.getByText('Informe o tempo em minutos inteiros')).toBeInTheDocument();
  });

  it('shows the refusal of the server inside the form', () => {
    setup({
      state: { error: 'Só quem administra alguma área deste chamado pode encerrá-lo ou reabri-lo.' },
    });

    expect(screen.getByText(/Só quem administra alguma área/)).toBeInTheDocument();
  });

  it('locks every choice while it is being sent', () => {
    setup({ state: { isSubmitting: true } });

    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /quem abriu o chamado pode ver/i })).toBeDisabled();
  });
});
