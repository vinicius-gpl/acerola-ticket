import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { computerAlerts } from './schema/computer-alerts.schema';
import { computers } from './schema/computers.schema';
import { qualified } from './sql-column.util';

/* O SQL de verdade, como o banco vai receber — comparar os pedaços crus não diria nada. */
const dialect = new PgDialect();

const render = (column: Parameters<typeof qualified>[0]) =>
  dialect.sqlToQuery(qualified(column)).sql;

describe('qualified', () => {
  // feliz
  it('writes the table in front of the column', () => {
    expect(render(computers.id)).toBe('"computers"."id"');
  });

  /* O nome no banco é `computer_id`, e não `computerId`: é o do banco que precisa sair. */
  it('uses the name the column has in the database', () => {
    expect(render(computerAlerts.computerId)).toBe('"computer_alerts"."computer_id"');
  });

  // triste
  /* Duas colunas com o mesmo nome em tabelas diferentes é exatamente o caso que fazia a
     subconsulta comparar a linha com ela mesma. */
  it('tells apart two columns that share a name', () => {
    expect(render(computers.id)).not.toBe(render(computerAlerts.id));
  });
});
