/**
 * Sobe na porta pedida; se ela estiver ocupada, tenta as seguintes.
 *
 * Porta ocupada é o erro de ambiente mais comum de todos — outro projeto aberto, uma
 * execução anterior que não morreu — e derrubar a partida por causa disso obriga a pessoa a
 * caçar processo antes de conseguir trabalhar.
 *
 * Só `EADDRINUSE` faz tentar de novo. Qualquer outra falha (porta abaixo de 1024 sem
 * permissão, endereço inválido) é relançada na hora: insistir nelas trocaria uma mensagem
 * clara por dez tentativas e uma mensagem confusa.
 *
 * Recebe a função de subir em vez do app do Nest para poder ser testada sem abrir socket.
 */
export async function listenOnFirstFreePort(
  listen: (port: number) => Promise<unknown>,
  preferredPort: number,
  maxAttempts = 10,
): Promise<number> {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = preferredPort + offset;

    if (await tryListen(listen, port)) return port;
  }

  throw new Error(
    `As portas de ${preferredPort} a ${preferredPort + maxAttempts - 1} estão todas ocupadas. ` +
      'Feche o que está usando essas portas, ou mude API_PORT no .env.',
  );
}

/**
 * Uma tentativa. Devolve `false` quando a porta está ocupada e relança qualquer outra falha.
 *
 * Existe separada só para o laço acima não aninhar `for`, `try` e `if` — três níveis passam
 * do limite de profundidade do projeto, e o motivo da regra aparece aqui: com os três juntos
 * fica difícil ver, de relance, que o `return` sai do laço e o `throw` sai da função.
 */
async function tryListen(listen: (port: number) => Promise<unknown>, port: number): Promise<boolean> {
  try {
    await listen(port);

    return true;
  } catch (error) {
    if (!isPortInUse(error)) throw error;

    return false;
  }
}

/**
 * O `EADDRINUSE` chega embrulhado quando o Nest repassa o erro do servidor HTTP, então a
 * causa é seguida até o fim — parar no primeiro nível faria a troca de porta nunca acontecer.
 */
export function isPortInUse(error: unknown, depth = 0): boolean {
  if (depth > 5) return false;
  if (typeof error !== 'object' || error === null) return false;

  const candidate = error as { code?: unknown; cause?: unknown };
  if (candidate.code === 'EADDRINUSE') return true;

  return isPortInUse(candidate.cause, depth + 1);
}
