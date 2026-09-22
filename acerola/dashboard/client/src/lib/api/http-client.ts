import { readAuthToken } from '$lib/auth/neon-auth.client';

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
 * A WEB NUNCA AFIRMA QUEM É — ela APRESENTA uma prova.
 *
 * O que vai no cabeçalho é o token assinado pelo Neon Auth, e o servidor confere a assinatura
 * antes de acreditar em qualquer coisa. É a diferença entre dizer "sou administrador" (o que
 * qualquer pessoa poderia escrever) e mostrar um crachá que só a Neon consegue emitir.
 *
 * Requisição sem token sai assim mesmo, sem cabeçalho: a API responde 401 e a guarda de rota
 * manda para o login. Barrar aqui só esconderia o motivo.
 */
export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const response = await fetch(`${BASE_URL}${path}${buildQuery(options.query)}`, {
    method: options.method ?? 'GET',
    signal: options.signal,
    headers: await buildHeaders(options),
    body: toRequestBody(options.body),
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

/**
 * O corpo da requisição.
 *
 * `FormData` passa inteiro, sem virar texto: é assim que um arquivo (o print de um chamado)
 * viaja junto dos campos. Serializá-lo como JSON mandaria `{}` e o arquivo sumiria em
 * silêncio — o pior tipo de falha, porque a requisição dá certo.
 */
function toRequestBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;

  return JSON.stringify(body);
}

async function buildHeaders(options: RequestOptions): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  /* Com `FormData` o cabeçalho NÃO é escrito aqui: o navegador precisa montá-lo sozinho para
     incluir o `boundary` que separa os campos. Escrevê-lo à mão quebra a leitura no servidor. */
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = await readAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  return headers;
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
