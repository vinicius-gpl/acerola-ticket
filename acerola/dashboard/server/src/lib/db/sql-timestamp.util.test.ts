import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { maintenances } from './schema/maintenances.schema';
import { tickets } from './schema/tickets.schema';
import { asDate, asTimestamp, toDate } from './sql-timestamp.util';

/* A consulta como o banco vai receber: texto e parâmetros separados, que é onde o defeito
   morava — o texto sempre esteve certo, o parâmetro é que ia num tipo que o driver recusa. */
const dialect = new PgDialect();

const since = new Date('2026-09-01T12:00:00.000Z');

describe('asTimestamp', () => {
  // feliz
  it('sends the date as the text the driver accepts, never as a Date', () => {
    const { params } = dialect.sqlToQuery(sql`${tickets.createdAt} >= ${asTimestamp(since)}`);

    expect(params).toEqual(['2026-09-01T12:00:00.000Z']);
    expect(params.some((value) => value instanceof Date)).toBe(false);
  });

  it('still goes as a parameter, not glued into the query text', () => {
    const { sql: text } = dialect.sqlToQuery(sql`${tickets.createdAt} >= ${asTimestamp(since)}`);

    expect(text).toBe('"tickets"."created_at" >= $1');
  });

  /* O caminho pelos ajudantes do Drizzle sempre funcionou. Os dois precisam mandar o MESMO
     valor, senão "desde tal data" passaria a significar coisas diferentes em telas diferentes. */
  it('converts exactly like the column itself converts', () => {
    expect(dialect.sqlToQuery(asTimestamp(since)).params).toEqual([
      tickets.createdAt.mapToDriverValue(since),
    ]);
  });

  // triste
  /* O fuso de quem roda o servidor não pode entrar na conta: o mesmo instante tem que virar
     o mesmo texto no Brasil e em qualquer outro lugar. */
  it('writes the instant in UTC, whatever the clock of the machine says', () => {
    const { params } = dialect.sqlToQuery(asTimestamp(new Date('2026-01-01T00:30:00-03:00')));

    expect(params).toEqual(['2026-01-01T03:30:00.000Z']);
  });
});

describe('toDate', () => {
  /* O texto que o driver devolve para uma data do Postgres: espaço no lugar do T, e o fuso
     escrito como `+00`. É exatamente o que chegava ao serviço fingindo ser um Date. */
  const fromDriver = '2026-09-06 19:25:42.289+00';

  // feliz
  it('reads the driver text back as a Date', () => {
    const value = toDate(fromDriver, maintenances.performedAt);

    expect(value).toBeInstanceOf(Date);
    expect(value?.toISOString()).toBe('2026-09-06T19:25:42.289Z');
  });

  it('converts exactly like the column it came from', () => {
    expect(toDate(fromDriver, maintenances.performedAt)).toEqual(
      maintenances.performedAt.mapFromDriverValue(fromDriver),
    );
  });

  // triste
  /* Máquina que nunca teve manutenção: `max(...)` não devolve data nenhuma, e isso precisa
     continuar sendo "nunca aconteceu" — não uma data inventada a partir de nada. */
  it('keeps "never happened" as nothing', () => {
    expect(toDate(null, maintenances.performedAt)).toBeNull();
    expect(toDate(undefined, maintenances.performedAt)).toBeNull();
  });
});

describe('asDate', () => {
  // feliz
  it('keeps the query text untouched — it only changes how the answer is read', () => {
    const expression = sql<Date | null>`max(${maintenances.performedAt})`;

    expect(dialect.sqlToQuery(asDate(expression, maintenances.performedAt)).sql).toBe(
      'max("maintenances"."performed_at")',
    );
  });
});
