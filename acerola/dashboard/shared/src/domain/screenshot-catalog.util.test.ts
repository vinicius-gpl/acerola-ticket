import { describe, expect, it } from 'vitest';

import { isScreenshotType, refuseScreenshot, SCREENSHOT_MAX_BYTES } from './screenshot-catalog.util';

describe('isScreenshotType', () => {
  // feliz
  it('accepts every image type in the catalogue', () => {
    expect(isScreenshotType('image/png')).toBe(true);
    expect(isScreenshotType('image/webp')).toBe(true);
    expect(isScreenshotType('image/gif')).toBe(true);
    expect(isScreenshotType('image/bmp')).toBe(true);
  });

  // triste
  it('refuses anything outside the catalogue, even another image type', () => {
    expect(isScreenshotType('image/svg+xml')).toBe(false);
    expect(isScreenshotType('application/pdf')).toBe(false);
  });
});

describe('refuseScreenshot', () => {
  // feliz
  it('accepts an image within the size limit', () => {
    expect(refuseScreenshot({ contentType: 'image/png', sizeBytes: 1024 })).toBeNull();
  });

  // triste
  it('refuses a file that is not an image, in Portuguese', () => {
    const refusal = refuseScreenshot({ contentType: 'application/pdf', sizeBytes: 1024 });

    expect(refusal?.message).toBe('O print precisa ser uma imagem (PNG, JPG, WEBP, GIF ou BMP).');
  });

  it('refuses an image bigger than the ceiling', () => {
    const refusal = refuseScreenshot({
      contentType: 'image/png',
      sizeBytes: SCREENSHOT_MAX_BYTES + 1,
    });

    expect(refusal?.message).toContain('8 MB');
  });
});
