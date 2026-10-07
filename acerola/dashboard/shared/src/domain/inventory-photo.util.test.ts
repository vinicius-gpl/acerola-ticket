import { describe, expect, it } from 'vitest';

import {
  INVENTORY_PHOTO_MAX_BYTES,
  inventoryPhotoAccept,
  isInventoryPhotoType,
  refuseInventoryPhoto,
} from './inventory-photo.util';

describe('refuseInventoryPhoto', () => {
  // feliz
  it('accepts a photo of an accepted format within the size limit', () => {
    expect(refuseInventoryPhoto({ contentType: 'image/jpeg', sizeBytes: 2048 })).toBeNull();
  });

  /* O navegador manda o tipo em caixa alta em alguns sistemas; recusar por isso seria engano. */
  it('does not care about the case of the content type', () => {
    expect(isInventoryPhotoType('IMAGE/PNG')).toBe(true);
  });

  it('lists the accepted formats for the file field', () => {
    expect(inventoryPhotoAccept()).toContain('image/png');
    expect(inventoryPhotoAccept()).not.toContain('image/svg+xml');
  });

  // triste
  it('refuses a file that is not an image, saying what is accepted', () => {
    const refusal = refuseInventoryPhoto({ contentType: 'application/pdf', sizeBytes: 1024 });

    expect(refusal?.message).toContain('imagem');
  });

  it('refuses an image over the limit, saying what to do', () => {
    const refusal = refuseInventoryPhoto({
      contentType: 'image/png',
      sizeBytes: INVENTORY_PHOTO_MAX_BYTES + 1,
    });

    expect(refusal?.message).toContain('menor');
  });

  /* O limite é o teto, não o primeiro byte recusado. */
  it('accepts a photo exactly at the limit (edge case)', () => {
    expect(
      refuseInventoryPhoto({ contentType: 'image/png', sizeBytes: INVENTORY_PHOTO_MAX_BYTES }),
    ).toBeNull();
  });
});
