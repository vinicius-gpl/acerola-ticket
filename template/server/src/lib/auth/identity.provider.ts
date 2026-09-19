import { sessionUserSchema, type SessionUser } from '@template/shared/schemas/user.schema';

/**
 * De onde a identidade vem — e só daqui.
 *
 * O template não tem login: num MVP, tela de login é trabalho que não valida ideia nenhuma.
 * Quando o sistema for para o ar, quem fica na frente da aplicação (um proxy com
 * auth-forward) autentica a pessoa e injeta quem ela é nos cabeçalhos abaixo. Enquanto isso
 * não existe, a identidade é a pessoa fixa `MOCK_IDENTITY`.
 *
 * O MOCK NÃO É UM DESVIO DO CAMINHO. Ele é uma origem de identidade como outra qualquer: a
 * requisição continua passando pelo middleware, continua sendo recusada quando não há
 * identidade, e a autoria continua saindo daqui para `createdBy` e `updatedBy`. O dia em que
 * o auth-forward entrar, muda só este arquivo — nenhum controller, service ou policy.
 *
 * ⚠ ANTES DE PUBLICAR: o mock dá papel `admin` a quem não mandar cabeçalho nenhum. Com o
 * sistema acessível pela internet sem um proxy na frente, isso é a porta aberta. Ver
 * README, seção "Como a identidade funciona".
 */
export const FORWARDED_IDENTITY_HEADERS = {
  id: 'x-forwarded-user-id',
  email: 'x-forwarded-user-email',
  name: 'x-forwarded-user-name',
  role: 'x-forwarded-user-role',
} as const;

/** A pessoa fixa, enquanto não há provedor. Mesma forma de uma identidade encaminhada. */
export const MOCK_IDENTITY: SessionUser = {
  id: 'mock-open-login',
  email: 'dev@template.local',
  name: 'Usuário de desenvolvimento',
  role: 'admin',
};

export type HeaderBag = Record<string, unknown>;

/**
 * Lê a identidade dos cabeçalhos encaminhados.
 *
 * Devolve `null` quando NÃO HÁ nada encaminhado — é o caso normal no MVP, e quem chama cai no
 * mock. Mas devolve `null` também quando os cabeçalhos vieram e não formam uma identidade
 * válida, e essa diferença é deliberada: cabeçalho pela metade significa provedor mal
 * configurado, e completar o que falta com o mock daria acesso de administrador a uma
 * requisição que o provedor não soube identificar.
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
