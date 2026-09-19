import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  constraintColumnsOf,
  findSqliteError,
  runMaybe,
  runOne,
  runQuery,
  toHttpException,
} from './db-error.util';

/** O formato em que o Drizzle entrega: o erro da consulta, com o do SQLite em `.cause`. */
function wrapped(code: string, message: string) {
  return Object.assign(new Error('Failed query: insert into "tasks" ...'), {
    cause: Object.assign(new Error(message), { code }),
  });
}

describe('findSqliteError', () => {
  // feliz
  it('finds the SQLite error inside the Drizzle wrapper', () => {
    const error = wrapped('SQLITE_CONSTRAINT_UNIQUE', 'UNIQUE constraint failed: tasks.title');

    expect(findSqliteError(error)?.code).toBe('SQLITE_CONSTRAINT_UNIQUE');
  });

  // triste
  /* Erro do Node também tem `code`. "Pasta sem permissão" não pode virar "valor inválido". */
  it('does not mistake a Node system error for a database refusal', () => {
    expect(findSqliteError(Object.assign(new Error('nope'), { code: 'EACCES' }))).toBeNull();
  });

  it('gives up on a cause chain that never ends', () => {
    const loop: { cause?: unknown } = {};
    loop.cause = loop;

    expect(findSqliteError(loop)).toBeNull();
  });
});

describe('constraintColumnsOf', () => {
  it('reads the table and column from the SQLite message', () => {
    expect(
      constraintColumnsOf({
        code: 'SQLITE_CONSTRAINT_UNIQUE',
        message: 'UNIQUE constraint failed: tasks.title',
      }),
    ).toBe('tasks.title');
  });

  it('returns empty when the message has no constraint', () => {
    expect(constraintColumnsOf({ code: 'SQLITE_BUSY', message: 'database is locked' })).toBe('');
  });
});

describe('toHttpException', () => {
  it('turns a duplicate into 409', () => {
    const exception = toHttpException(
      wrapped('SQLITE_CONSTRAINT_UNIQUE', 'UNIQUE constraint failed: tasks.title'),
      'salvar tarefa',
    );

    expect(exception).toBeInstanceOf(ConflictException);
  });

  it('turns a refused check into 422 with the message written for that check', () => {
    const exception = toHttpException(
      wrapped('SQLITE_CONSTRAINT_CHECK', 'CHECK constraint failed: tasks_status_valid'),
      'salvar tarefa',
    );

    expect(exception).toBeInstanceOf(UnprocessableEntityException);
    expect(exception.message).toMatch(/situação da tarefa/);
  });

  it('turns a broken reference into 422, telling the person to reload', () => {
    const exception = toHttpException(
      wrapped('SQLITE_CONSTRAINT_FOREIGNKEY', 'FOREIGN KEY constraint failed'),
      'salvar',
    );

    expect(exception).toBeInstanceOf(UnprocessableEntityException);
    expect(exception.message).toMatch(/Recarregue/);
  });

  /* Ocupado é passageiro: a tela pode dizer "tente de novo" com verdade. */
  it('turns a locked database into 503', () => {
    expect(toHttpException(wrapped('SQLITE_BUSY', 'database is locked'), 'salvar')).toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  // triste
  /* Sem tradução conhecida é 500: chamar de 4xx culparia quem digitou por um defeito nosso. */
  it('keeps an unknown failure as 500, naming what was being done', () => {
    const exception = toHttpException(new Error('disk I/O error'), 'listar tarefas');

    expect(exception).toBeInstanceOf(InternalServerErrorException);
    expect(exception.message).toMatch(/listar tarefas/);
  });
});

describe('runQuery / runMaybe / runOne', () => {
  it('returns what the query returned', async () => {
    await expect(runQuery(Promise.resolve([1, 2]), 'ler')).resolves.toEqual([1, 2]);
  });

  it('translates the failure instead of letting the raw error through', async () => {
    const failing = Promise.reject(
      wrapped('SQLITE_CONSTRAINT_UNIQUE', 'UNIQUE constraint failed: tasks.title'),
    );

    await expect(runQuery(failing, 'salvar')).rejects.toBeInstanceOf(ConflictException);
  });

  it('runMaybe answers null when nothing was found', async () => {
    await expect(runMaybe(Promise.resolve([]), 'ler')).resolves.toBeNull();
  });

  // triste
  /* "Não existe" e "não pude ler" são respostas diferentes, e não podem virar o mesmo null. */
  it('runMaybe throws when the database refused, instead of answering null', async () => {
    await expect(
      runMaybe(Promise.reject(wrapped('SQLITE_BUSY', 'database is locked')), 'ler'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('runOne turns absence into 404 with the given message', async () => {
    await expect(runOne(Promise.resolve([]), 'ler', 'Tarefa não encontrada.')).rejects.toThrow(
      new NotFoundException('Tarefa não encontrada.'),
    );
  });
});
