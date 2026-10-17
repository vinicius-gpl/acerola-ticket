import { type HistoryChange, type HistoryInsert } from '../../../lib/db/schema/history.schema';

/** O que a requisição que mudou dado deixa para o histórico, já sem nada do Express. */
export type MutationRequest = {
  method: string;
  /** O caminho da rota com os parâmetros, como `/api/tickets/:id/areas`. */
  routePath: string;
  handler: string;
  params: Record<string, string | undefined>;
  body: unknown;
  fileNames: string[];
  actor: { id: string; email: string } | null;
  ip: string | null;
  userAgent: string | null;
};

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/* Segredo não vai para o histórico: quem lê a tabela não precisa do token para saber que ele
   foi trocado. */
const SECRET_FIELD = /token|password|secret|signature|authorization/i;
const REDACTED = '[redacted]';

/* Texto longo (descrição de chamado, corpo de modelo) é cortado: o histórico diz que mudou,
   o registro em si continua com o texto inteiro. */
const TEXT_MAX_LENGTH = 500;

const LABEL_FIELDS = ['protocol', 'name', 'title', 'serialNumber', 'email'] as const;

export function isMutation(method: string): boolean {
  return MUTATING_METHODS.has(method.toUpperCase());
}

/**
 * A linha do histórico de uma requisição que deu certo.
 *
 * Como a mudança chega pela API, o `from` de cada campo fica nulo: o histórico registra o
 * que a pessoa mandou gravar, e quando.
 */
export function historyEntryOf(request: MutationRequest, result: unknown): HistoryInsert {
  const targetType = targetTypeOf(request.routePath);

  return {
    action: `${targetType ?? 'api'}.${request.handler}`,
    actorId: request.actor?.id ?? null,
    actorEmail: request.actor?.email ?? null,
    targetType,
    targetId: request.params.id ?? idOf(result),
    targetLabel: labelOf(result),
    ip: request.ip,
    userAgent: request.userAgent,
    changes: changesOf(request.body, request.fileNames),
  };
}

/* O primeiro pedaço do caminho depois de `/api`: `/api/tickets/:id` → `tickets`. */
function targetTypeOf(routePath: string): string | null {
  const segments = routePath.split('/').filter((segment) => segment !== '' && segment !== 'api');
  const first = segments[0];

  return first && !first.startsWith(':') ? first : null;
}

function recordOf(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  return value as Record<string, unknown>;
}

/* A resposta de quem cria traz o id novo — às vezes direto, às vezes dentro de `data`. */
function payloadOf(result: unknown): Record<string, unknown> | null {
  const record = recordOf(result);

  return recordOf(record?.data) ?? record;
}

function idOf(result: unknown): string | null {
  const id = payloadOf(result)?.id;
  if (typeof id === 'number' || typeof id === 'string') return String(id);

  return null;
}

function labelOf(result: unknown): string | null {
  const payload = payloadOf(result);
  if (!payload) return null;

  const label = LABEL_FIELDS.map((field) => payload[field]).find(
    (value) => typeof value === 'string' && value.trim() !== '',
  );

  return typeof label === 'string' ? label : null;
}

function changesOf(body: unknown, fileNames: string[]): HistoryChange[] {
  const fields = Object.entries(recordOf(body) ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([field, value]) => ({ field, from: null, to: safeValue(field, value) }));
  if (fileNames.length === 0) return fields;

  return [...fields, { field: 'files', from: null, to: fileNames }];
}

function safeValue(field: string, value: unknown): unknown {
  if (SECRET_FIELD.test(field)) return REDACTED;
  if (typeof value !== 'string' || value.length <= TEXT_MAX_LENGTH) return value;

  return `${value.slice(0, TEXT_MAX_LENGTH)}…`;
}
