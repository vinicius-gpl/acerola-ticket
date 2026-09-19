import { describe, expect, it } from 'vitest';

import { type TaskRow } from '../../../lib/db/schema/tasks.schema';
import { toTask, toTaskInsert, toTaskUpdate } from './tasks.mapper';

const row: TaskRow = {
  id: 7,
  title: 'Ligar para o cliente',
  description: 'Confirmar o horário da visita',
  status: 'doing',
  createdAt: new Date('2026-09-14T12:00:00.000Z'),
  createdBy: 'ana@empresa.com.br',
  updatedAt: null,
  updatedBy: null,
};

describe('toTask', () => {
  // feliz
  it('translates the database row into the contract, with ISO dates', () => {
    expect(toTask(row)).toEqual({
      id: 7,
      title: 'Ligar para o cliente',
      description: 'Confirmar o horário da visita',
      status: 'doing',
      createdAt: '2026-09-14T12:00:00.000Z',
      createdBy: 'ana@empresa.com.br',
      updatedAt: null,
      updatedBy: null,
    });
  });

  it('converts the update date when there is one', () => {
    const updated = toTask({ ...row, updatedAt: new Date('2026-09-15T08:30:00.000Z') });

    expect(updated.updatedAt).toBe('2026-09-15T08:30:00.000Z');
  });

  // triste
  it('keeps null as null, without turning it into an empty string', () => {
    expect(toTask({ ...row, description: null }).description).toBeNull();
  });
});

describe('toTaskInsert', () => {
  // feliz
  it('stamps the author with the e-mail of the identity', () => {
    expect(toTaskInsert({ title: 'Nova' }, 'ana@empresa.com.br').createdBy).toBe(
      'ana@empresa.com.br',
    );
  });

  it('starts as todo when no status came', () => {
    expect(toTaskInsert({ title: 'Nova' }, 'a@b.c').status).toBe('todo');
  });

  // triste
  /* Autoria do corpo é assinatura por outra pessoa. */
  it('ignores authorship sent in the body', () => {
    const insert = toTaskInsert(
      { title: 'Nova', createdBy: 'outra@empresa.com.br' } as never,
      'ana@empresa.com.br',
    );

    expect(insert.createdBy).toBe('ana@empresa.com.br');
  });

  it('turns a blank description into null', () => {
    expect(toTaskInsert({ title: 'Nova', description: '   ' }, 'a@b.c').description).toBeNull();
  });
});

describe('toTaskUpdate', () => {
  // feliz
  it('updates only what came, and always re-stamps who edited', () => {
    const update = toTaskUpdate({ status: 'done' }, 'chefe@empresa.com.br');

    expect(update).toMatchObject({ status: 'done', updatedBy: 'chefe@empresa.com.br' });
    expect(update.updatedAt).toBeInstanceOf(Date);
    expect(update).not.toHaveProperty('title');
    expect(update).not.toHaveProperty('description');
  });

  /* Distinguir "não mandou" de "mandou vazio" é o que permite limpar um valor. */
  it('clears the description when it comes as null, and ignores it when absent', () => {
    expect(toTaskUpdate({ description: null }, 'a@b.c').description).toBeNull();
    expect(toTaskUpdate({}, 'a@b.c')).not.toHaveProperty('description');
  });

  // triste
  it('does not let the body stamp authorship', () => {
    const update = toTaskUpdate(
      { status: 'done', updatedBy: 'outra@empresa.com.br' } as never,
      'ana@empresa.com.br',
    );

    expect(update.updatedBy).toBe('ana@empresa.com.br');
  });

  it('trims the title', () => {
    expect(toTaskUpdate({ title: '  Revisar  ' }, 'a@b.c').title).toBe('Revisar');
  });
});
