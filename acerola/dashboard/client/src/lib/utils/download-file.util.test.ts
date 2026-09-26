import { afterEach, describe, expect, it, vi } from 'vitest';

import { triggerBrowserDownload } from './download-file.util';

describe('triggerBrowserDownload', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // feliz
  it('clicks a link with the name the server chose, and cleans up after itself', () => {
    const objectUrl = 'blob:http://localhost/abc';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(objectUrl);
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    triggerBrowserDownload(new Blob(['conteúdo']), 'chamados.pdf');

    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith(objectUrl);
    /* Some da página depois de clicar: um link parado ali não serve para mais nada. */
    expect(document.querySelector('a[download="chamados.pdf"]')).toBeNull();
  });
});
