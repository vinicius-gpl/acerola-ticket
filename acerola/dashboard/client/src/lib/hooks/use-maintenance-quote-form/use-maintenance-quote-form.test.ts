import { type MaintenanceQuote } from '@template/shared/schemas/maintenance-quote.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-maintenance-quote-form-harness.test.svelte';
import { type MaintenanceQuoteFormModel } from './use-maintenance-quote-form.svelte';
import { todayAsDay } from '$lib/utils/format-date';

vi.mock('$lib/api/maintenance-quotes.api', () => ({
  maintenanceQuotesApi: { create: vi.fn(), update: vi.fn() },
}));

const { maintenanceQuotesApi } = await import('$lib/api/maintenance-quotes.api');

function quote(over: Partial<MaintenanceQuote> = {}): MaintenanceQuote {
  return {
    id: 7,
    supplier: 'Clima Norte Refrigeração',
    description: 'Limpeza e recarga de gás',
    kind: 'service',
    amountCents: 96000,
    quotedOn: '2026-10-02',
    status: 'pending',
    note: null,
    attachmentUrl: 'https://r2.exemplo/doc?assinatura',
    attachmentName: 'orcamento-clima-norte.pdf',
    createdAt: '2026-10-02T12:00:00.000Z',
    createdBy: 'manutencao@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

/** Um arquivo de verdade para o jsdom: o que importa é o tipo e o tamanho. */
function file(name = 'orcamento.pdf', type = 'application/pdf'): File {
  return new File(['documento-de-mentira'], name, { type });
}

function mountModel(
  existing: MaintenanceQuote | null = null,
  onSaved: () => void = vi.fn(),
): MaintenanceQuoteFormModel {
  let model!: MaintenanceQuoteFormModel;
  render(Harness, {
    props: {
      quote: existing,
      onSaved,
      onReady: (ready: MaintenanceQuoteFormModel) => (model = ready),
    },
  });

  return model;
}

beforeEach(() => {
  vi.mocked(maintenanceQuotesApi.create).mockReset().mockResolvedValue(quote());
  vi.mocked(maintenanceQuotesApi.update).mockReset().mockResolvedValue(quote());
});

describe('useMaintenanceQuoteFormModel', () => {
  // feliz
  it('starts a new quote with the date of today, waiting for a decision', () => {
    const model = mountModel();

    expect(model.data.mode).toBe('create');
    expect(model.data.fields.supplier.value).toBe('');
    expect(model.data.fields.quotedOn.value).toBe(todayAsDay());
    expect(model.data.fields.status.value).toBe('pending');
    expect(model.data.attachment.name).toBeNull();
  });

  it('starts with the values of the quote being corrected, amount in reais', () => {
    const model = mountModel(quote());

    expect(model.data.mode).toBe('edit');
    expect(model.data.fields.supplier.value).toBe('Clima Norte Refrigeração');
    expect(model.data.fields.amount.value).toBe('960,00');
    expect(model.data.attachment.name).toBe('orcamento-clima-norte.pdf');
  });

  it('keeps the quote with the document that was attached', async () => {
    const onSaved = vi.fn();
    const model = mountModel(null, onSaved);

    model.actions.onChange('supplier', 'Móveis Planalto');
    model.actions.onChange('description', 'Seis cadeiras giratórias');
    model.actions.onChange('kind', 'product');
    model.actions.onChange('amount', '3.540,00');
    model.actions.onAttachmentChange(file());
    model.actions.onSubmit();

    await waitFor(() => expect(maintenanceQuotesApi.create).toHaveBeenCalled());
    expect(maintenanceQuotesApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ supplier: 'Móveis Planalto', amount: '3.540,00' }),
      expect.any(File),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });

  it('shows the name of the chosen document', () => {
    const model = mountModel();

    model.actions.onAttachmentChange(file('proposta-moveis.pdf'));

    expect(model.data.attachment.name).toBe('proposta-moveis.pdf');
  });

  /* Tirar o documento é uma ordem explícita, e vai ao servidor como tal. */
  it('asks to remove the document of the quote being corrected', async () => {
    const model = mountModel(quote());

    model.actions.onAttachmentRemove();
    expect(model.data.attachment.name).toBeNull();

    model.actions.onSubmit();

    await waitFor(() =>
      expect(maintenanceQuotesApi.update).toHaveBeenCalledWith(7, expect.anything(), null, true),
    );
  });

  it('approves a quote by changing only its status', async () => {
    const model = mountModel(quote());

    model.actions.onChange('status', 'approved');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(maintenanceQuotesApi.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ status: 'approved' }),
        null,
        false,
      ),
    );
  });

  // triste
  it('does not send a quote without the company, and says what is missing', async () => {
    const model = mountModel();

    model.actions.onSubmit();

    await waitFor(() =>
      expect(model.data.fields.supplier.error).toBe('Informe a empresa que fez o orçamento'),
    );
    expect(maintenanceQuotesApi.create).not.toHaveBeenCalled();
  });

  it('refuses an amount that is not a value, showing how to type it', async () => {
    const model = mountModel();

    model.actions.onChange('amount', 'a combinar');
    model.actions.onBlur('amount');

    await waitFor(() =>
      expect(model.data.fields.amount.error).toBe('Informe o valor em reais, como 1.250,00'),
    );
  });

  /* O arquivo errado é recusado NA HORA, e não apaga o que já foi digitado. */
  it('refuses a file that is not a document, keeping what was typed', () => {
    const model = mountModel();
    model.actions.onChange('supplier', 'Móveis Planalto');

    model.actions.onAttachmentChange(file('planilha.zip', 'application/zip'));

    expect(model.state.attachmentError).toContain('PDF');
    expect(model.data.attachment.name).toBeNull();
    expect(model.data.fields.supplier.value).toBe('Móveis Planalto');
  });

  it('shows the refusal of the server and does not close', async () => {
    vi.mocked(maintenanceQuotesApi.update).mockRejectedValue(
      new ApiError(403, 'Seu cargo em Manutenção só permite consultar.'),
    );
    const onSaved = vi.fn();
    const model = mountModel(quote(), onSaved);

    model.actions.onSubmit();

    await waitFor(() =>
      expect(model.state.error).toBe('Seu cargo em Manutenção só permite consultar.'),
    );
    expect(onSaved).not.toHaveBeenCalled();
  });
});
