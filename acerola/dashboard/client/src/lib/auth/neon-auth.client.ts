import { createAuthClient } from '@neondatabase/neon-js/auth';

/**
 * A LIGAÇÃO COM O NEON AUTH — o único lugar da tela que fala de login.
 *
 * Quem autentica é a Neon: e-mail e senha vão da tela direto para lá, e a senha nunca passa
 * pela nossa API nem fica guardada por nós. De volta vem um token assinado, que o
 * `http-client` carimba em cada chamada e o servidor confere.
 *
 * O endereço é público: ele só diz ONDE o login acontece. O segredo
 * continua sendo a senha de cada pessoa, que só a Neon vê.
 */
let resolvedUrl = (import.meta.env.VITE_NEON_AUTH_URL ?? '').trim();
let activeClient = createAuthClient(resolvedUrl);
let resolvePromise: Promise<typeof activeClient> | null = null;

async function fetchNeonAuthUrl(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/config');
    if (!response.ok) return null;

    const data = (await response.json()) as { neonAuthUrl?: string };
    const url = data?.neonAuthUrl?.trim();
    return url || null;
  } catch {
    return null;
  }
}

/**
 * Garante que a URL do Neon Auth esteja disponível.
 * Se ela não veio no bundle do Vite (ex.: Docker no Render), busca da rota `/api/auth/config`.
 */
export async function ensureNeonAuthClient(): Promise<typeof activeClient> {
  if (resolvedUrl) return activeClient;
  if (resolvePromise) return resolvePromise;

  resolvePromise = (async () => {
    const remoteUrl = await fetchNeonAuthUrl();
    if (remoteUrl) {
      resolvedUrl = remoteUrl;
      activeClient = createAuthClient(resolvedUrl) as typeof activeClient;
    }
    return activeClient;
  })();

  const result = await resolvePromise;
  resolvePromise = null;
  return result;
}

/**
 * Cliente Neon Auth acessível por proxy para sincronizar com atualizações da URL de runtime.
 */
export const neonAuth: typeof activeClient = new Proxy(activeClient, {
  get(_target, prop, receiver) {
    if (prop === 'signIn') {
      return {
        email: async (params: Parameters<typeof activeClient.signIn.email>[0]) => {
          await ensureNeonAuthClient();
          return activeClient.signIn.email(params);
        },
      };
    }

    const value = Reflect.get(activeClient, prop, receiver);
    if (typeof value === 'function') {
      return async (...args: unknown[]) => {
        await ensureNeonAuthClient();
        const fn = Reflect.get(activeClient, prop) as (...a: unknown[]) => unknown;
        return Reflect.apply(fn, activeClient, args);
      };
    }

    return value;
  },
});

/**
 * O token que prova, para a NOSSA API, quem está pedindo.
 *
 * Vem do Neon Auth a cada chamada em vez de ser guardado por nós: ele vale poucos minutos e
 * é renovado sozinho pela biblioteca. Guardar uma cópia em `localStorage` criaria uma
 * segunda verdade sobre "quem está logado" — e, num escritório de máquinas compartilhadas,
 * faria a próxima pessoa herdar a sessão da anterior.
 *
 * Devolve `null` quando não há sessão ou quando a autenticação ainda não foi configurada;
 * quem chama trata isso como "não logado".
 */
export async function readAuthToken(): Promise<string | null> {
  try {
    await ensureNeonAuthClient();
    if (!resolvedUrl) return null;

    const result = await neonAuth.token();
    if (!result) return null;

    const anyResult = result as unknown as { token?: string; data?: string | { token?: string } };
    if (typeof anyResult.token === 'string') {
      return anyResult.token;
    }
    if (typeof anyResult.data === 'string') {
      return anyResult.data;
    }
    if (anyResult.data && typeof anyResult.data.token === 'string') {
      return anyResult.data.token;
    }

    return null;
  } catch {
    /* Sem rede, ou o Neon Auth fora do ar: sem token. A chamada seguinte recebe 401 e a
       guarda manda para o login, que é exatamente o que a pessoa precisa fazer. */
    return null;
  }
}
