import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A MARCA que assina todo documento: a logo, igual no PDF, no Word e no Excel. Só a logo —
 * o nome não é escrito ao lado dela. As cores moram na paleta (`document-palette.util.ts`).
 */

/** O nome NÃO é desenhado: serve de texto alternativo da imagem, para leitor de tela. */
export const BRAND_NAME = 'acerola-ticket';

/**
 * A logo mora ao lado deste arquivo — o build do Nest a copia para o `dist` (ver `assets` em
 * nest-cli.json), então o mesmo caminho vale em desenvolvimento e em produção.
 *
 * É o ícone do painel (`client/static/favicon.svg`) em PNG, recortado rente ao desenho: os
 * três geradores leem PNG, e nenhum deles lê SVG. Para regerar depois de trocar o ícone:
 *
 *   magick -background none -density 384 client/static/favicon.svg -trim +repage \
 *     -resize x320 -depth 8 -strip server/src/lib/report/assets/brand.png
 */
export const BRAND_LOGO_PATH = join(__dirname, 'assets', 'brand.png');

/** Os bytes da logo, lidos uma vez só: o Word e o Excel embutem a imagem no arquivo. */
export const BRAND_LOGO = readFileSync(BRAND_LOGO_PATH);

/* A imagem tem 355 × 320 pixels. Quem desenha escolhe a ALTURA; a largura sai daqui, para a
   logo nunca aparecer esticada. */
const BRAND_LOGO_PIXEL_WIDTH = 355;
const BRAND_LOGO_PIXEL_HEIGHT = 320;

/** A largura da logo para uma dada altura, na mesma unidade em que a altura veio. */
export function brandLogoWidth(height: number): number {
  return Math.round((height * BRAND_LOGO_PIXEL_WIDTH) / BRAND_LOGO_PIXEL_HEIGHT);
}
