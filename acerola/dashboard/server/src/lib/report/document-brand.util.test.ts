import { describe, expect, it } from 'vitest';

import { BRAND_LOGO, BRAND_NAME, brandLogoWidth } from './document-brand.util';

/* Todo PNG começa com estes 8 bytes, e guarda a largura e a altura logo depois, no bloco IHDR. */
const PNG_SIGNATURE = '89504e470d0a1a0a';
const PNG_WIDTH_OFFSET = 16;
const PNG_HEIGHT_OFFSET = 20;

describe('BRAND_LOGO', () => {
  // feliz
  it('is a real PNG, the format the three generators read', () => {
    expect(BRAND_LOGO.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE);
    expect(BRAND_NAME).toBe('acerola-ticket');
  });

  // triste
  /* Trocar a imagem sem acertar as medidas no código estica a logo nos documentos: a largura
     calculada para a altura real da imagem tem de dar a largura real dela. */
  it('keeps the proportion the code assumes, so the logo is never stretched', () => {
    const width = BRAND_LOGO.readUInt32BE(PNG_WIDTH_OFFSET);
    const height = BRAND_LOGO.readUInt32BE(PNG_HEIGHT_OFFSET);

    expect(brandLogoWidth(height)).toBe(width);
  });
});

describe('brandLogoWidth', () => {
  // feliz
  it('gives a logo slightly wider than tall, in whole units', () => {
    expect(brandLogoWidth(30)).toBe(33);
    expect(brandLogoWidth(36)).toBe(40);
  });

  // triste
  it('gives no width for a logo with no height', () => {
    expect(brandLogoWidth(0)).toBe(0);
  });
});
