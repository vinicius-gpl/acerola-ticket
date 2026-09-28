import { sql, type Column, type SQL } from 'drizzle-orm';

/**
 * As DATAS que atravessam um `sql` escrito à mão — na ida e na volta.
 *
 * **Por que isto existe:** pelos ajudantes do Drizzle (`gte(coluna, data)`, ou uma coluna numa
 * lista de `select`), quem converte a data é a própria coluna: ela sabe virar texto para o
 * banco e virar `Date` de volta. Dentro de um `sql` escrito à mão não existe coluna nenhuma
 * fazendo isso, e a data passa crua nos dois sentidos.
 *
 * Os dois lados quebram, cada um do seu jeito, e nenhum dos dois aparece ao compilar.
 */

/**
 * A IDA: uma data pronta para entrar num template `sql`.
 *
 * Sem isto, o objeto `Date` chega cru ao driver e a consulta inteira é recusada:
 *
 * ```
 * TypeError [ERR_INVALID_ARG_TYPE]: The "string" argument must be of type string
 * or an instance of Buffer or ArrayBuffer. Received an instance of Date
 * ```
 *
 * E isso derruba a TELA INTEIRA, porque essas consultas são justamente as que resumem o
 * período: Painel, resumo da Rede e Inteligência viravam "não consegui falar com o banco".
 *
 * A conversão é a MESMA que a coluna `timestamp` faz (ISO 8601 em UTC), para os dois caminhos
 * não discordarem sobre o que "desde tal data" significa.
 */
export function asTimestamp(value: Date): SQL {
  return sql`${value.toISOString()}`;
}

/**
 * A VOLTA: o resultado de uma expressão de data lido como `Date`, e não como texto.
 *
 * O driver devolve a data do Postgres no formato dele (`2026-09-06 19:25:42.289+00`), e é a
 * coluna que normalmente a transforma em `Date`. Numa expressão escrita à mão — um `max(...)`,
 * uma subconsulta — esse texto chega ao serviço com o TIPO MENTINDO: o TypeScript acredita no
 * `Date | null` declarado, e em tempo de execução é uma string.
 *
 * O resultado é um `row.lastDoneAt.toISOString is not a function` bem longe daqui, na hora em
 * que alguém abre a tela. Dizer de qual coluna a expressão saiu devolve a conversão que a
 * coluna faria — e o `Date | null` volta a ser verdade.
 */
export function asDate(expression: SQL<Date | null>, like: Column): SQL<Date | null> {
  return expression.mapWith((value: unknown) => toDate(value, like));
}

/**
 * O texto do driver virando `Date`, pela régua da coluna indicada.
 *
 * O nulo é tratado AQUI porque é resultado legítimo: `max(...)` de uma máquina que nunca teve
 * manutenção não devolve data nenhuma, e entregar isso à conversão da coluna daria uma data
 * inventada em vez de "nunca aconteceu".
 */
export function toDate(value: unknown, like: Column): Date | null {
  if (value === null || value === undefined) return null;

  return like.mapFromDriverValue(value) as Date;
}
