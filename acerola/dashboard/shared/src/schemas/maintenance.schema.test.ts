import { describe, expect, it } from 'vitest';

import {
  createMaintenanceSchema,
  maintenanceFormSchema,
  maintenanceListQuerySchema,
  updateMaintenanceSchema,
} from './maintenance.schema';

const AT = '2026-09-20T12:00:00.000Z';

describe('createMaintenanceSchema', () => {
  // feliz
  it('accepts a service done on an inventoried machine', () => {
    const parsed = createMaintenanceSchema.parse({
      computerId: 3,
      type: 'preventive',
      description: '  Limpeza interna e pasta térmica  ',
      performedAt: AT,
    });

    expect(parsed.computerId).toBe(3);
    expect(parsed.description).toBe('Limpeza interna e pasta térmica');
  });

  /* Equipamento de fora do inventário: um notebook antigo, uma impressora. */
  it('accepts equipment that is not in the inventory', () => {
    const parsed = createMaintenanceSchema.parse({
      otherMachine: 'Notebook antigo da recepção',
      type: 'corrective',
      performedAt: AT,
    });

    expect(parsed.otherMachine).toBe('Notebook antigo da recepção');
    expect(parsed.computerId).toBeUndefined();
  });

  it('accepts a record with nothing but the machine, the type and the date', () => {
    const parsed = createMaintenanceSchema.parse({ computerId: 1, type: 'cleaning', performedAt: AT });

    expect(parsed.description).toBeUndefined();
    expect(parsed.performedBy).toBeUndefined();
  });

  // triste
  /* Histórico que não diz de quem é não responde "esta máquina dá trabalho demais?", que é a
     pergunta que ele existe para responder. */
  it('refuses a record that names no equipment at all', () => {
    const result = createMaintenanceSchema.safeParse({ type: 'preventive', performedAt: AT });

    expect(result.success).toBe(false);
  });

  it('refuses a type that is not on the list', () => {
    const result = createMaintenanceSchema.safeParse({
      computerId: 1,
      type: 'upgrade',
      performedAt: AT,
    });

    expect(result.success).toBe(false);
  });

  it('refuses a date it cannot read', () => {
    const result = createMaintenanceSchema.safeParse({
      computerId: 1,
      type: 'preventive',
      performedAt: 'semana passada',
    });

    expect(result.success).toBe(false);
  });
});

describe('updateMaintenanceSchema', () => {
  // feliz
  it('accepts fixing only what was typed wrong', () => {
    const parsed = updateMaintenanceSchema.parse({ description: 'Troquei o SSD, não a memória' });

    expect(parsed.description).toBe('Troquei o SSD, não a memória');
    expect(parsed.type).toBeUndefined();
  });

  // triste
  it('refuses to move the record to a type that does not exist', () => {
    expect(updateMaintenanceSchema.safeParse({ type: 'garantia' }).success).toBe(false);
  });
});

describe('maintenanceFormSchema', () => {
  const FORM = {
    computerId: '3',
    otherMachine: '',
    type: 'preventive' as const,
    description: 'Limpeza interna',
    performedBy: 'Suporte TI',
    performedAt: '2026-09-20',
  };

  // feliz
  it('accepts the form as the screen fills it', () => {
    expect(maintenanceFormSchema.safeParse(FORM).success).toBe(true);
  });

  it('accepts equipment typed by hand, with no machine chosen', () => {
    const result = maintenanceFormSchema.safeParse({
      ...FORM,
      computerId: '',
      otherMachine: 'Impressora da recepção',
    });

    expect(result.success).toBe(true);
  });

  // triste
  it('refuses a form with no machine and no equipment written', () => {
    const result = maintenanceFormSchema.safeParse({ ...FORM, computerId: '', otherMachine: '  ' });

    expect(result.success).toBe(false);
  });

  it('refuses a form with no date', () => {
    expect(maintenanceFormSchema.safeParse({ ...FORM, performedAt: '' }).success).toBe(false);
  });
});

describe('maintenanceListQuerySchema', () => {
  // feliz
  it('fills in the default page when the screen sends no filter', () => {
    const parsed = maintenanceListQuerySchema.parse({});

    expect(parsed.page).toBe(1);
    expect(parsed.computerId).toBeUndefined();
  });

  it('reads the machine filter that comes from the address as text', () => {
    expect(maintenanceListQuerySchema.parse({ computerId: '3' }).computerId).toBe(3);
  });

  // triste
  it('refuses a page size above the ceiling', () => {
    expect(maintenanceListQuerySchema.safeParse({ pageSize: 5000 }).success).toBe(false);
  });
});
