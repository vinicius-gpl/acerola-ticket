/**
 * Montagem de `update` parcial.
 *
 * Toda edição do sistema é parcial, e a distinção que importa é entre:
 *  - campo AUSENTE (`undefined`) — "não mexi nisso", a coluna não entra no `update`;
 *  - campo NULO (`null`) — "limpe isto", a coluna entra no `update` valendo nulo.
 *
 * Tratar os dois como iguais tornava impossível apagar um vencimento digitado errado: a
 * pessoa limpava o campo, salvava, e o valor antigo continuava lá.
 *
 * Existir como helper — e não como uma sequência de `if` em cada mapper — é o que mantém os
 * mappers dentro do limite de complexidade e faz a regra ser a mesma nos dois.
 */

/** Grava a coluna só quando o campo veio. `null` conta como "veio", e limpa. */
export function setIfDefined<TUpdate, TKey extends keyof TUpdate>(
  update: TUpdate,
  column: TKey,
  value: TUpdate[TKey] | undefined,
): void {
  if (value === undefined) return;

  update[column] = value;
}

/**
 * Aplica a normalização só quando o campo veio, preservando a diferença entre ausente e
 * nulo. Sem isto, normalizar antes de checar transformaria `undefined` em `null` e toda
 * edição parcial apagaria os campos que ela não mencionou.
 */
export function mapDefined<TValue, TResult>(
  value: TValue | null | undefined,
  normalize: (value: TValue) => TResult,
): TResult | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  return normalize(value);
}
