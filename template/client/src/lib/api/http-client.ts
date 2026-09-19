import { type ApiErrorBody } from './api-error.type';

/**
 * Em desenvolvimento a base é `/api`, no mesmo host: o Vite encaminha para o Nest. Em
 * produção `VITE_API_URL` aponta para a API publicada — vazio quando é a mesma imagem.
 *
 * Preferir o caminho relativo em desenvolvimento evita que toda falha de CORS chegue à tela
 * como "erro de rede" — a mesma mensagem de quando a API está fora do ar.
 */
const BASE_URL = import.meta.env.PROD ? `${import.meta.env.VITE_API_URL ?? ''}/api` : '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly details: { field: string; message: string }[];

  constructor(status: number, message: string, details: { field: string; message: string }[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
};

/**
 * A WEB NÃO MANDA IDENTIDADE, e isso é a regra — não uma pendência.
 *
 * Quem diz quem é a pessoa é o servidor (hoje, a pessoa fixa do mock; depois, o proxy de
 * auth-forward). Mandar `x-forwarded-user-*` daqui seria pior que inútil: o navegador passaria
 * a AFIRMAR quem ele é, e qualquer pessoa poderia dizer que é administradora.
 */
export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const response = await fetch(`${BASE_URL}${path}${buildQuery(options.query)}`, {
    method: options.method ?? 'GET',
    signal: options.signal,
    headers: options.body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 204) return undefined as TResponse;
  if (response.ok) return (await response.json()) as TResponse;

  throw await toApiError(response);
}

/**
 * A falha precisa chegar à tela COM O MOTIVO. Recusa do servidor engolida vira chamado de
 * "não está salvando", sem nada para investigar.
 *
 * Quando o corpo não é o formato da API — um 502 do proxy, uma página HTML de erro —, o
 * status vira a mensagem, em vez de um "undefined" na tela.
 */
async function toApiError(response: Response): Promise<ApiError> {
  const body = await readErrorBody(response);
  if (body) return new ApiError(response.status, body.message, body.details ?? []);

  return new ApiError(
    response.status,
    `Não consegui falar com o servidor (${response.status}). Tente de novo em instantes.`,
  );
}

async function readErrorBody(response: Response): Promise<ApiErrorBody | null> {
  try {
    const parsed: unknown = await response.json();
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (!('message' in parsed)) return null;

    return parsed as ApiErrorBody;
  } catch {
    return null;
  }
}

function buildQuery(query: RequestOptions['query']): string {
  if (!query) return '';

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const serialized = params.toString();

  return serialized ? `?${serialized}` : '';
}

/**
 * A mensagem que a tela mostra para qualquer falha.
 *
 * O `ApiError` já traz o texto em português que o servidor escolheu; o resto (rede caída,
 * resposta que não é JSON) vira uma frase que diz o que fazer, em vez de "undefined".
 */
export function readError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError) return error.message;

  return 'Não consegui falar com o servidor. Confira se ele está rodando e tente de novo.';
}
