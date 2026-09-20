import {
  ConflictException,
  type HttpException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Traduz erro do SQLite para status HTTP.
 *
 * "Erro do banco não vira 200" é regra do CONTRIBUTING, e esta função é onde ela mora. Uma
 * recusa do banco engolida em `catch` chega na equipe como "não está salvando" — sem o
 * motivo, cada caso vira investigação do zero.
 *
 * O status importa porque muda o que a tela mostra:
 *  - 4xx é algo que a pessoa consegue resolver (já existe, valor inválido);
 *  - 5xx é nosso, e a tela precisa dizer isso em vez de culpar quem digitou.
 */

/**
 * O erro do SQLite vem EMBRULHADO pelo Drizzle.
 *
 * O Drizzle lança um erro com a consulta, e o erro de verdade — com `code` — fica em `.cause`.
 * Ler só o nível de cima faria todo conflito virar 500. Vale para qualquer profundidade.
 *
 * Só conta `code` que começa com `SQLITE_`: erro do Node também tem `code` (`ENOENT`,
 * `EACCES`), e confundi-los faria "pasta sem permissão" virar "valor inválido".
 */
export type SqliteErrorShape = {
  code: string;
  message?: string;
};

export function findSqliteError(error: unknown, depth = 0): SqliteErrorShape | null {
  if (depth > 5) return null;
  if (typeof error !== 'object' || error === null) return null;

  const candidate = error as { code?: unknown; message?: unknown; cause?: unknown };
  if (typeof candidate.code === 'string' && candidate.code.startsWith('SQLITE_')) {
    return candidate as SqliteErrorShape;
  }

  return findSqliteError(candidate.cause, depth + 1);
}

/**
 * O SQLite não dá nome à restrição única: ele diz as COLUNAS. "UNIQUE constraint failed:
 * tasks.title" vira a chave `tasks.title`.
 */
export function constraintColumnsOf(error: SqliteErrorShape): string {
  const match = /constraint failed: (.+)$/i.exec(error.message ?? '');

  return match?.[1]?.trim() ?? '';
}

/**
 * Mensagem de conflito por coluna única. "Já existe" sozinho não ajuda: diga o que a pessoa
 * deve fazer em vez de criar outro.
 *
 * Exemplo, quando existir: `'customers.email': 'Já existe um cliente com este e-mail.'`
 */
const CONFLICT_MESSAGES: Record<string, string> = {};

/** Mensagem por `check` do banco (o nome da checagem vem no lugar das colunas). */
const CHECK_MESSAGES: Record<string, string> = {
  tasks_status_valid: 'A situação da tarefa precisa ser uma das opções da lista.',
};

const CONFLICT_CODES = new Set(['SQLITE_CONSTRAINT_UNIQUE', 'SQLITE_CONSTRAINT_PRIMARYKEY']);

const REFUSED_VALUE_CODES = new Set(['SQLITE_CONSTRAINT_NOTNULL', 'SQLITE_MISMATCH']);

const BUSY_CODES = new Set(['SQLITE_BUSY', 'SQLITE_LOCKED']);

export function toHttpException(error: unknown, context: string): HttpException {
  const sqliteError = findSqliteError(error);
  if (!sqliteError) return unknownFailure(error, context);

  const key = constraintColumnsOf(sqliteError);

  if (CONFLICT_CODES.has(sqliteError.code)) {
    return new ConflictException(CONFLICT_MESSAGES[key] ?? 'Este registro já existe.');
  }

  if (sqliteError.code === 'SQLITE_CONSTRAINT_CHECK') {
    return new UnprocessableEntityException(
      CHECK_MESSAGES[key] ?? 'O banco recusou o valor enviado.',
    );
  }

  if (sqliteError.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return new UnprocessableEntityException(
      'O registro aponta para algo que não existe mais. Recarregue a tela e tente de novo.',
    );
  }

  if (REFUSED_VALUE_CODES.has(sqliteError.code)) {
    return new UnprocessableEntityException('O banco recusou o valor enviado.');
  }

  /* Ocupado não é erro de quem digitou nem defeito permanente: é 503, e a tela pode dizer
     "tente de novo em instantes" com verdade. */
  if (BUSY_CODES.has(sqliteError.code)) {
    return new ServiceUnavailableException(
      'O banco está ocupado com outra gravação. Tente de novo em instantes.',
    );
  }

  return unknownFailure(error, context);
}

/**
 * Sem tradução conhecida é 500 de propósito: chamar de 4xx faria a tela culpar quem digitou
 * por um defeito nosso, e o problema nunca chegaria até nós.
 */
function unknownFailure(error: unknown, context: string): HttpException {
  const message = error instanceof Error ? error.message : String(error);

  return new InternalServerErrorException(`Falha ao ${context}: ${message}`);
}

/**
 * Roda a consulta e traduz a falha. Toda leitura e escrita passa por aqui — é o que garante
 * que nenhuma recusa do banco chegue à tela como "erro inesperado".
 */
export async function runQuery<T>(query: PromiseLike<T>, context: string): Promise<T> {
  try {
    return await query;
  } catch (error) {
    throw toHttpException(error, context);
  }
}

/**
 * Para consulta que devolve no máximo uma linha e cuja ausência é resposta legítima.
 *
 * Devolve `null` quando não achou, e LANÇA quando o banco recusou — a diferença entre "não
 * existe" e "não pude ler" é justamente a que se perde quando as duas viram `null`.
 */
export async function runMaybe<T>(query: PromiseLike<T[]>, context: string): Promise<T | null> {
  const rows = await runQuery(query, context);

  return rows[0] ?? null;
}

/** Para consulta que precisa achar. Ausência vira 404 com a mensagem certa. */
export async function runOne<T>(
  query: PromiseLike<T[]>,
  context: string,
  notFoundMessage = 'Registro não encontrado.',
): Promise<T> {
  const row = await runMaybe(query, context);
  if (!row) throw new NotFoundException(notFoundMessage);

  return row;
}
