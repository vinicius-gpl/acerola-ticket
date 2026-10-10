import { ATTACHMENT_RULES } from '@template/shared/domain/attachment-catalog.util';
import { SCREENSHOT_MAX_BYTES } from '@template/shared/domain/screenshot-catalog.util';
import { describe, expect, it } from 'vitest';

import { TICKET_UPLOAD_MAX_BYTES, uploadLimit } from './upload-limit.util';

describe('uploadLimit', () => {
  // feliz
  it('turns the ceiling into the option the upload reader understands', () => {
    expect(uploadLimit(1024)).toEqual({ limits: { fileSize: 1024 } });
  });
});

describe('TICKET_UPLOAD_MAX_BYTES', () => {
  // feliz
  it('lets through the biggest file any rule of the catalog accepts', () => {
    for (const rule of Object.values(ATTACHMENT_RULES)) {
      expect(TICKET_UPLOAD_MAX_BYTES).toBeGreaterThanOrEqual(rule.maxBytes);
    }
    expect(TICKET_UPLOAD_MAX_BYTES).toBeGreaterThanOrEqual(SCREENSHOT_MAX_BYTES);
  });

  // triste
  /* Um teto maior que o maior arquivo aceito deixaria de proteger: é para ser exatamente ele. */
  it('is never bigger than the biggest accepted file', () => {
    const biggest = Math.max(
      SCREENSHOT_MAX_BYTES,
      ...Object.values(ATTACHMENT_RULES).map((rule) => rule.maxBytes),
    );

    expect(TICKET_UPLOAD_MAX_BYTES).toBe(biggest);
  });
});
