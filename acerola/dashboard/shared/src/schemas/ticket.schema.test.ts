import { describe, expect, it } from 'vitest';

import {
  createTicketSchema,
  publicTicketSchema,
  ticketFormSchema,
  ticketListQuerySchema,
  updateTicketSchema,
} from './ticket.schema';

const validInput = {
  requesterName: 'Ana Souza',
  department: 'financeiro',
  problemType: 'printer',
  contactPhone: '62 99999-9999',
  description: 'A impressora da sala não puxa papel.',
};

describe('createTicketSchema', () => {
  // feliz
  it('accepts a ticket with the required fields only', () => {
    const parsed = createTicketSchema.parse(validInput);

    expect(parsed.requesterName).toBe('Ana Souza');
    expect(parsed.department).toBe('financeiro');
  });

  it('opens with medium urgency when nobody chose one', () => {
    expect(createTicketSchema.parse(validInput).priority).toBe('medium');
  });

  it('does not sign anyone up for WhatsApp notices by default', () => {
    expect(createTicketSchema.parse(validInput).notifyWhatsapp).toBe(false);
  });

  it('reads the checkbox sent as text by a multipart form', () => {
    const parsed = createTicketSchema.parse({ ...validInput, notifyWhatsapp: 'true' });

    expect(parsed.notifyWhatsapp).toBe(true);
  });

  it('trims the name before storing it', () => {
    const parsed = createTicketSchema.parse({ ...validInput, requesterName: '  Ana Souza  ' });

    expect(parsed.requesterName).toBe('Ana Souza');
  });

  // triste
  it('refuses a name made only of spaces', () => {
    const result = createTicketSchema.safeParse({ ...validInput, requesterName: '   ' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Informe seu nome');
  });

  it('refuses an empty description', () => {
    const result = createTicketSchema.safeParse({ ...validInput, description: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Descreva o problema');
  });

  it('refuses a phone without area code', () => {
    const result = createTicketSchema.safeParse({ ...validInput, contactPhone: '99999-9999' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Informe o WhatsApp com DDD');
  });

  it('accepts a phone typed with no punctuation at all', () => {
    expect(createTicketSchema.safeParse({ ...validInput, contactPhone: '62999999999' }).success).toBe(
      true,
    );
  });

  it('refuses a department that is not on the list, in Portuguese', () => {
    const result = createTicketSchema.safeParse({ ...validInput, department: 'MARKETING' });

    expect(result.success).toBe(false);
    /* O texto padrão do Zod é inglês e enumera as chaves internas; ele chegaria ao rodapé
       do campo, onde a régua do projeto exige português (CONTRIBUTING §1). */
    expect(result.error?.issues[0]?.message).toBe('Escolha seu departamento');
  });

  it('refuses a problem type that is not on the list, in Portuguese', () => {
    const result = createTicketSchema.safeParse({ ...validInput, problemType: 'ovni' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Escolha o tipo de problema');
  });

  it('refuses a description longer than the limit', () => {
    const result = createTicketSchema.safeParse({ ...validInput, description: 'a'.repeat(5001) });

    expect(result.success).toBe(false);
  });

  it('ignores the status sent in the body, so nobody opens an already resolved ticket', () => {
    const parsed = createTicketSchema.parse({ ...validInput, status: 'resolved' });

    expect(parsed).not.toHaveProperty('status');
  });

  it('ignores an assignee sent in the body, because that belongs to the IT panel', () => {
    const parsed = createTicketSchema.parse({ ...validInput, assignee: 'Alguém' });

    expect(parsed).not.toHaveProperty('assignee');
  });
});

describe('ticketFormSchema', () => {
  // feliz
  it('accepts the form shape, where optional text is an empty string', () => {
    const result = ticketFormSchema.safeParse({
      ...validInput,
      anydeskId: '',
      priority: 'high',
      notifyWhatsapp: true,
    });

    expect(result.success).toBe(true);
  });

  // triste
  it('shows the same message the API would return for a missing name', () => {
    const result = ticketFormSchema.safeParse({
      ...validInput,
      requesterName: '',
      anydeskId: '',
      priority: 'high',
      notifyWhatsapp: false,
    });

    expect(result.error?.issues[0]?.message).toBe('Informe seu nome');
  });
});

describe('publicTicketSchema', () => {
  const stored = {
    id: 7,
    protocol: 'CH-0007',
    status: 'in_progress' as const,
    priority: 'high' as const,
    requesterName: 'Ana Souza',
    department: 'financeiro' as const,
    problemType: 'printer' as const,
    anydeskId: null,
    contactPhone: '62999999999',
    notifyWhatsapp: true,
    description: 'A impressora da sala não puxa papel.',
    screenshotUrl: null,
    assignee: 'Carlos do TI',
    solution: 'Troquei o rolete.',
    createdAt: '2026-03-01T08:00:00.000Z',
    startedAt: null,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
  };

  // feliz
  it('keeps what the person needs to follow their own request', () => {
    const parsed = publicTicketSchema.parse(stored);

    expect(parsed.protocol).toBe('CH-0007');
    expect(parsed.status).toBe('in_progress');
  });

  // triste
  it('never exposes the contact phone, the assignee or the solution on a public lookup', () => {
    const parsed = publicTicketSchema.parse(stored);

    expect(parsed).not.toHaveProperty('contactPhone');
    expect(parsed).not.toHaveProperty('assignee');
    expect(parsed).not.toHaveProperty('solution');
  });
});

describe('updateTicketSchema', () => {
  // feliz
  it('accepts changing only the status', () => {
    expect(updateTicketSchema.parse({ status: 'resolved' })).toEqual({ status: 'resolved' });
  });

  it('turns an emptied solution into null, so the field is actually cleared', () => {
    expect(updateTicketSchema.parse({ solution: '   ' }).solution).toBeNull();
  });

  it('accepts an empty change without touching anything', () => {
    expect(updateTicketSchema.parse({})).toEqual({});
  });

  // triste
  it('refuses an unknown status, in Portuguese', () => {
    const result = updateTicketSchema.safeParse({ status: 'arquivado' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Escolha uma situação da lista');
  });

  it('refuses changing who opened the ticket', () => {
    const parsed = updateTicketSchema.parse({ requesterName: 'Outra pessoa' });

    expect(parsed).not.toHaveProperty('requesterName');
  });
});

describe('ticketListQuerySchema', () => {
  // feliz
  it('fills in the default page when the screen sends no filter', () => {
    const parsed = ticketListQuerySchema.parse({});

    expect(parsed.page).toBe(1);
    expect(parsed.status).toBeUndefined();
  });

  it('accepts the panel filters together', () => {
    const parsed = ticketListQuerySchema.parse({
      status: 'open',
      priority: 'high',
      department: 'rh',
      problemType: 'network',
      search: '  impressora  ',
    });

    expect(parsed.search).toBe('impressora');
    expect(parsed.department).toBe('rh');
  });

  // triste
  it('refuses a page size above the ceiling, which would hang the screen and the database', () => {
    expect(ticketListQuerySchema.safeParse({ pageSize: 5000 }).success).toBe(false);
  });
});
