/**
 * Lê o cabeçalho `Cookie` sem a lib `cookie-parser`: é uma linha só de formato conhecido, e
 * adicionar dependência para isso seria trocar uma linha por um pacote.
 *
 * Não lê cookie assinado nem criptografado — não precisa: o valor da sessão é um token
 * aleatório opaco (`session-token.util.ts`), sem informação nenhuma para proteger além de si
 * mesmo, e ele já é validado contra a tabela `sessions` a cada requisição.
 */
export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;

  for (const part of header.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;

    const name = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (!name) continue;

    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }

  return cookies;
}
