import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  constraintNameOf,
  findPostgresError,
  runMaybe,
  runOne,
  runQuery,
  toHttpException,
} from './db-error.util';

/** O formato em que o Drizzle entrega: o erro da consulta, com o do Postgres em `.cause`. */
function wrapped(code: string, constraintName?: string): Error {
  const cause = Object.assign(new Error('recusado pelo banco'), {
    name: 'PostgresError',
    severity: 'ERROR',
    code,
    constraint_name: constraintName,
  });

  return Object.assign(new Error('Failed query: insert into "tasks" ...'), { cause });
}

/** O caso que derrubou três telas: coluna sem a tabela na frente, num `join`. */
function ambiguous(): Error {
  const cause = Object.assign(new Error('column reference "id" is ambiguous'), {
    name: 'PostgresError',
    severity: 'ERROR',
    code: '42702',
  });

  return Object.assign(new Error('Failed query: select count("id") from "computers" ...'), {
    cause,
  });
}

describe('findPostgresError', () => {
  // feliz
  it('finds the Postgres error inside the Drizzle wrapper', () => {
    expect(findPostgresError(wrapped('23505'))?.code).toBe('23505');
  });

  it('finds it however deep it was wrapped', () => {
    const deep = Object.assign(new Error('outer'), { cause: wrapped('23514') });

    expect(findPostgresError(deep)?.code).toBe('23514');
  });

  // triste
  /* Erro do Node também tem `code`. Confundi-los faria "sem permissão no disco" virar
     "valor inválido", e a tela culparia quem digitou por um problema de servidor. */
  it('does not mistake a Node error for a database error', () => {
    expect(findPostgresError(Object.assign(new Error('nope'), { code: 'EACCES' }))).toBeNull();
    expect(findPostgresError(Object.assign(new Error('nope'), { code: 'ENOENT' }))).toBeNull();
  });

  /* Um código com a cara de SQLSTATE mas sem as marcas do driver não é do Postgres. */
  it('requires the driver markers, not just a five-character code', () => {
    expect(findPostgresError(Object.assign(new Error('x'), { code: 'ABCDE' }))).toBeNull();
  });

  it('does not loop forever on a cause that points at itself (edge case)', () => {
    const loop: { cause?: unknown } = {};
    loop.cause = loop;

    expect(findPostgresError(loop)).toBeNull();
  });

  it('survives something that is not an object at all (edge case)', () => {
    expect(findPostgresError(null)).toBeNull();
    expect(findPostgresError('falhou')).toBeNull();
  });
});

describe('constraintNameOf', () => {
  // feliz
  /* O Postgres entrega o nome da restrição num campo próprio — não é preciso garimpar o
     texto da mensagem, como era no SQLite. */
  it('reads the constraint name the database reported', () => {
    expect(constraintNameOf({ code: '23514', constraint_name: 'tasks_status_valid' })).toBe(
      'tasks_status_valid',
    );
  });

  // triste
  it('gives an empty key when the database did not name the constraint (edge case)', () => {
    expect(constraintNameOf({ code: '23505' })).toBe('');
  });
});

describe('toHttpException', () => {
  // feliz
  /* Já existe é 409: a pessoa resolve sozinha, editando o registro que já está lá. */
  it('turns a unique violation into a conflict', () => {
    const exception = toHttpException(wrapped('23505'), 'criar tarefa');

    expect(exception).toBeInstanceOf(ConflictException);
  });

  /* A checagem do banco tem mensagem própria: "o banco recusou" não diz o que corrigir. */
  it('uses the message written for the named check', () => {
    const exception = toHttpException(wrapped('23514', 'tasks_status_valid'), 'criar tarefa');

    expect(exception).toBeInstanceOf(UnprocessableEntityException);
    expect(exception.message).toContain('situação da tarefa');
  });

  it('turns a foreign key violation into something the screen can explain', () => {
    const exception = toHttpException(wrapped('23503'), 'criar tarefa');

    expect(exception).toBeInstanceOf(UnprocessableEntityException);
    expect(exception.message).toContain('não existe mais');
  });

  it('turns a not-null violation into a refused value', () => {
    expect(toHttpException(wrapped('23502'), 'criar tarefa')).toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  /* Ocupado não é defeito permanente: 503 deixa a tela dizer "tente de novo" com verdade. */
  it('turns a deadlock into a temporary failure, not a permanent one', () => {
    expect(toHttpException(wrapped('40P01'), 'criar tarefa')).toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(toHttpException(wrapped('08006'), 'criar tarefa')).toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  // triste
  /* Sem tradução conhecida é 500 de propósito: chamar de 4xx faria a tela culpar quem
     digitou por um defeito nosso, e o problema nunca chegaria até nós. */
  it('keeps an unknown failure as ours, naming what was being done', () => {
    const exception = toHttpException(new Error('cabo arrancado'), 'criar tarefa');

    expect(exception).toBeInstanceOf(InternalServerErrorException);
    expect(exception.message).toContain('criar tarefa');
    expect(exception.message).toContain('cabo arrancado');
  });

  it('keeps an unmapped SQLSTATE as ours (edge case)', () => {
    expect(toHttpException(wrapped('42P01'), 'listar tarefas')).toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  /* O texto do Drizzle é a consulta inteira, e o motivo fica escondido no `cause`. Mostrar o
     embrulho enche a tela de SQL e esconde a única frase que resolve o problema. */
  it('shows the reason the database gave, and not the query', () => {
    const error = ambiguous();

    const message = toHttpException(error, 'cruzar os dados').message;

    expect(message).toContain('column reference "id" is ambiguous');
    expect(message).toContain('42702');
    expect(message).not.toContain('select');
  });

  /* Conexão caída não é defeito de quem clicou nem defeito permanente: a Neon suspende o
     banco parado, e "tente de novo" resolve de verdade. */
  it('treats a dead connection as busy, not as a bug of whoever clicked', () => {
    const dead = Object.assign(new Error('Failed query: select 1'), {
      cause: Object.assign(new Error('write CONNECTION_CLOSED'), { code: 'CONNECTION_CLOSED' }),
    });

    const exception = toHttpException(dead, 'contar os chamados');

    expect(exception).toBeInstanceOf(ServiceUnavailableException);
    expect(exception.message).toContain('Tente de novo');
  });
});

describe('runQuery, runMaybe e runOne', () => {
  // feliz
  it('gives back what the query returned', async () => {
    await expect(runQuery(Promise.resolve(7), 'contar')).resolves.toBe(7);
    await expect(runMaybe(Promise.resolve([{ id: 1 }]), 'buscar')).resolves.toEqual({ id: 1 });
    await expect(runOne(Promise.resolve([{ id: 1 }]), 'buscar')).resolves.toEqual({ id: 1 });
  });

  /* Ausência é resposta legítima para `runMaybe` — e só para ele. */
  it('answers null when there was nothing to find', async () => {
    await expect(runMaybe(Promise.resolve([]), 'buscar')).resolves.toBeNull();
  });

  // triste
  it('turns a database refusal into the right status, not into null', async () => {
    await expect(runMaybe(Promise.reject(wrapped('23505')), 'buscar')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('turns nothing found into a 404 with the message given', async () => {
    await expect(runOne(Promise.resolve([]), 'buscar', 'Tarefa não encontrada.')).rejects.toThrow(
      NotFoundException,
    );
  });
});
