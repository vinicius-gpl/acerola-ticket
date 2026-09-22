import { createAuthClient } from '@neondatabase/neon-js/auth';

/**
 * A LIGAÇÃO COM O NEON AUTH — o único lugar da tela que fala de login.
 *
 * Quem autentica é a Neon: e-mail e senha vão da tela direto para lá, e a senha nunca passa
 * pela nossa API nem fica guardada por nós. De volta vem um token assinado, que o
 * `http-client` carimba em cada chamada e o servidor confere.
 *
 * O endereço é público de propósito (`VITE_`): ele só diz ONDE o login acontece. O segredo
 * continua sendo a senha de cada pessoa, que só a Neon vê.
 */
const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL ?? '';

if (!NEON_AUTH_URL) {
  /* Falhar aqui, na partida, é melhor do que uma tela de login que parece funcionar e recusa
     toda senha digitada — o erro apareceria como "senha errada" e ninguém acharia a causa. */
  throw new Error(
    'VITE_NEON_AUTH_URL não configurada: a tela de login não tem para onde mandar e-mail e senha. ' +
      'Copie client/.env.example para client/.env e preencha com a URL do Neon Auth.',
  );
}

export const neonAuth = createAuthClient(NEON_AUTH_URL);

/**
 * O token que prova, para a NOSSA API, quem está pedindo.
 *
 * Vem do Neon Auth a cada chamada em vez de ser guardado por nós: ele vale poucos minutos e
 * é renovado sozinho pela biblioteca. Guardar uma cópia em `localStorage` criaria uma
 * segunda verdade sobre "quem está logado" — e, num escritório de máquinas compartilhadas,
 * faria a próxima pessoa herdar a sessão da anterior.
 *
 * Devolve `null` quando não há sessão; quem chama trata isso como "não logado".
 */
export async function readAuthToken(): Promise<string | null> {
  try {
    const result = await neonAuth.token();

    return result.data?.token ?? null;
  } catch {
    /* Sem rede, ou o Neon Auth fora do ar: sem token. A chamada seguinte recebe 401 e a
       guarda manda para o login, que é exatamente o que a pessoa precisa fazer. */
    return null;
  }
}
