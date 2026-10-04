import { describe, expect, it } from 'vitest';

import {
  createTicketHistorySchema,
  HISTORY_DESCRIPTION_MAX_LENGTH,
  HISTORY_MINUTES_MAX,
  publicTicketHistorySchema,
  ticketHistoryFormSchema,
} from './ticket-history.schema';

describe('createTicketHistorySchema', () => {
  // feliz
  it('accepts a history with only the type and what happened', () => {
    const parsed = createTicketHistorySchema.parse({
      type: 'note',
      description: '  Troquei o cabo de rede e testei.  ',
    });

    expect(parsed.description).toBe('Troquei o cabo de rede e testei.');
    /* Ausente é visível: o padrão é a pessoa acompanhar o pedido dela. */
    expect(parsed.isVisibleToRequester).toBe(true);
  });

  /* Num envio com arquivos (multipart) todo campo chega como texto. */
  it('reads the fields that arrive as text in a multipart request', () => {
    const parsed = createTicketHistorySchema.parse({
      type: 'waiting_third_party',
      description: 'Aguardando a fonte nova chegar.',
      isVisibleToRequester: 'false',
      minutesSpent: '45',
    });

    expect(parsed.isVisibleToRequester).toBe(false);
    expect(parsed.minutesSpent).toBe(45);
  });

  it('treats an empty time as not informed', () => {
    const parsed = createTicketHistorySchema.parse({
      type: 'note',
      description: 'Liguei para o fornecedor.',
      minutesSpent: '',
    });

    expect(parsed.minutesSpent).toBeNull();
  });

  // triste
  it('refuses a history without a description, in Portuguese', () => {
    const result = createTicketHistorySchema.safeParse({ type: 'resolution', description: '   ' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Descreva o que aconteceu');
  });

  /* Abertura e alteração de dados são do sistema: não entram pelo formulário. */
  it('refuses the system types', () => {
    for (const type of ['opening', 'update']) {
      const result = createTicketHistorySchema.safeParse({ type, description: 'x' });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe('Escolha o tipo de histórico');
    }
  });

  it('refuses a description that is too long and a time that makes no sense', () => {
    const tooLong = createTicketHistorySchema.safeParse({
      type: 'note',
      description: 'a'.repeat(HISTORY_DESCRIPTION_MAX_LENGTH + 1),
    });
    expect(tooLong.success).toBe(false);

    for (const minutesSpent of ['-5', '1.5', 'meia hora', String(HISTORY_MINUTES_MAX + 1)]) {
      const result = createTicketHistorySchema.safeParse({
        type: 'note',
        description: 'x',
        minutesSpent,
      });

      expect(result.success, minutesSpent).toBe(false);
    }
  });
});

describe('ticketHistoryFormSchema', () => {
  // feliz
  it('accepts the form with the time left empty', () => {
    const result = ticketHistoryFormSchema.safeParse({
      type: 'start',
      description: 'Assumi o chamado.',
      isVisibleToRequester: true,
      minutesSpent: '',
    });

    expect(result.success).toBe(true);
  });

  // triste
  it('shows the same messages the API would return', () => {
    const result = ticketHistoryFormSchema.safeParse({
      type: 'note',
      description: '',
      isVisibleToRequester: true,
      minutesSpent: 'dez',
    });

    const messages = result.error?.issues.map((issue) => issue.message) ?? [];
    expect(messages).toContain('Descreva o que aconteceu');
    expect(messages).toContain('Informe o tempo em minutos inteiros');
  });
});

describe('publicTicketHistorySchema', () => {
  // triste
  /* Quem consulta pelo protocolo não vê a identidade de quem escreveu nem o tempo gasto. */
  it('leaves out the author identity and the time spent', () => {
    const parsed = publicTicketHistorySchema.parse({
      id: 1,
      ticketId: 9,
      type: 'note',
      description: 'Peça pedida ao fornecedor.',
      statusAfter: 'waiting_third_party',
      isVisibleToRequester: true,
      minutesSpent: 20,
      authorName: 'Suporte TI',
      createdBy: 'suporte@empresa.com.br',
      createdAt: '2026-09-15T12:10:00.000Z',
      attachments: [],
    });

    expect(parsed).not.toHaveProperty('createdBy');
    expect(parsed).not.toHaveProperty('minutesSpent');
    expect(parsed).not.toHaveProperty('isVisibleToRequester');
    expect(parsed.authorName).toBe('Suporte TI');
  });
});
