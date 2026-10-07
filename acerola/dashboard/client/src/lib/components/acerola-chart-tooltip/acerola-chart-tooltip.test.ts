import { describe, expect, it } from 'vitest';

import { formatValue } from './acerola-chart-tooltip.svelte';

/**
 * O componente em si não se testa fora de um gráfico: ele lê o ponteiro do contexto do
 * LayerChart, que só existe dentro de um `<BarChart>`/`<AreaChart>`. O que ele tem de
 * decisão própria é o formato do número, e é isso que está aqui. O balão dentro do gráfico
 * é conferido no Storybook, passando o ponteiro por cima.
 */
describe('formatValue', () => {
  // feliz
  /* Em português é 1.240, e não 1,240. Sem isto, o mesmo painel mostra o mesmo número de
     dois jeitos, conforme o idioma do navegador de quem abriu. */
  it('writes a number the way the person writes it', () => {
    expect(formatValue(1240)).toBe('1.240');
  });

  it('leaves text alone', () => {
    expect(formatValue('Impressora')).toBe('Impressora');
  });

  // triste
  /* Série sem valor no ponto apontado: vazio, e não "undefined" escrito na tela. */
  it('writes nothing for a series with no value (edge case)', () => {
    expect(formatValue(undefined)).toBe('');
    expect(formatValue(null)).toBe('');
  });
});
