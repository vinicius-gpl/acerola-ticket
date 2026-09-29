/**
 * O GERADOR DE VOLUME dos seeds — o que enche as telas o bastante para elas serem julgadas.
 *
 * Os casos escritos à mão continuam existindo, e são eles que cobrem os limites: a máquina que
 * nunca foi vista, o chamado sem máquina, o alerta acontecendo agora. O que falta a eles é
 * QUANTIDADE: com vinte chamados não dá para saber se um gráfico aguenta duzentos, se a
 * legenda cabe com quinze fatias, se a paginação tem mais de uma página.
 *
 * **Nada aqui sorteia.** `Math.random` num seed desenharia um gráfico diferente a cada
 * execução, e um gráfico que muda sozinho não serve para conferir se a tela está certa — nem
 * para alguém dizer "ontem estava assim e hoje está assado". No lugar dele há um gerador
 * determinístico: a mesma posição sempre devolve o mesmo número, em qualquer máquina, em
 * qualquer dia.
 */

/**
 * Um número entre 0 e 1 a partir de uma posição.
 *
 * É o embaralhador de bits do `xorshift`, que espalha valores vizinhos em resultados bem
 * diferentes — sem isso, itens consecutivos cairiam quase sempre na mesma opção, e a lista
 * gerada sairia em blocos ("dez chamados de impressora, dez de rede") em vez de misturada.
 */
export function fraction(position: number): number {
  let value = (position + 1) * 2654435761;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;

  return ((value >>> 0) % 100000) / 100000;
}

/** Um item da lista, escolhido pela posição. A lista nunca pode estar vazia. */
export function pick<T>(options: readonly T[], position: number): T {
  return options[Math.floor(fraction(position) * options.length) % options.length]!;
}

/**
 * O quanto as primeiras opções pesam mais do que as últimas.
 *
 * O número foi escolhido OLHANDO O GRÁFICO, e o valor exato importa:
 *
 *  - Em 1, não há peso nenhum: os nove tipos de problema empatam, o gráfico sai com nove
 *    barras do mesmo tamanho e não existe "o que mais dá problema" — que é a única pergunta
 *    que aquela tela faz.
 *  - Em 2, a primeira opção leva um terço de tudo sozinha. No radar isso vira uma AGULHA: um
 *    espeto num lado e o resto encostado no centro, sem perfil nenhum para reconhecer.
 *
 * Em 1,4 a campeã leva cerca de 20% e a última cerca de 8%: há um líder claro, e ainda assim
 * uma forma para olhar.
 */
const WEIGHT_EXPONENT = 1.4;

/**
 * Um item da lista com PESO: as primeiras opções saem mais do que as últimas.
 *
 * É o que faz o dado gerado parecer um escritório de verdade — onde se reclama de impressora
 * o tempo todo e de acesso remoto quase nunca.
 */
export function pickWeighted<T>(options: readonly T[], position: number): T {
  const skewed = fraction(position) ** WEIGHT_EXPONENT;

  return options[Math.floor(skewed * options.length) % options.length]!;
}

/** Um inteiro entre `min` e `max`, os dois incluídos. */
export function between(min: number, max: number, position: number): number {
  return min + Math.floor(fraction(position) * (max - min + 1));
}

/** Verdadeiro em `percent` por cento das posições. */
export function chance(percent: number, position: number): boolean {
  return fraction(position) * 100 < percent;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * A régua de tempo dos dados gerados.
 *
 * É RELATIVA ao momento do seed, e não fixa, pelo mesmo motivo do inventário: as telas
 * perguntam "nos últimos 30 dias" e "neste mês". Com data fixa, o seed nasceria certo e
 * estaria vazio no mês seguinte ao commit — e a tela pareceria quebrada sem ninguém ter
 * mexido nela.
 */
export function timeRuler(now = Date.now()) {
  return {
    minutesAgo: (minutes: number) => new Date(now - minutes * MINUTE),
    hoursAgo: (hours: number) => new Date(now - hours * HOUR),
    daysAgo: (days: number) => new Date(now - days * DAY),
    /**
     * Um instante a tantos dias atrás, numa hora de EXPEDIENTE.
     *
     * Hora comercial de propósito: com a hora sorteada no dia inteiro, metade dos chamados
     * nasceria de madrugada, e qualquer leitura de "quando o pessoal mais abre chamado"
     * viraria ficção.
     */
    workdayAgo: (days: number, position: number) => {
      const date = new Date(now - days * DAY);
      date.setHours(8 + between(0, 9, position), between(0, 59, position + 7), 0, 0);

      /* Nunca no futuro: chamado com data que ainda não chegou não existe. */
      return date.getTime() > now ? new Date(now - HOUR) : date;
    },
  };
}
