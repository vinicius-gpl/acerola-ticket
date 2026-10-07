import { describe, expect, it } from 'vitest';

import {
  QUOTE_ATTACHMENT_MAX_BYTES,
  QUOTE_KINDS,
  QUOTE_STATUSES,
  centsToAmountText,
  formatCents,
  parseAmountToCents,
  quoteAttachmentAccept,
  quoteKindLabel,
  quoteKindOptions,
  quoteStatusLabel,
  quoteStatusOptions,
  quoteStatusTone,
  refuseQuoteAttachment,
} from './maintenance-quote.util';

describe('parseAmountToCents', () => {
  // feliz
  it('reads the value the way people type it here', () => {
    expect(parseAmountToCents('1.234,56')).toBe(123456);
    expect(parseAmountToCents('1234,5')).toBe(123450);
    expect(parseAmountToCents('1234')).toBe(123400);
    expect(parseAmountToCents('R$ 80')).toBe(8000);
    expect(parseAmountToCents('0,99')).toBe(99);
  });

  // triste
  it('gives nothing for what is not a value', () => {
    expect(parseAmountToCents('')).toBeNull();
    expect(parseAmountToCents('mil reais')).toBeNull();
    expect(parseAmountToCents('-50')).toBeNull();
    expect(parseAmountToCents('1,234')).toBeNull();
    /* Ponto de milhar fora do lugar é mais provável erro de digitação do que valor. */
    expect(parseAmountToCents('12.34')).toBeNull();
  });
});

describe('formatCents', () => {
  // feliz
  it('shows the cents, because it is the value of a document', () => {
    expect(formatCents(123456)).toBe('R$ 1.234,56');
    expect(formatCents(8000)).toBe('R$ 80,00');
  });

  it('gives back the text of the form field', () => {
    expect(centsToAmountText(123456)).toBe('1.234,56');
    expect(parseAmountToCents(centsToAmountText(99))).toBe(99);
  });

  // triste
  it('shows zero as zero, not as nothing', () => {
    expect(formatCents(0)).toBe('R$ 0,00');
  });
});

describe('labels', () => {
  // feliz
  it('has a label in Portuguese for every kind and every status', () => {
    for (const kind of QUOTE_KINDS) expect(quoteKindLabel(kind)).toBeTruthy();
    for (const status of QUOTE_STATUSES) expect(quoteStatusLabel(status)).toBeTruthy();
    expect(quoteKindOptions()).toHaveLength(QUOTE_KINDS.length);
    expect(quoteStatusOptions()).toHaveLength(QUOTE_STATUSES.length);
  });

  it('paints each status with its own tone', () => {
    expect(quoteStatusTone('pending')).toBe('warning');
    expect(quoteStatusTone('approved')).toBe('success');
    expect(quoteStatusTone('rejected')).toBe('neutral');
  });
});

describe('refuseQuoteAttachment', () => {
  // feliz
  it('accepts a PDF and a photo of the paper', () => {
    expect(refuseQuoteAttachment({ contentType: 'application/pdf', sizeBytes: 1024 })).toBeNull();
    expect(refuseQuoteAttachment({ contentType: 'IMAGE/JPEG ', sizeBytes: 1024 })).toBeNull();
    expect(quoteAttachmentAccept()).toContain('application/pdf');
  });

  // triste
  it('refuses a file that is neither, saying what is accepted', () => {
    const refusal = refuseQuoteAttachment({ contentType: 'application/zip', sizeBytes: 10 });

    expect(refusal?.message).toContain('PDF');
  });

  it('refuses a file over the limit, saying the limit', () => {
    const refusal = refuseQuoteAttachment({
      contentType: 'application/pdf',
      sizeBytes: QUOTE_ATTACHMENT_MAX_BYTES + 1,
    });

    expect(refusal?.message).toContain('10 MB');
  });
});
