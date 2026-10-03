/**
 * O PRINT DO ERRO de um chamado — uma imagem só, de um formato aceito.
 *
 * A MESMA regra nas duas pontas: a tela recusa um arquivo errado NA HORA da escolha, antes de
 * gastar uma viagem ao servidor, e a API recusa de novo quem tentar pelo caminho de trás (o
 * `accept` do campo de arquivo é só uma sugestão do navegador — ele deixa trocar para "Todos
 * os arquivos" e escolher qualquer coisa). Sem esta lista compartilhada, a tela podia aceitar
 * um PDF e só a API dizer não, bem depois de a pessoa já achar que enviou.
 */

const MEGABYTE = 1024 * 1024;

export const SCREENSHOT_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
] as const;

/** 8 MB cobre print de tela em qualquer monitor; acima disso é arquivo que não é print. */
export const SCREENSHOT_MAX_BYTES = 8 * MEGABYTE;

export function isScreenshotType(contentType: string): boolean {
  return (SCREENSHOT_MIME_TYPES as readonly string[]).includes(contentType.trim().toLowerCase());
}

/** O `accept` do campo de arquivo — mais preciso que `image/*`, que aceita até SVG e TIFF. */
export function screenshotAccept(): string {
  return SCREENSHOT_MIME_TYPES.join(',');
}

export type ScreenshotRefusal = {
  /** A frase que aparece na tela, dizendo o que fazer — a mesma nos dois lados. */
  message: string;
};

/**
 * Este arquivo serve como print? Devolve nulo quando serve, e o motivo quando não.
 */
export function refuseScreenshot(file: {
  contentType: string;
  sizeBytes: number;
}): ScreenshotRefusal | null {
  if (!isScreenshotType(file.contentType)) {
    return { message: 'O print precisa ser uma imagem (PNG, JPG, WEBP, GIF ou BMP).' };
  }

  if (file.sizeBytes > SCREENSHOT_MAX_BYTES) {
    return {
      message: `O print passa de ${Math.round(SCREENSHOT_MAX_BYTES / MEGABYTE)} MB. Envie uma imagem menor.`,
    };
  }

  return null;
}
