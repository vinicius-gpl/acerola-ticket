import { describe, expect, it } from 'vitest';

import { type MaintenanceQuoteRow } from '../../../lib/db/schema/maintenance-quotes.schema';
import {
  toMaintenanceQuote,
  toMaintenanceQuoteInsert,
  toMaintenanceQuoteUpdate,
} from './maintenance-quotes.mapper';

const NOW = new Date('2026-10-05T15:00:00.000Z');

function row(overrides: Partial<MaintenanceQuoteRow> = {}): MaintenanceQuoteRow {
  return {
    id: 1,
    supplier: 'Clima Frio Refrigeração',
    description: 'Recarga de gás do ar-condicionado da recepção',
    kind: 'service',
    amountCents: 48000,
    quotedOn: '2026-09-28',
    status: 'pending',
    decidedAt: null,
    note: null,
    attachmentKey: 'maintenance-quotes/abc.pdf',
    attachmentName: 'orcamento-clima-frio.pdf',
    createdAt: new Date('2026-09-28T12:00:00.000Z'),
    createdBy: 'ana@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

const input = {
  supplier: '  Clima Frio  ',
  description: 'Recarga de gás',
  kind: 'service',
  amountCents: 48000,
  quotedOn: '2026-09-28',
} as const;

describe('toMaintenanceQuote', () => {
  // feliz
  it('translates the row into the contract, with the signed link of the document', () => {
    const quote = toMaintenanceQuote(row(), 'https://r2.exemplo/doc?assinatura');

    expect(quote).toMatchObject({
      supplier: 'Clima Frio Refrigeração',
      amountCents: 48000,
      quotedOn: '2026-09-28',
      attachmentUrl: 'https://r2.exemplo/doc?assinatura',
      attachmentName: 'orcamento-clima-frio.pdf',
    });
  });

  // triste
  /* A CHAVE do arquivo nunca sai do servidor — e sem link não há nome de arquivo a prometer. */
  it('never leaks the storage key, nor names a document that cannot be opened', () => {
    const quote = toMaintenanceQuote(row(), null);

    expect(quote.attachmentUrl).toBeNull();
    expect(quote.attachmentName).toBeNull();
    expect(JSON.stringify(quote)).not.toContain('maintenance-quotes/abc.pdf');
  });
});

describe('toMaintenanceQuoteInsert', () => {
  // feliz
  it('stamps the authorship from the identity and starts waiting for a decision', () => {
    const values = toMaintenanceQuoteInsert(input, 'ana@empresa.com.br', null, NOW);

    expect(values).toMatchObject({
      supplier: 'Clima Frio',
      amountCents: 48000,
      status: 'pending',
      decidedAt: null,
      attachmentKey: null,
      createdBy: 'ana@empresa.com.br',
    });
  });

  it('keeps the document that was stored', () => {
    const values = toMaintenanceQuoteInsert(
      input,
      'ana@empresa.com.br',
      { key: 'maintenance-quotes/novo.pdf', name: 'orcamento.pdf' },
      NOW,
    );

    expect(values.attachmentKey).toBe('maintenance-quotes/novo.pdf');
    expect(values.attachmentName).toBe('orcamento.pdf');
  });

  /* Guardar um orçamento que já chegou aprovado: a decisão é de agora. */
  it('dates the decision of a quote that is born already decided', () => {
    const values = toMaintenanceQuoteInsert(
      { ...input, status: 'approved' },
      'ana@empresa.com.br',
      null,
      NOW,
    );

    expect(values.decidedAt).toEqual(NOW);
  });

  // triste
  it('turns a blank note into nothing', () => {
    expect(
      toMaintenanceQuoteInsert({ ...input, note: '   ' }, 'ana@empresa.com.br', null).note,
    ).toBeNull();
  });
});

describe('toMaintenanceQuoteUpdate', () => {
  // feliz
  it('changes only the fields that came', () => {
    const values = toMaintenanceQuoteUpdate(
      { supplier: 'Outra Empresa' },
      'bia@empresa.com.br',
      { status: 'pending' },
      undefined,
      NOW,
    );

    expect(values.supplier).toBe('Outra Empresa');
    expect(values).not.toHaveProperty('amountCents');
    expect(values).not.toHaveProperty('status');
    expect(values.updatedBy).toBe('bia@empresa.com.br');
  });

  it('dates the decision when the quote leaves the waiting line', () => {
    const values = toMaintenanceQuoteUpdate(
      { status: 'approved' },
      'bia@empresa.com.br',
      { status: 'pending' },
      undefined,
      NOW,
    );

    expect(values.status).toBe('approved');
    expect(values.decidedAt).toEqual(NOW);
  });

  it('clears the decision when the quote goes back to waiting', () => {
    const values = toMaintenanceQuoteUpdate(
      { status: 'pending' },
      'bia@empresa.com.br',
      { status: 'rejected' },
      undefined,
      NOW,
    );

    expect(values.decidedAt).toBeNull();
  });

  it('replaces the document when a new one was stored', () => {
    const values = toMaintenanceQuoteUpdate(
      {},
      'bia@empresa.com.br',
      { status: 'pending' },
      { key: 'maintenance-quotes/novo.pdf', name: 'novo.pdf' },
    );

    expect(values.attachmentKey).toBe('maintenance-quotes/novo.pdf');
  });

  // triste
  /* Corrigir um erro de digitação num orçamento aprovado em março não o aprova hoje. */
  it('does not move the decision date when the status that came is the same', () => {
    const values = toMaintenanceQuoteUpdate(
      { status: 'approved', note: 'Corrigido' },
      'bia@empresa.com.br',
      { status: 'approved' },
      undefined,
      NOW,
    );

    expect(values).not.toHaveProperty('decidedAt');
    expect(values).not.toHaveProperty('status');
  });

  /* Tirar o documento é uma ORDEM explícita, e ela vence o arquivo novo. */
  it('clears the document only when asked to, even if a new one arrived', () => {
    expect(
      toMaintenanceQuoteUpdate({}, 'bia@empresa.com.br', { status: 'pending' }),
    ).not.toHaveProperty('attachmentKey');

    const values = toMaintenanceQuoteUpdate(
      { removeAttachment: true },
      'bia@empresa.com.br',
      { status: 'pending' },
      { key: 'maintenance-quotes/novo.pdf', name: 'novo.pdf' },
    );

    expect(values.attachmentKey).toBeNull();
    expect(values.attachmentName).toBeNull();
  });
});
