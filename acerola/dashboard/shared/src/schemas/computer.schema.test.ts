import { describe, expect, it } from 'vitest';

import {
  computerAlertSchema,
  computerListQuerySchema,
  createComputerSchema,
  updateComputerSchema,
} from './computer.schema';

describe('createComputerSchema', () => {
  // feliz
  it('accepts a machine registered with nothing but its name', () => {
    const parsed = createComputerSchema.parse({ name: 'RECEPCAO-01' });

    expect(parsed.name).toBe('RECEPCAO-01');
  });

  it('accepts the identification filled in right away', () => {
    const parsed = createComputerSchema.parse({
      name: 'RECEPCAO-01',
      displayName: 'Computador da recepção',
      responsibleName: 'Helena Dias',
      department: 'recepcao',
    });

    expect(parsed.department).toBe('recepcao');
  });

  it('trims the name before storing it', () => {
    expect(createComputerSchema.parse({ name: '  RECEPCAO-01  ' }).name).toBe('RECEPCAO-01');
  });

  // triste
  it('refuses a machine with no name, since the agent matches by it', () => {
    const result = createComputerSchema.safeParse({ name: '   ' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Informe o nome da máquina');
  });

  it('refuses a department that is not on the list, in Portuguese', () => {
    const result = createComputerSchema.safeParse({ name: 'PC-1', department: 'MARKETING' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Escolha um departamento da lista');
  });

  /* Hardware é medido, não digitado: aceitá-lo aqui faria a ficha discordar da máquina. */
  it('ignores hardware sent at registration, because only the agent measures it', () => {
    const parsed = createComputerSchema.parse({ name: 'PC-1', totalMemoryBytes: 999 });

    expect(parsed).not.toHaveProperty('totalMemoryBytes');
  });

  /* O token é gerado pelo servidor; aceitar um escolhido de fora anularia a proteção. */
  it('ignores a token sent at registration', () => {
    const parsed = createComputerSchema.parse({ name: 'PC-1', token: 'eu-escolhi' });

    expect(parsed).not.toHaveProperty('token');
  });
});

describe('updateComputerSchema', () => {
  // feliz
  it('accepts changing only the responsible person', () => {
    expect(updateComputerSchema.parse({ responsibleName: 'Ana' })).toEqual({
      responsibleName: 'Ana',
    });
  });

  it('turns an emptied nickname into null, so the field is actually cleared', () => {
    expect(updateComputerSchema.parse({ displayName: '   ' }).displayName).toBeNull();
  });

  it('accepts archiving and blocking with a reason', () => {
    const parsed = updateComputerSchema.parse({
      isArchived: true,
      isBlocked: true,
      blockReason: 'Máquina de terceiro, não autorizada',
    });

    expect(parsed.isBlocked).toBe(true);
  });

  it('accepts an empty change without touching anything', () => {
    expect(updateComputerSchema.parse({})).toEqual({});
  });

  // triste
  /* O nome vem da própria máquina: renomeá-lo aqui quebraria o encontro na próxima conexão. */
  it('refuses renaming the machine, which is how the agent is matched', () => {
    const parsed = updateComputerSchema.parse({ name: 'OUTRO-NOME' });

    expect(parsed).not.toHaveProperty('name');
  });

  it('refuses editing measured hardware', () => {
    const parsed = updateComputerSchema.parse({ totalMemoryBytes: 999, healthScore: 100 });

    expect(parsed).not.toHaveProperty('totalMemoryBytes');
    expect(parsed).not.toHaveProperty('healthScore');
  });
});

describe('computerListQuerySchema', () => {
  // feliz
  it('fills in the default page when the screen sends no filter', () => {
    const parsed = computerListQuerySchema.parse({});

    expect(parsed.page).toBe(1);
    expect(parsed.department).toBeUndefined();
  });

  it('accepts the panel filters together', () => {
    const parsed = computerListQuerySchema.parse({
      search: '  recepcao  ',
      department: 'rh',
      healthStatus: 'critical',
    });

    expect(parsed.search).toBe('recepcao');
    expect(parsed.healthStatus).toBe('critical');
  });

  // triste
  /* Arquivada saiu de uso: trazê-la por padrão poluiria a lista de quem trabalha nela. */
  it('leaves archived machines out unless they are asked for', () => {
    expect(computerListQuerySchema.parse({}).includeArchived).toBeUndefined();
  });

  it('refuses a page size above the ceiling', () => {
    expect(computerListQuerySchema.safeParse({ pageSize: 5000 }).success).toBe(false);
  });
});

describe('computerAlertSchema', () => {
  const RECOVERED = {
    id: 1,
    computerId: 7,
    metric: 'disk',
    peakValue: 97.4,
    threshold: 90,
    status: 'recovered',
    startedAt: '2026-09-20T12:00:00.000Z',
    recoveredAt: '2026-09-20T12:35:00.000Z',
    causeProcess: 'OneDrive.exe',
  };

  // feliz
  it('accepts an episode that already ended', () => {
    const parsed = computerAlertSchema.parse(RECOVERED);

    expect(parsed.recoveredAt).not.toBeNull();
  });

  /* Episódio em aberto é o que a ficha mostra em vermelho: sem data de recuperação. */
  it('accepts an episode still happening, with no recovery time', () => {
    const parsed = computerAlertSchema.parse({
      ...RECOVERED,
      status: 'active',
      recoveredAt: null,
      causeProcess: null,
    });

    expect(parsed.recoveredAt).toBeNull();
    expect(parsed.causeProcess).toBeNull();
  });

  // triste
  it('refuses a measure that is not one of the three watched', () => {
    expect(computerAlertSchema.safeParse({ ...RECOVERED, metric: 'gpu' }).success).toBe(false);
  });

  it('refuses a start time that is not a date', () => {
    expect(computerAlertSchema.safeParse({ ...RECOVERED, startedAt: 'ontem' }).success).toBe(false);
  });
});
