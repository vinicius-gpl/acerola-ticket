import { describe, expect, it } from 'vitest';

import {
  createTicketSchema,
  publicTicketSchema,
  ticketFormSchema,
  ticketListQuerySchema,
  ticketReportQuerySchema,
  updateTicketSchema,
} from './ticket.schema';

const validInput = {
  requesterName: 'Ana Souza',
  area: 'infra',
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

  it('requires and converts the selected system for a system ticket', () => {
    const parsed = createTicketSchema.parse({
      ...validInput,
      area: 'sistema',
      problemType: 'bug',
      projectId: '3',
    });
    expect(parsed.projectId).toBe(3);
  });

  it('refuses a system ticket without a selected repository', () => {
    const result = createTicketSchema.safeParse({
      ...validInput,
      area: 'sistema',
      problemType: 'bug',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.includes('projectId'))).toBe(true);
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
    expect(
      createTicketSchema.safeParse({ ...validInput, contactPhone: '62999999999' }).success,
    ).toBe(true);
  });

  /* Contar dígitos com `\D` some com letra no meio: "62abc9999999" tinha dígitos de sobra e
     passava, mesmo não sendo um telefone de verdade. */
  it('refuses a phone with a letter in it, even with enough digits', () => {
    const result = createTicketSchema.safeParse({ ...validInput, contactPhone: '62abc9999999' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'O WhatsApp só pode ter números, espaço, parênteses e traço',
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

  it('refuses an area that is not on the list, in Portuguese', () => {
    const result = createTicketSchema.safeParse({ ...validInput, area: 'financeiro' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Escolha a área do chamado');
  });

  // feliz
  it('accepts a problem type from the chosen area', () => {
    const parsed = createTicketSchema.parse({
      ...validInput,
      area: 'manutencao',
      problemType: 'air_conditioning',
    });

    expect(parsed.area).toBe('manutencao');
  });

  // triste
  it('refuses a problem type from another area, even though it exists on the full list', () => {
    const result = createTicketSchema.safeParse({
      ...validInput,
      area: 'manutencao',
      /* "printer" existe — só que em Infra, não em Manutenção. */
      problemType: 'printer',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'Escolha um tipo de problema da área selecionada',
    );
    expect(result.error?.issues[0]?.path).toEqual(['problemType']);
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

  it('shows the same cross-area message the API would return', () => {
    const result = ticketFormSchema.safeParse({
      ...validInput,
      area: 'sistema',
      problemType: 'printer',
      anydeskId: '',
      priority: 'high',
      notifyWhatsapp: false,
    });

    expect(result.error?.issues[0]?.message).toBe(
      'Escolha um tipo de problema da área selecionada',
    );
  });
});

describe('publicTicketSchema', () => {
  const stored = {
    id: 7,
    protocol: 'CH-0007',
    status: 'in_progress' as const,
    priority: 'high' as const,
    requesterName: 'Ana Souza',
    area: 'infra' as const,
    department: 'financeiro' as const,
    problemType: 'printer' as const,
    participantAreas: [],
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
    attachments: [],
    histories: [],
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

  /**
   * Os arquivos SAEM na consulta pública, OS DOIS LADOS.
   *
   * O que a pessoa mandou, para ela conferir que a nota fiscal chegou; e o que o TI anexou na
   * devolutiva, porque é parte da resposta que ela veio buscar. Mexer neles é outra história:
   * cada lado só apaga o que é dele (ver `attachment-ownership.util`).
   */
  it('keeps both sides of the files, so the person sees what arrived and what came back', () => {
    const file = (over: Record<string, unknown>) => ({
      id: 1,
      ticketId: 7,
      historyId: null,
      kind: 'pdf' as const,
      origin: 'requester' as const,
      fileName: 'nota.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
      viewUrl: 'https://r2.example/abrir',
      downloadUrl: 'https://r2.example/baixar',
      createdAt: '2026-03-01T08:00:00.000Z',
      createdBy: null,
      ...over,
    });

    const withFiles = publicTicketSchema.parse({
      ...stored,
      attachments: [
        file({ id: 1, origin: 'requester' }),
        file({
          id: 2,
          origin: 'support',
          fileName: 'laudo-do-ti.pdf',
          createdBy: 'ti@azuos.local',
        }),
      ],
    });

    expect(withFiles.attachments[0]?.origin).toBe('requester');
    expect(withFiles.attachments[1]?.origin).toBe('support');
    expect(withFiles.attachments[0]?.viewUrl).toBeTruthy();
    expect(withFiles.attachments[1]?.downloadUrl).toBeTruthy();
  });
});

describe('updateTicketSchema', () => {
  // feliz
  it('accepts changing only the urgency', () => {
    expect(updateTicketSchema.parse({ priority: 'high' })).toEqual({ priority: 'high' });
  });

  /* O responsável não se troca à mão: quem assume o chamado vira responsável pelo histórico. */
  it('ignores an assignee sent in the body, which is set only by taking the ticket', () => {
    expect(updateTicketSchema.parse({ assignee: 'Carlos do TI' })).not.toHaveProperty('assignee');
  });

  it('accepts an empty change without touching anything', () => {
    expect(updateTicketSchema.parse({})).toEqual({});
  });

  // triste
  /* O estágio e a solução só mudam por um histórico lançado: aceitá-los aqui seria uma porta
     lateral para encerrar um chamado sem deixar rastro na linha do tempo. */
  it('ignores the stage and the solution, which only change through a history', () => {
    const parsed = updateTicketSchema.parse({ status: 'resolved', solution: 'Pronto.' });

    expect(parsed).not.toHaveProperty('status');
    expect(parsed).not.toHaveProperty('solution');
  });

  it('refuses an unknown urgency, in Portuguese', () => {
    const result = updateTicketSchema.safeParse({ priority: 'urgentíssima' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Escolha a urgência');
  });

  it('refuses changing who opened the ticket', () => {
    const parsed = updateTicketSchema.parse({ requesterName: 'Outra pessoa' });

    expect(parsed).not.toHaveProperty('requesterName');
  });

  // feliz
  it('accepts reclassifying the area', () => {
    expect(updateTicketSchema.parse({ area: 'manutencao' })).toEqual({ area: 'manutencao' });
  });

  // triste
  it('refuses an area that is not on the list, in Portuguese', () => {
    const result = updateTicketSchema.safeParse({ area: 'rh' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Escolha a área do chamado');
  });
});

describe('ticketListQuerySchema', () => {
  // feliz
  it('fills in the default page when the screen sends no filter', () => {
    const parsed = ticketListQuerySchema.parse({});

    expect(parsed.page).toBe(1);
    expect(parsed.status).toBeUndefined();
  });

  it('accepts a whole group of stages as one filter', () => {
    expect(ticketListQuerySchema.parse({ statusGroup: 'waiting' }).statusGroup).toBe('waiting');
    expect(ticketListQuerySchema.safeParse({ statusGroup: 'fechados' }).success).toBe(false);
  });

  it('accepts the panel filters together', () => {
    const parsed = ticketListQuerySchema.parse({
      status: 'open',
      priority: 'high',
      area: 'infra',
      department: 'rh',
      problemType: 'network',
      search: '  impressora  ',
    });

    expect(parsed.search).toBe('impressora');
    expect(parsed.department).toBe('rh');
    expect(parsed.area).toBe('infra');
  });

  // triste
  it('refuses a page size above the ceiling, which would hang the screen and the database', () => {
    expect(ticketListQuerySchema.safeParse({ pageSize: 5000 }).success).toBe(false);
  });
});

describe('ticketReportQuerySchema', () => {
  // feliz
  it('accepts the same filters as the list, plus the file format', () => {
    const parsed = ticketReportQuerySchema.parse({ status: 'open', format: 'xlsx' });

    expect(parsed.status).toBe('open');
    expect(parsed.format).toBe('xlsx');
  });

  // triste
  it('refuses a report with no format chosen', () => {
    expect(ticketReportQuerySchema.safeParse({ status: 'open' }).success).toBe(false);
  });
});
