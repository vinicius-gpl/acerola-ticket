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

  // triste
  /**
   * O ENDEREÇO TEMPORÁRIO É DESFEITO MESMO QUANDO O CLIQUE FALHA.
   *
   * `createObjectURL` prende o arquivo inteiro na memória do navegador até alguém desfazer o
   * endereço. Se o clique explodir — bloqueador de pop-up, extensão, navegador antigo — e o
   * `revoke` ficar para depois, cada tentativa de baixar deixaria um relatório inteiro preso
   * ali, e a aba iria engordando sem nada na tela explicando por quê.
   */
  it('gives the temporary address back even when the click blows up', () => {
    const objectUrl = 'blob:http://localhost/abc';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(objectUrl);
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('click blocked');
    });

    expect(() => triggerBrowserDownload(new Blob(['conteúdo']), 'chamados.pdf')).toThrow();

    expect(revoke).toHaveBeenCalledWith(objectUrl);
    /* E o link não fica pendurado na página depois do tombo. */
    expect(document.querySelector('a[download="chamados.pdf"]')).toBeNull();
  });
});
