import { type TicketAttachment } from '@template/shared/schemas/ticket-attachment.schema';
import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-ticket-answer-harness.test.svelte';
import { type TicketAnswerModel } from './use-ticket-answer.svelte';

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: {
    update: vi.fn(),
    attachments: vi.fn(),
    attach: vi.fn(),
    removeAttachment: vi.fn(),
  },
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
    status: 'open',
    priority: 'high',
    requesterName: 'Ana Souza',
    department: 'contabil',
    problemType: 'network',
    computerId: null,
    computerName: null,
    anydeskId: null,
    contactPhone: '11987654321',
    notifyWhatsapp: false,
    description: 'A internet caiu na minha sala.',
    screenshotUrl: null,
    assignee: null,
    solution: null,
    answeredBy: null,
    resolvedAt: null,
    createdAt: '2026-09-23T12:00:00.000Z',
    updatedAt: '2026-09-23T12:00:00.000Z',
    ...over,
  } as Ticket;
}

function attachment(over: Partial<TicketAttachment> = {}): TicketAttachment {
  return {
    id: 5,
    ticketId: 22,
    fileName: 'nota.pdf',
    contentType: 'application/pdf',
    sizeBytes: 1024,
    url: 'https://exemplo/nota.pdf',
    createdAt: '2026-09-23T12:00:00.000Z',
    ...over,
  } as TicketAttachment;
}

function mountModel(current: Ticket = ticket(), onSaved = vi.fn()): TicketAnswerModel {
  let model!: TicketAnswerModel;
  render(Harness, {
    props: {
      ticket: current,
      onSaved,
      onReady: (ready: TicketAnswerModel) => (model = ready),
    },
  });

  return model;
}

describe('useTicketAnswerModel', () => {
  beforeEach(() => {
    vi.mocked(ticketsApi.update).mockReset();
    vi.mocked(ticketsApi.update).mockResolvedValue(ticket());
    vi.mocked(ticketsApi.attachments).mockResolvedValue([]);
    vi.mocked(ticketsApi.attach).mockReset();
    vi.mocked(ticketsApi.attach).mockResolvedValue([]);
    vi.mocked(ticketsApi.removeAttachment).mockReset();
    vi.mocked(ticketsApi.removeAttachment).mockResolvedValue(undefined as never);
    vi.mocked(computersApi.list).mockResolvedValue({
      items: [{ id: 3, name: 'CONTABIL-03', displayName: 'Máquina da Ana' }],
      page: 1,
      pageSize: 200,
      total: 1,
    } as never);
  });

  // feliz
  it('starts the form with what the ticket already says', () => {
    const model = mountModel(ticket({ assignee: 'Carlos', priority: 'high' }));

    expect(model.data.fields.status.value).toBe('open');
    expect(model.data.fields.priority.value).toBe('high');
    expect(model.data.fields.assignee.value).toBe('Carlos');
  });

  it('saves what was answered and tells the screen it can close', async () => {
    const onSaved = vi.fn();
    const model = mountModel(ticket(), onSaved);

    model.actions.onChange('status', 'resolved');
    model.actions.onChange('solution', 'Troquei o cabo de rede.');
    model.actions.onSubmit();

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(ticketsApi.update).toHaveBeenCalledWith(
      22,
      expect.objectContaining({ status: 'resolved', solution: 'Troquei o cabo de rede.' }),
    );
  });

  /**
   * Vazio DESVINCULA a máquina, e não "não mexe nela".
   *
   * `null` e "não mandar o campo" são coisas diferentes no contrato: um desfaz o vínculo, o
   * outro o mantém. Trocar um pelo outro aqui deixaria a máquina errada presa ao chamado
   * para sempre.
   */
  it('turns the chosen machine into a number, and no machine into a null', async () => {
    const model = mountModel(ticket({ computerId: 3 }));

    model.actions.onChange('computerId', '');
    model.actions.onSubmit();

    await waitFor(() => expect(ticketsApi.update).toHaveBeenCalled());
    expect(vi.mocked(ticketsApi.update).mock.calls[0]?.[1]).toMatchObject({ computerId: null });
  });

  it('sends the machine as a number when one was chosen', async () => {
    const model = mountModel();

    model.actions.onChange('computerId', '3');
    model.actions.onSubmit();

    await waitFor(() => expect(ticketsApi.update).toHaveBeenCalled());
    expect(vi.mocked(ticketsApi.update).mock.calls[0]?.[1]).toMatchObject({ computerId: 3 });
  });

  it('offers the machines of the inventory, with the nickname in front of the name', async () => {
    const model = mountModel();

    await waitFor(() => expect(model.data.machines).toHaveLength(1));
    expect(model.data.machines[0]).toEqual({
      value: '3',
      label: 'Máquina da Ana (CONTABIL-03)',
    });
  });

  /* O texto do aviso acompanha o que quem atende ACABOU de escolher, e não o que está salvo:
     senão o WhatsApp sairia dizendo "aberto" de um chamado que virou resolvido. */
  it('writes the notice with the status that was just chosen', async () => {
    const model = mountModel(ticket({ notifyWhatsapp: true }));

    expect(model.data.whatsAppLink).toContain('Aberto');

    model.actions.onChange('status', 'resolved');

    await waitFor(() => expect(model.data.whatsAppLink).toContain('Resolvido'));
  });

  it('attaches the chosen files and clears the choice afterwards', async () => {
    const model = mountModel();
    const file = new File(['x'], 'nota.pdf', { type: 'application/pdf' });

    model.actions.onChosenFilesChange([file]);
    await waitFor(() => expect(model.data.chosenFiles).toHaveLength(1));

    model.actions.onAttach();

    await waitFor(() => expect(ticketsApi.attach).toHaveBeenCalledWith(22, [file]));
    await waitFor(() => expect(model.data.chosenFiles).toEqual([]));
  });

  /* A linha do anexo que está sendo excluído trava sozinha — a lista inteira continua viva. */
  it('marks only the attachment being removed', async () => {
    const model = mountModel();

    model.actions.onRemoveAttachment(attachment({ id: 5 }));

    expect(model.state.removingAttachmentId).toBe(5);
    await waitFor(() => expect(ticketsApi.removeAttachment).toHaveBeenCalledWith(22, 5));
    await waitFor(() => expect(model.state.removingAttachmentId).toBeNull());
  });

  // triste
  /* Nada que identifique quem abriu é editável por aqui: corrigir o nome de um chamado alheio
     apagaria o que a pessoa de fato escreveu. */
  it('never sends anything that identifies who opened the ticket', async () => {
    const model = mountModel();

    model.actions.onChange('status', 'in_progress');
    model.actions.onSubmit();

    await waitFor(() => expect(ticketsApi.update).toHaveBeenCalled());

    const sent = vi.mocked(ticketsApi.update).mock.calls[0]?.[1] ?? {};

    expect(sent).not.toHaveProperty('requesterName');
    expect(sent).not.toHaveProperty('contactPhone');
    expect(sent).not.toHaveProperty('description');
  });

  /* A recusa do servidor aparece no formulário, que continua aberto com o que foi digitado. */
  it('keeps the server refusal on screen and does not close', async () => {
    vi.mocked(ticketsApi.update).mockRejectedValue(
      new ApiError(403, 'Seu perfil é somente leitura.'),
    );
    const onSaved = vi.fn();
    const model = mountModel(ticket(), onSaved);

    model.actions.onChange('solution', 'Troquei o cabo.');
    model.actions.onSubmit();

    await waitFor(() => expect(model.state.error).toBe('Seu perfil é somente leitura.'));
    expect(onSaved).not.toHaveBeenCalled();
    expect(model.data.fields.solution.value).toBe('Troquei o cabo.');
  });

  /* Ter o telefone no chamado não é autorização para usá-lo: sem o pedido, não há link. */
  it('offers no notice when the person did not ask to be warned', () => {
    const model = mountModel(ticket({ notifyWhatsapp: false }));

    expect(model.data.whatsAppLink).toBeNull();
  });

  /* Mandar guardar sem ter escolhido nada seria uma requisição vazia. */
  it('does not attach anything when no file was chosen (edge case)', () => {
    const model = mountModel();

    model.actions.onAttach();

    expect(ticketsApi.attach).not.toHaveBeenCalled();
  });

  /**
   * A recusa da ESCOLHA e a da GRAVAÇÃO aparecem no mesmo lugar — para quem está olhando, as
   * duas respondem "por que meu arquivo não entrou?" — mas nenhuma das duas se mistura com o
   * erro do formulário.
   */
  it('keeps the file refusal apart from the form refusal', async () => {
    const model = mountModel();

    model.actions.onAttachmentError('Cada PDF pode ter até 10 MB.');

    await waitFor(() => expect(model.state.attachmentError).toBe('Cada PDF pode ter até 10 MB.'));
    expect(model.state.error).toBeNull();
  });

  it('shows the refusal of saving an attachment in the same place (edge case)', async () => {
    vi.mocked(ticketsApi.attach).mockRejectedValue(new ApiError(503, 'O armazenamento caiu.'));
    const model = mountModel();

    model.actions.onChosenFilesChange([new File(['x'], 'nota.pdf', { type: 'application/pdf' })]);
    await waitFor(() => expect(model.data.chosenFiles).toHaveLength(1));
    model.actions.onAttach();

    await waitFor(() => expect(model.state.attachmentError).toBe('O armazenamento caiu.'));
    expect(model.state.error).toBeNull();
  });
});
