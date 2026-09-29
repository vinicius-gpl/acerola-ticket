import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-open-ticket-harness.test.svelte';
import { type OpenTicketModel } from './use-open-ticket.svelte';

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: { create: vi.fn() },
}));

const { ticketsApi } = await import('$lib/api/tickets.api');

function ticket(over: Partial<Ticket> = {}): Ticket {
  return {
    id: 22,
    protocol: 'CH-0022',
    status: 'open',
    priority: 'medium',
    requesterName: 'Ana Souza',
    department: 'contabil',
    problemType: 'network',
    computerId: null,
    computerName: null,
    anydeskId: null,
    contactPhone: null,
    notifyWhatsapp: false,
    description: 'A internet caiu na minha sala.',
    screenshotUrl: null,
    answer: null,
    answeredBy: null,
    resolvedAt: null,
    createdAt: '2026-09-23T12:00:00.000Z',
    updatedAt: '2026-09-23T12:00:00.000Z',
    ...over,
  } as Ticket;
}

function mountModel(): OpenTicketModel {
  let model!: OpenTicketModel;
  render(Harness, { props: { onReady: (ready: OpenTicketModel) => (model = ready) } });

  return model;
}

/**
 * O mínimo que o schema compartilhado aceita.
 *
 * O telefone entra porque ele é EXIGIDO: é como o TI retorna quando o chamado precisa de
 * conversa (ver `phone.util`). Departamento, tipo e urgência já nascem preenchidos.
 */
async function fillMinimum(model: OpenTicketModel): Promise<void> {
  model.actions.onChange('requesterName', 'Ana Souza');
  model.actions.onChange('contactPhone', '11 98765-4321');
  model.actions.onChange('description', 'A internet caiu na minha sala.');
  await waitFor(() => expect(model.data.fields.description.error).toBeNull());
}

describe('useOpenTicketModel', () => {
  beforeEach(() => {
    vi.mocked(ticketsApi.create).mockReset();
    vi.mocked(ticketsApi.create).mockResolvedValue(ticket());
  });

  // feliz
  /**
   * O protocolo é o ÚNICO dado que a pessoa precisa guardar, e por isso a tela troca de
   * assunto depois de abrir, em vez de mostrar um aviso que some em três segundos.
   */
  it('shows the protocol after the ticket was opened', async () => {
    const model = mountModel();

    await fillMinimum(model);
    model.actions.onSubmit();

    await waitFor(() => expect(model.data.opened?.protocol).toBe('CH-0022'));
  });

  it('sends the screenshot and the attachments together with the ticket', async () => {
    const model = mountModel();
    const screenshot = new File(['x'], 'print.png', { type: 'image/png' });
    const attachment = new File(['y'], 'nota.pdf', { type: 'application/pdf' });

    model.actions.onScreenshotChange(screenshot);
    model.actions.onAttachmentsChange([attachment]);
    await fillMinimum(model);
    model.actions.onSubmit();

    await waitFor(() => expect(ticketsApi.create).toHaveBeenCalled());
    expect(vi.mocked(ticketsApi.create).mock.calls[0]?.[1]).toBe(screenshot);
    expect(vi.mocked(ticketsApi.create).mock.calls[0]?.[2]).toEqual([attachment]);
    expect(model.data.screenshotName).toBe('print.png');
  });

  /* O link de WhatsApp só existe quando a pessoa PEDIU para ser avisada: ter o telefone não
     autoriza usá-lo. */
  it('offers the WhatsApp link when the person asked to be notified', async () => {
    vi.mocked(ticketsApi.create).mockResolvedValue(
      ticket({ notifyWhatsapp: true, contactPhone: '11987654321' }),
    );
    const model = mountModel();

    await fillMinimum(model);
    model.actions.onSubmit();

    await waitFor(() => expect(model.data.opened?.whatsAppLink).toContain('5511987654321'));
    expect(model.data.opened?.whatsAppLink).toContain('CH-0022');
  });

  it('offers no WhatsApp link when the person did not ask to be notified', async () => {
    const model = mountModel();

    await fillMinimum(model);
    model.actions.onSubmit();

    await waitFor(() => expect(model.data.opened).not.toBeNull());
    expect(model.data.opened?.whatsAppLink).toBeNull();
  });

  /* Abrir outro é um formulário NOVO: reaproveitar os valores do anterior faria a pessoa
     abrir sem querer o mesmo chamado duas vezes. */
  it('starts a blank form when the person opens another ticket', async () => {
    const model = mountModel();

    model.actions.onScreenshotChange(new File(['x'], 'print.png', { type: 'image/png' }));
    model.actions.onAttachmentsChange([new File(['y'], 'nota.pdf', { type: 'application/pdf' })]);
    await fillMinimum(model);
    model.actions.onSubmit();
    await waitFor(() => expect(model.data.opened).not.toBeNull());

    model.actions.onOpenAnother();

    await waitFor(() => expect(model.data.opened).toBeNull());
    expect(model.data.fields.requesterName.value).toBe('');
    expect(model.data.screenshotName).toBeNull();
    expect(model.data.attachments).toEqual([]);
  });

  // triste
  /* As MESMAS regras do servidor, aqui: um formulário vazio não chega a virar requisição. */
  it('does not open a ticket with an empty form', async () => {
    const model = mountModel();

    model.actions.onSubmit();

    await waitFor(() => expect(model.data.fields.requesterName.error).not.toBeNull());
    expect(ticketsApi.create).not.toHaveBeenCalled();
  });

  /* A recusa aparece na tela, e o formulário continua aberto com o que foi digitado
     (CONTRIBUTING §15). */
  it('keeps the refusal on screen and does not swap to the protocol', async () => {
    vi.mocked(ticketsApi.create).mockRejectedValue(
      new ApiError(422, 'O arquivo enviado é maior do que o permitido.'),
    );
    const model = mountModel();

    await fillMinimum(model);
    model.actions.onSubmit();

    await waitFor(() =>
      expect(model.state.error).toBe('O arquivo enviado é maior do que o permitido.'),
    );
    expect(model.data.opened).toBeNull();
    expect(model.data.fields.requesterName.value).toBe('Ana Souza');
  });

  /**
   * A recusa da ESCOLHA do arquivo é separada da falha de ENVIAR.
   *
   * Uma é sobre o arquivo ("PDF só até 10 MB"), a outra é sobre a rede. Misturá-las faria a
   * tela dizer a coisa errada — e a pessoa trocar o arquivo por causa de um problema de
   * internet.
   */
  it('keeps the file refusal apart from the sending failure', async () => {
    const model = mountModel();

    model.actions.onAttachmentError('Cada PDF pode ter até 10 MB.');

    await waitFor(() => expect(model.state.attachmentError).toBe('Cada PDF pode ter até 10 MB.'));
    expect(model.state.error).toBeNull();
  });

  it('clears the file refusal when the person picks another file (edge case)', async () => {
    const model = mountModel();

    model.actions.onAttachmentError('Cada PDF pode ter até 10 MB.');
    await waitFor(() => expect(model.state.attachmentError).not.toBeNull());

    model.actions.onAttachmentError(null);

    await waitFor(() => expect(model.state.attachmentError).toBeNull());
  });
});
