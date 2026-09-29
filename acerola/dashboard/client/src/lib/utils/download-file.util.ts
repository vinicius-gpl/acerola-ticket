/**
 * Faz o navegador baixar um arquivo que já está em memória (um `Blob` vindo da API), sem
 * precisar de um endereço fixo para ele — o link é criado, usado uma vez e desfeito.
 */
export function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;

  document.body.appendChild(anchor);

  /**
   * `finally`: a limpeza acontece MESMO SE O CLIQUE FALHAR.
   *
   * `createObjectURL` prende o arquivo inteiro na memória do navegador até alguém desfazer o
   * endereço. Com a limpeza depois do clique, um clique que explodisse — bloqueador de
   * pop-up, extensão, navegador antigo — deixaria o relatório inteiro preso ali e um link
   * morto pendurado na página, a cada tentativa. A aba iria engordando sem nada na tela
   * explicando por quê.
   */
  try {
    anchor.click();
  } finally {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
