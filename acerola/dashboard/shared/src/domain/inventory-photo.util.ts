/**
 * A FOTO DO PRODUTO do inventário — uma imagem só, de um formato aceito.
 *
 * A MESMA regra nas duas pontas, pelo mesmo motivo do print de chamado
 * (`screenshot-catalog.util`): a tela recusa o arquivo errado na hora da escolha, e a API
 * recusa de novo quem tentar pelo caminho de trás.
 *
 * Existe separado do print porque o limite e a frase são outros: print é captura de tela,
 * foto de produto é foto de celular — e a frase que a pessoa lê precisa falar de produto.
 */

const MEGABYTE = 1024 * 1024;

export const INVENTORY_PHOTO_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
] as const;

/** 12 MB cobre foto de celular moderno sem obrigar ninguém a reduzir a imagem antes. */
export const INVENTORY_PHOTO_MAX_BYTES = 12 * MEGABYTE;

export function isInventoryPhotoType(contentType: string): boolean {
  return (INVENTORY_PHOTO_MIME_TYPES as readonly string[]).includes(
    contentType.trim().toLowerCase(),
  );
}

/** O `accept` do campo de arquivo — mais preciso que `image/*`, que aceita até SVG e TIFF. */
export function inventoryPhotoAccept(): string {
  return INVENTORY_PHOTO_MIME_TYPES.join(',');
}

export type InventoryPhotoRefusal = {
  /** A frase que aparece na tela, dizendo o que fazer — a mesma nos dois lados. */
  message: string;
};

/** Este arquivo serve como foto do produto? Nulo quando serve, o motivo quando não. */
export function refuseInventoryPhoto(file: {
  contentType: string;
  sizeBytes: number;
}): InventoryPhotoRefusal | null {
  if (!isInventoryPhotoType(file.contentType)) {
    return { message: 'A foto precisa ser uma imagem (PNG, JPG, WEBP ou HEIC).' };
  }

  if (file.sizeBytes > INVENTORY_PHOTO_MAX_BYTES) {
    return {
      message: `A foto passa de ${Math.round(INVENTORY_PHOTO_MAX_BYTES / MEGABYTE)} MB. Envie uma imagem menor.`,
    };
  }

  return null;
}
