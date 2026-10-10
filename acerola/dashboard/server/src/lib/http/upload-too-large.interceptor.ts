import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { catchError, type Observable, throwError } from 'rxjs';

export const UPLOAD_TOO_LARGE_MESSAGE =
  'Um dos arquivos passa do tamanho máximo aceito. Envie um arquivo menor.';

/**
 * Traduz o erro de "arquivo grande demais" do leitor de upload.
 *
 * Quando um arquivo passa do teto (`uploadLimit`), quem recusa é a biblioteca de upload, com
 * uma mensagem em inglês — e essa mensagem chega à tela. Este interceptor vai ANTES do de
 * upload na lista do `@UseInterceptors` e troca só a mensagem: o código continua 413.
 */
@Injectable()
export class UploadTooLargeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(catchError((error: unknown) => throwError(() => translate(error))));
  }
}

function translate(error: unknown): unknown {
  if (!(error instanceof PayloadTooLargeException)) return error;

  return new PayloadTooLargeException(UPLOAD_TOO_LARGE_MESSAGE);
}
