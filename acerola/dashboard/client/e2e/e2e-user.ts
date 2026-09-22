/**
 * A CONTA que o E2E da tela usa para entrar.
 *
 * Antes o teste criava a conta direto no banco. Não dá mais, e isso é consequência de uma
 * decisão e não uma falta: quem guarda as pessoas agora é o **Neon Auth**, e contas nascem no
 * painel dele — não numa tabela nossa. Então o E2E precisa de uma conta de teste DE VERDADE,
 * criada uma vez no painel, cujo e-mail e senha ficam no `server/.env` (que não é versionado).
 *
 * Sem essas variáveis, os testes que precisam entrar no sistema são pulados em vez de
 * falharem: quem só mexeu na tela não deve precisar de conta na nuvem para rodar o resto.
 */
export type E2eUser = { email: string; password: string };

export function readE2eUser(): E2eUser | null {
  const email = process.env.E2E_USER_EMAIL?.trim();
  const password = process.env.E2E_USER_PASSWORD?.trim();
  if (!email || !password) return null;

  return { email, password };
}

export const E2E_USER = readE2eUser();

/** A razão de pular, escrita para quem vai ler o resultado do teste e decidir o que fazer. */
export const NO_E2E_USER =
  'Precisa de E2E_USER_EMAIL e E2E_USER_PASSWORD no server/.env (conta de teste criada no painel do Neon Auth)';
