import { randomUUID } from 'node:crypto';
import { type IncomingMessage, type ServerResponse } from 'node:http';

import { type Params } from 'nestjs-pino';
import { type Level } from 'pino';

import { type Env } from '../config/env.schema';

/**
 * Como a API escreve log: uma linha JSON por evento, com o id da requisição em todas.
 *
 * O `Logger` do Nest escrevia texto solto, sem dizer de qual requisição vinha cada linha. Em
 * produção, "deu 500" sem o id não leva a lugar nenhum: o mesmo id volta para quem chamou no
 * cabeçalho `x-request-id`, e é com ele que se acha o resto da história no log.
 *
 * Em desenvolvimento a saída é o `pino-pretty`, colorida e legível; em produção é JSON puro,
 * que é o que agregador de log entende.
 */

export const REQUEST_ID_HEADER = 'x-request-id';

/** Rotas que respondem o tempo todo e não dizem nada: logar cada uma afoga o resto. */
const SILENT_PATHS = ['/api/health'];

/**
 * Cabeçalhos que carregam credencial. Saem do log como `[Redacted]`: log é lido por mais
 * gente e guardado por mais tempo que o banco, e token vazado ali vale tanto quanto senha.
 */
export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
];

/** O `API_LOG_LEVEL` fala a língua do Nest; o pino chama o `log` de `info`. */
const LEVEL_BY_NEST_LEVEL: Record<Env['API_LOG_LEVEL'], Level> = {
  debug: 'debug',
  log: 'info',
  warn: 'warn',
  error: 'error',
};

export function toPinoLevel(level: Env['API_LOG_LEVEL']): Level {
  return LEVEL_BY_NEST_LEVEL[level];
}

/**
 * O id da requisição: o que veio de fora (Traefik, outro serviço) é respeitado, para a mesma
 * chamada ter um id só de ponta a ponta. Sem ele, um novo — e devolvido no cabeçalho, para a
 * tela e o suporte poderem citar.
 */
export function resolveRequestId(request: IncomingMessage, response: ServerResponse): string {
  const incoming = request.headers[REQUEST_ID_HEADER];
  const id =
    typeof incoming === 'string' && incoming.trim() !== '' ? incoming.trim() : randomUUID();
  response.setHeader(REQUEST_ID_HEADER, id);

  return id;
}

/**
 * A URL sem a query string. O webhook do controlador prova quem é com um valor NA URL; logar
 * a query seria gravar esse segredo em cada linha.
 */
export function stripQuery(url: string | undefined): string {
  if (url === undefined) return '';

  return url.split('?')[0] ?? '';
}

/** 5xx é defeito nosso (error); 4xx é pedido recusado (warn); o resto é rotina (info). */
export function levelForStatus(statusCode: number, error?: Error): Level {
  if (error || statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';

  return 'info';
}

export function buildLoggerOptions(env: Env): Params {
  const isDevelopment = env.NODE_ENV === 'development';

  return {
    pinoHttp: {
      level: toPinoLevel(env.API_LOG_LEVEL),
      genReqId: resolveRequestId,
      redact: { paths: REDACTED_PATHS, censor: '[Redacted]' },
      autoLogging: { ignore: (request) => SILENT_PATHS.includes(stripQuery(request.url)) },
      customLogLevel: (_request, response, error) => levelForStatus(response.statusCode, error),
      serializers: {
        /* Só o que ajuda a investigar. O objeto inteiro traz cabeçalhos de navegador que
           triplicam a linha e não respondem pergunta nenhuma. */
        req: (request: { id: string; method: string; url: string }) => ({
          id: request.id,
          method: request.method,
          url: stripQuery(request.url),
        }),
        res: (response: { statusCode: number }) => ({ statusCode: response.statusCode }),
      },
      transport: isDevelopment
        ? { target: 'pino-pretty', options: { singleLine: true, translateTime: 'SYS:HH:MM:ss' } }
        : undefined,
    },
  };
}
