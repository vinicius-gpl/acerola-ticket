import {
  ConflictException,
  type HttpException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Traduz erro do Postgres para status HTTP.
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
 * O erro do Postgres vem EMBRULHADO pelo Drizzle.
 *
 * O Drizzle lança um erro com a consulta, e o erro de verdade fica em `.cause`. Ler só o
 * nível de cima faria todo conflito virar 500. Vale para qualquer profundidade.
 *
 * Reconhecer pelo `name` do driver, e não só pelo `code`: erro do Node também tem `code`
 * (`ENOENT`, `EACCES`), e confundi-los faria "sem permissão no disco" virar "valor inválido".
 * O `severity` entra como segunda marca porque é campo que só o protocolo do Postgres traz.
 */
export type PostgresErrorShape = {
  code: string;
  message?: string;
  constraint_name?: string;
};

const SQLSTATE = /^[0-9A-Z]{5}$/;

export function findPostgresError(error: unknown, depth = 0): PostgresErrorShape | null {
  if (depth > 5) return null;
  if (typeof error !== 'object' || error === null) return null;

  const candidate = error as {
    name?: unknown;
    code?: unknown;
    severity?: unknown;
    cause?: unknown;
  };
  const hasSqlState = typeof candidate.code === 'string' && SQLSTATE.test(candidate.code);

  if (hasSqlState && (candidate.name === 'PostgresError' || typeof candidate.severity === 'string')) {
    return candidate as PostgresErrorShape;
  }

  return findPostgresError(candidate.cause, depth + 1);
}

/**
 * Qual restrição o banco recusou.
 *
 * Aqui o Postgres é melhor que o SQLite: ele diz o NOME da restrição num campo próprio
 * (`constraint_name`), em vez de escondê-lo no meio da mensagem. A versão SQLite disto
 * precisava de expressão regular sobre o texto do erro — e quebrava quando a mensagem mudava
 * de formato entre versões.
 */
export function constraintNameOf(error: PostgresErrorShape): string {
  return error.constraint_name?.trim() ?? '';
}

/**
 * Mensagem de conflito por restrição única. "Já existe" sozinho não ajuda: diga o que a
 * pessoa deve fazer em vez de criar outro.
 *
 * A chave é o nome da restrição no banco. Exemplo, quando existir:
 * `'customers_email_unique': 'Já existe um cliente com este e-mail.'`
 */
const CONFLICT_MESSAGES: Record<string, string> = {};

/** Mensagem por `check` do banco, pela mesma chave. */
const CHECK_MESSAGES: Record<string, string> = {
  tasks_status_valid: 'A situação da tarefa precisa ser uma das opções da lista.',
};

/** Códigos SQLSTATE. A lista do Postgres é estável há décadas; os nomes vão nos comentários. */
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const CHECK_VIOLATION = '23514';

/** not_null_violation, invalid_text_representation, string_data_right_truncation. */
const REFUSED_VALUE_CODES = new Set(['23502', '22P02', '22001', '22003']);

/**
 * serialization_failure, deadlock_detected, lock_not_available, query_canceled e as falhas
 * de conexão. Nenhum é culpa de quem digitou, e nenhum é defeito permanente.
 */
const BUSY_CODES = new Set(['40001', '40P01', '55P03', '57014', '08000', '08003', '08006']);

export function toHttpException(error: unknown, context: string): HttpException {
  const postgresError = findPostgresError(error);
  if (!postgresError) return unknownFailure(error, context);

  const key = constraintNameOf(postgresError);

  if (postgresError.code === UNIQUE_VIOLATION) {
    return new ConflictException(CONFLICT_MESSAGES[key] ?? 'Este registro já existe.');
  }

  if (postgresError.code === CHECK_VIOLATION) {
    return new UnprocessableEntityException(
      CHECK_MESSAGES[key] ?? 'O banco recusou o valor enviado.',
    );
  }

  if (postgresError.code === FOREIGN_KEY_VIOLATION) {
    return new UnprocessableEntityException(
      'O registro aponta para algo que não existe mais. Recarregue a tela e tente de novo.',
    );
  }

  if (REFUSED_VALUE_CODES.has(postgresError.code)) {
    return new UnprocessableEntityException('O banco recusou o valor enviado.');
  }

  /* Ocupado não é erro de quem digitou nem defeito permanente: é 503, e a tela pode dizer
     "tente de novo em instantes" com verdade. */
  if (BUSY_CODES.has(postgresError.code)) {
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
