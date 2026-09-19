import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type Response } from 'express';
import { ZodError } from 'zod';

/**
 * Formato único de erro da API.
 *
 * A trava herdada por trás disto: falha de gravação precisa APARECER na tela, em
 * vermelho, com o motivo, até resolver. Para a tela conseguir mostrar o motivo, a resposta
 * precisa trazê-lo sempre no mesmo lugar — e por isso este filtro é global.
 *
 * `details` existe para o erro de validação: dizer "dados inválidos" obriga a pessoa a
 * adivinhar qual campo, e ela desiste antes de acertar.
 */
export type ApiErrorBody = {
  statusCode: number;
  message: string;
  details?: { field: string; message: string }[];
  path: string;
  timestamp: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const path = http.getRequest<{ url?: string }>().url ?? '';

    const body = this.toBody(exception, path);

    /* 5xx é nosso: vai para o log com pilha. 4xx é do cliente e não polui o log — foi o
       log sem teto que esgota disco e esconde o erro que importa. */
    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${body.statusCode} ${path} — ${body.message}`, stackOf(exception));
    }

    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown, path: string): ApiErrorBody {
    const timestamp = new Date().toISOString();

    if (exception instanceof ZodError) {
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Confira os campos destacados.',
        details: exception.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
        path,
        timestamp,
      };
    }

    if (exception instanceof HttpException) {
      return { ...describeHttpException(exception), path, timestamp };
    }

    /* Mensagem genérica de propósito: texto de exceção não tratada pode conter valor de
       campo — dado de cliente, documento, e-mail. O detalhe fica no log. */
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Não consegui concluir. O erro foi registrado — tente de novo em instantes.',
      path,
      timestamp,
    };
  }
}

function describeHttpException(exception: HttpException): {
  statusCode: number;
  message: string;
  details?: { field: string; message: string }[];
} {
  const statusCode = exception.getStatus();
  const payload = exception.getResponse();

  if (typeof payload === 'string') return { statusCode, message: payload };

  const record = payload as { message?: unknown; errors?: unknown };
  const details = readValidationDetails(record.errors);

  /* O `nestjs-zod` responde "Validation failed" — em inglês, e é texto que a tela mostra.
     Quando há detalhe por campo, a mensagem geral é nossa; o motivo de cada campo vem em
     `details`, com o texto em português do schema. */
  if (details?.length) {
    return { statusCode, message: 'Confira os campos destacados.', details };
  }

  const message = Array.isArray(record.message)
    ? record.message.join('; ')
    : String(record.message ?? exception.message);

  return { statusCode, message };
}

/** `nestjs-zod` entrega os erros de validação aqui; o resto da API ignora o campo. */
function readValidationDetails(errors: unknown): { field: string; message: string }[] | undefined {
  if (!Array.isArray(errors)) return undefined;

  return errors
    .filter((issue): issue is { path: unknown[]; message: string } => {
      if (typeof issue !== 'object' || issue === null) return false;

      return 'path' in issue && 'message' in issue;
    })
    .map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
}

function stackOf(exception: unknown): string | undefined {
  return exception instanceof Error ? exception.stack : undefined;
}
