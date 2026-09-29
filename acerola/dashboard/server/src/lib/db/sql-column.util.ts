import { getTableName, sql, type Column, type SQL } from 'drizzle-orm';

/**
 * A coluna COM O NOME DA TABELA na frente, para usar dentro de `sql`.
 *
 * **Por que isto existe:** dentro de um template `sql`, o Drizzle escreve a coluna SEM a
 * tabela. Numa subconsulta correlacionada, isso muda o sentido da consulta sem dar erro:
 *
 * ```sql
 * select count(*) from "maintenances" where "computer_id" = "id"
 * ```
 *
 * Ali dentro, `"id"` é o id da MANUTENÇÃO (a tabela mais próxima ganha), e não o da máquina
 * que a consulta de fora está percorrendo. O banco aceita, a tela mostra um número, e o
 * número está errado — que é o pior jeito de um defeito aparecer.
 *
 * Com este ajudante, a mesma subconsulta vira `"maintenances"."computer_id" =
 * "computers"."id"`: cada lado diz de qual tabela veio, e não existe "a mais próxima ganha".
 */
export function qualified(column: Column): SQL {
  return sql.raw(`"${getTableName(column.table)}"."${column.name}"`);
}
