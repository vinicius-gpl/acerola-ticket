import { describe, expect, it } from 'vitest';

import {
  QUOTE_AMOUNT_MAX_CENTS,
  QUOTE_SUPPLIER_MAX_LENGTH,
  createMaintenanceQuoteSchema,
  maintenanceQuoteFormSchema,
  maintenanceQuoteListQuerySchema,
  updateMaintenanceQuoteSchema,
} from './maintenance-quote.schema';

function validQuote() {
  return {
    supplier: 'Clima Frio Refrigeração',
    description: 'Limpeza e recarga de gás do ar-condicionado da recepção',
    kind: 'service',
    amountCents: 48000,
    quotedOn: '2026-09-28',
  } as const;
}

describe('createMaintenanceQuoteSchema', () => {
  // feliz
  it('accepts a quote with the fields that matter', () => {
    const parsed = createMaintenanceQuoteSchema.parse(validQuote());

    expect(parsed.supplier).toBe('Clima Frio Refrigeração');
    expect(parsed.amountCents).toBe(48000);
  });

  /* O envio com arquivo é `multipart`: todo campo chega como texto, inclusive o valor. */
  it('reads the amount that arrived as text', () => {
    expect(
      createMaintenanceQuoteSchema.parse({ ...validQuote(), amountCents: '125000' }).amountCents,
    ).toBe(125000);
  });

  it('turns a blank note into nothing', () => {
    expect(createMaintenanceQuoteSchema.parse({ ...validQuote(), note: '  ' }).note).toBeNull();
  });

  // triste
  it('refuses a quote without the company, saying what to do', () => {
    const result = createMaintenanceQuoteSchema.safeParse({ ...validQuote(), supplier: '  ' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Informe a empresa que fez o orçamento');
  });

  it('refuses a company name longer than the limit', () => {
    const result = createMaintenanceQuoteSchema.safeParse({
      ...validQuote(),
      supplier: 'a'.repeat(QUOTE_SUPPLIER_MAX_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });

  it('refuses a negative amount, an amount with fractions of a cent and an absurd one', () => {
    for (const amountCents of [-1, 10.5, QUOTE_AMOUNT_MAX_CENTS + 1]) {
      expect(createMaintenanceQuoteSchema.safeParse({ ...validQuote(), amountCents }).success).toBe(
        false,
      );
    }
  });

  it('refuses a date that is not a day', () => {
    const result = createMaintenanceQuoteSchema.safeParse({
      ...validQuote(),
      quotedOn: '28/09/2026',
    });

    expect(result.error?.issues[0]?.message).toBe('Informe a data do orçamento');
  });

  it('refuses a kind and a status outside of the lists', () => {
    expect(createMaintenanceQuoteSchema.safeParse({ ...validQuote(), kind: 'rent' }).success).toBe(
      false,
    );
    expect(
      createMaintenanceQuoteSchema.safeParse({ ...validQuote(), status: 'paid' }).success,
    ).toBe(false);
  });
});

describe('updateMaintenanceQuoteSchema', () => {
  // feliz
  it('accepts only what changed', () => {
    expect(updateMaintenanceQuoteSchema.parse({ status: 'approved' })).toEqual({
      status: 'approved',
    });
  });

  it('reads the request to drop the document that arrived as text', () => {
    expect(updateMaintenanceQuoteSchema.parse({ removeAttachment: 'true' }).removeAttachment).toBe(
      true,
    );
  });

  // triste
  it('still refuses an empty company when it is sent', () => {
    expect(updateMaintenanceQuoteSchema.safeParse({ supplier: '' }).success).toBe(false);
  });
});

describe('maintenanceQuoteFormSchema', () => {
  const valid = {
    supplier: 'Clima Frio',
    description: 'Recarga de gás',
    kind: 'service',
    amount: '1.250,00',
    quotedOn: '2026-09-28',
    status: 'pending',
    note: '',
  } as const;

  // feliz
  it('accepts the amount typed in reais', () => {
    expect(maintenanceQuoteFormSchema.safeParse(valid).success).toBe(true);
    expect(maintenanceQuoteFormSchema.safeParse({ ...valid, amount: '80' }).success).toBe(true);
  });

  // triste
  it('refuses an amount that is not a value, showing how to type it', () => {
    const result = maintenanceQuoteFormSchema.safeParse({ ...valid, amount: 'a combinar' });

    expect(result.error?.issues[0]?.message).toBe('Informe o valor em reais, como 1.250,00');
  });

  it('refuses an empty amount and an absurd one', () => {
    expect(maintenanceQuoteFormSchema.safeParse({ ...valid, amount: '' }).success).toBe(false);
    expect(
      maintenanceQuoteFormSchema.safeParse({ ...valid, amount: '999.999.999,00' }).success,
    ).toBe(false);
  });
});

describe('maintenanceQuoteListQuerySchema', () => {
  // feliz
  it('reads the filters from the address', () => {
    const parsed = maintenanceQuoteListQuerySchema.parse({ status: 'pending', search: ' ar ' });

    expect(parsed).toMatchObject({ status: 'pending', search: 'ar', page: 1 });
  });

  // triste
  it('refuses a status that does not exist', () => {
    expect(maintenanceQuoteListQuerySchema.safeParse({ status: 'paid' }).success).toBe(false);
  });
});
