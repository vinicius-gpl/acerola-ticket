import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
  PayloadTooLargeException,
} from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import {
  UPLOAD_TOO_LARGE_MESSAGE,
  UploadTooLargeInterceptor,
} from './upload-too-large.interceptor';

const context = {} as ExecutionContext;

function failingWith(error: unknown): CallHandler {
  return { handle: () => throwError(() => error) };
}

describe('UploadTooLargeInterceptor', () => {
  const interceptor = new UploadTooLargeInterceptor();

  // feliz
  it('lets the answer through when nothing went wrong', async () => {
    const result = await firstValueFrom(interceptor.intercept(context, { handle: () => of('ok') }));

    expect(result).toBe('ok');
  });

  it('rewrites the too-large error in Portuguese and keeps the 413', async () => {
    const attempt = firstValueFrom(
      interceptor.intercept(context, failingWith(new PayloadTooLargeException('File too large'))),
    );

    await expect(attempt).rejects.toBeInstanceOf(PayloadTooLargeException);
    await expect(attempt).rejects.toMatchObject({ message: UPLOAD_TOO_LARGE_MESSAGE });
  });

  // triste
  /* Qualquer outro erro passa intacto: trocar a mensagem de tudo esconderia o erro de verdade. */
  it('leaves every other error exactly as it came', async () => {
    const original = new BadRequestException('Unexpected field');

    await expect(
      firstValueFrom(interceptor.intercept(context, failingWith(original))),
    ).rejects.toBe(original);
  });
});
