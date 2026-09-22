import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

/**
 * A CONFERÊNCIA DO TOKEN — o ponto em que a API decide se acredita em quem está pedindo.
 *
 * A tela faz login no Neon Auth e recebe um token assinado. Ele chega aqui no cabeçalho
 * `Authorization: Bearer <token>`, e este arquivo confere a assinatura contra as chaves
 * públicas que a Neon publica (JWKS). É assinatura, não senha: a API nunca vê a senha de
 * ninguém e não precisa perguntar nada à Neon a cada requisição.
 *
 * Conferir de verdade é o que separa isto de "confiar no que o navegador disse". Sem a
 * checagem de assinatura, qualquer pessoa montaria um token dizendo ser administradora.
 */

/** O que interessa do conteúdo do token. O resto (validade, emissor) já foi conferido. */
export type NeonTokenClaims = {
  userId: string;
  email: string | null;
  name: string | null;
};

export type NeonTokenVerifier = (token: string) => Promise<NeonTokenClaims | null>;

/**
 * Monta o verificador uma vez, na partida.
 *
 * `createRemoteJWKSet` guarda as chaves em memória e só volta à Neon quando aparece uma
 * chave que ele não conhece (rotação). Criar um por requisição faria uma ida à internet a
 * cada clique da pessoa.
 */
export function createNeonTokenVerifier(authUrl: string): NeonTokenVerifier {
  const jwks = createRemoteJWKSet(new URL(`${trimSlash(authUrl)}/.well-known/jwks.json`));
  const issuer = new URL(authUrl).origin;

  return async (token: string): Promise<NeonTokenClaims | null> => {
    try {
      const { payload } = await jwtVerify(token, jwks, { issuer });

      return toClaims(payload);
    } catch {
      /* Token vencido, assinatura errada, emissor errado, texto que nem é token: tudo isso é
         a mesma resposta para quem chamou — "não sei quem é você". Distinguir os motivos na
         resposta contaria a quem está tentando adivinhar o que faltou acertar. */
      return null;
    }
  };
}

/**
 * O `sub` é o id da pessoa no Neon Auth, e é o único campo indispensável: nome e e-mail
 * mudam no cadastro, e quem manda sobre eles é a tabela `neon_auth.user`, não o token —
 * um token emitido antes de a pessoa trocar o nome traria o nome antigo.
 */
function toClaims(payload: JWTPayload): NeonTokenClaims | null {
  const userId = typeof payload.sub === 'string' ? payload.sub.trim() : '';
  if (!userId) return null;

  return {
    userId,
    email: readString(payload.email),
    name: readString(payload.name),
  };
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
}

/** Aceita a URL com ou sem barra no fim: os dois formatos aparecem no painel da Neon. */
function trimSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

/** Lê o token do cabeçalho `Authorization: Bearer <token>`. Sem cabeçalho, sem token. */
export function readBearerToken(header: unknown): string | null {
  const single = Array.isArray(header) ? header[0] : header;
  if (typeof single !== 'string') return null;

  const [scheme, token] = single.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== 'bearer') return null;
  if (!token) return null;

  return token;
}
