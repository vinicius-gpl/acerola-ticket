import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request } from 'express';
import { mergeMap, type Observable } from 'rxjs';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  historyEntryOf,
  isMutation,
  type MutationRequest,
  withoutStagedFiles,
} from '../service/history-entry.util';
import { HistoryService } from '../service/history.service';
import { SKIP_HISTORY } from './skip-history.decorator';

/* O Express não conhece a propriedade `user`; este alias evita repetir o tipo. */
type HistoryRequest = Request & { user?: RequestUser };

/**
 * TODA requisição que muda dado deixa uma linha no histórico — sem cada service lembrar.
 *
 * Global de propósito, pelo mesmo motivo do guard: rota nova já nasce registrada, e o
 * esquecimento não existe. Só grava o que DEU CERTO: requisição recusada não mudou nada.
 */
@Injectable()
export class HistoryInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly history: HistoryService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<HistoryRequest>();
    if (!isMutation(request.method) || this.isSkipped(context)) return next.handle();

    const mutation = mutationOf(request, context.getHandler().name);

    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        await this.history.record(historyEntryOf(mutation, result));

        return result;
      }),
    );
  }

  private isSkipped(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(SKIP_HISTORY, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }
}

function mutationOf(request: HistoryRequest, handler: string): MutationRequest {
  const route = request.route as { path?: unknown } | undefined;
  const { body, fileNames } = withoutStagedFiles(request.body);

  return {
    method: request.method,
    routePath: typeof route?.path === 'string' ? route.path : request.path,
    handler,
    params: paramsOf(request.params),
    body,
    fileNames,
    actor: request.user ? { id: request.user.id, email: request.user.email } : null,
    ip: request.ip ?? null,
    userAgent: request.get('user-agent') ?? null,
  };
}

/* Parâmetro de rota repetido vira lista no Express 5; para o histórico vale o primeiro. */
function paramsOf(params: Record<string, string | string[]>): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
}
