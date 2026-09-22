import { sessionUserSchema, type SessionUser } from '@template/shared/schemas/user.schema';

/**
 * De onde a identidade encaminhada (`auth-forward`) vem — e só daqui.
 *
 * Este é UM dos dois jeitos de alguém chegar autenticado: o outro é o login próprio, resolvido
 * por `SessionRepository` a partir do cookie de sessão. Este arquivo cuida só do caso em que o
 * projeto fica atrás de um proxy que já autenticou a pessoa e injeta quem ela é nos cabeçalhos
 * abaixo — `AuthenticationMiddleware` tenta a sessão primeiro, e só cai aqui se não achar uma.
 */
export const FORWARDED_IDENTITY_HEADERS = {
  id: 'x-forwarded-user-id',
  email: 'x-forwarded-user-email',
  name: 'x-forwarded-user-name',
  role: 'x-forwarded-user-role',
} as const;

export type HeaderBag = Record<string, unknown>;

/**
 * Lê a identidade dos cabeçalhos encaminhados.
 *
 * Devolve `null` quando NÃO HÁ nada encaminhado — o caso normal para quem loga pela tela, sem
 * `auth-forward` configurado. Mas devolve `null` também quando os cabeçalhos vieram e não
 * formam uma identidade válida, e essa diferença é deliberada: cabeçalho pela metade significa
 * provedor mal configurado — ver `hasForwardedHeaders`, que é o que distingue os dois casos
 * para o middleware.
 */
export function readForwardedIdentity(headers: HeaderBag): SessionUser | null {
  const raw = {
    id: readHeader(headers, FORWARDED_IDENTITY_HEADERS.id),
    email: readHeader(headers, FORWARDED_IDENTITY_HEADERS.email),
    name: readHeader(headers, FORWARDED_IDENTITY_HEADERS.name),
    role: readHeader(headers, FORWARDED_IDENTITY_HEADERS.role),
  };

  const isEmpty = Object.values(raw).every((value) => value === null);
  if (isEmpty) return null;

  const parsed = sessionUserSchema.safeParse(raw);

  return parsed.success ? parsed.data : null;
}

/**
 * Diz se o provedor TENTOU identificar alguém. É o que separa "ainda não há auth-forward"
 * de "o auth-forward mandou algo quebrado" — e só o segundo é um erro a mostrar.
 */
export function hasForwardedHeaders(headers: HeaderBag): boolean {
  return Object.values(FORWARDED_IDENTITY_HEADERS).some(
    (header) => readHeader(headers, header) !== null,
  );
}

function readHeader(headers: HeaderBag, name: string): string | null {
  const value = headers[name] ?? headers[name.toLowerCase()];
  // Cabeçalho repetido chega como lista; o primeiro é o que o provedor mandou primeiro.
  const single = Array.isArray(value) ? value[0] : value;
  if (typeof single !== 'string') return null;
  const trimmed = single.trim();

  return trimmed === '' ? null : trimmed;
}
