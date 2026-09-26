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
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}
