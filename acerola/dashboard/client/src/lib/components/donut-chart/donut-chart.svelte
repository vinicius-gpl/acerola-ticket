<script lang="ts" module>
  import type { ChartConfig } from '$lib/utils/chart-config';
  import type { ChartSlice } from '$lib/utils/chart-slice';

  /**
   * Rosca — para mostrar como um todo se divide (situação, tipo de problema, departamento).
   *
   * O anel vem do LayerChart (o mesmo gráfico do shadcn-svelte); o resto é o que o projeto exige e a
   * biblioteca não traz:
   *
   *  1. **Legenda ao lado, com o nome escrito**, o valor e a porcentagem. Cor sozinha não é
   *     informação para quem não distingue cor (ver `chart-slice`).
   *  2. **O total no MEIO do anel**, que poupa a soma de cabeça.
   *  3. **Clique abre o detalhamento** (`actions.onSelect`) — tanto na fatia quanto na
   *     legenda. O gráfico é o caminho para a lista, não um enfeite: é assim que alguém sai
   *     de "42 em andamento" para "quais 42".
   */
  export type DonutChartProps = {
    data: {
      slices: ChartSlice[];
      /** O nome da SÉRIE: aparece no balão ("Status: 10") e embaixo do total, no meio. */
      seriesLabel: string;
    };
    state?: { isLoading?: boolean };
    ui?: { emptyLabel?: string; className?: string };
    actions?: { onSelect?: (label: string) => void };
  };

  /** O contrato de rótulos que o balão lê — uma entrada por fatia. */
  export function configOf(slices: readonly ChartSlice[]): ChartConfig {
    return Object.fromEntries(slices.map((slice) => [slice.label, { label: slice.label }]));
  }

  /** A porcentagem inteira de uma fatia. Total zero não vira divisão por zero. */
  export function percentOf(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }
</script>

<script lang="ts">
  import { PieChart } from 'layerchart';

  import ChartFrame from '$lib/components/chart-frame/chart-frame.svelte';
  import ChartTooltip from '$lib/components/chart-tooltip/chart-tooltip.svelte';
  import { colorOfSlice } from '$lib/utils/chart-slice';
  import { cn } from '$lib/utils/cn';

  /* O prop precisa de outro nome aqui dentro: um binding local chamado `state` faz o
     compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let { data, state: chartState, ui, actions }: DonutChartProps = $props();

  const total = $derived(data.slices.reduce((sum, slice) => sum + slice.value, 0));
  const colors = $derived(data.slices.map((slice, index) => colorOfSlice(slice.label, index)));
  const chartConfig = $derived(configOf(data.slices));
</script>

{#if chartState?.isLoading}
  <div class="bg-muted h-full w-full animate-pulse rounded-lg"></div>
{:else if data.slices.length === 0}
  <p class="text-muted-foreground flex h-full items-center justify-center text-xs">
    {ui?.emptyLabel ?? 'Sem dados para mostrar'}
  </p>
{:else}
  <!-- Empilhado no celular, lado a lado a partir do `sm`: com 320 px de largura, anel e
       legenda lado a lado deixam os dois ilegíveis. -->
  <div class={cn('flex h-full flex-col items-center gap-4 sm:flex-row', ui?.className)}>
    <!-- Quadrado próprio para a rosca: sem ele, a legenda ao lado empurra o centro do anel
         para fora do meio visual do cartão, e o total sobreposto fica desalinhado. -->
    <div class="relative aspect-square h-40 shrink-0 sm:h-full">
      <div class="h-full w-full" role="img" aria-label={data.seriesLabel}>
        <ChartFrame data={{ config: chartConfig }} ui={{ className: 'aspect-square h-full w-full' }}>
          <PieChart
            data={data.slices}
            key="label"
            value="value"
            cRange={colors}
            innerRadius={-28}
            padAngle={0.02}
            cornerRadius={3}
            onArcClick={(_event, detail) => actions?.onSelect?.((detail.data as ChartSlice).label)}
            props={{ arc: { stroke: 'none' } }}
          >
            {#snippet tooltip()}
              <ChartTooltip ui={{ isLabelHidden: true }} />
            {/snippet}
          </PieChart>
        </ChartFrame>
      </div>

      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-foreground text-xl leading-tight font-bold">
          {total.toLocaleString('pt-BR')}
        </span>
        <span class="text-muted-foreground text-[10px] tracking-wide uppercase">
          {data.seriesLabel}
        </span>
      </div>
    </div>

    <!-- `self-stretch`: sem isso a lista fica `items-center` do pai, que dá a ela só a
         própria altura de conteúdo — e com treze fatias o `overflow-y-auto` nunca entra em
         ação, e a lista extravasa o cartão por baixo. -->
    <!-- `overflow-x-hidden` é OBRIGATÓRIO ao lado do `overflow-y-auto`, e não enfeite: pelo
         CSS, pedir rolagem num eixo transforma o outro em `auto` sozinho. Sem ele, qualquer
         nome um pouco largo demais dava barra de rolagem HORIZONTAL na legenda — e ninguém
         rola uma legenda para o lado. -->
    <ul class="w-full min-w-0 flex-1 space-y-2.5 self-stretch overflow-x-hidden overflow-y-auto pr-1">
      <!-- A chave leva a POSIÇÃO junto com o rótulo: dois itens podem ter o mesmo nome, e
           chave repetida num `each` derruba a tela inteira em vez de só desenhar torto. -->
      {#each data.slices as slice, index (`${slice.label}-${index}`)}
        {@const color = colors[index]}
        {@const percent = percentOf(slice.value, total)}
        <li>
          <!-- Botão SÓ quando há para onde ir: um `<button>` que não leva a lugar nenhum
               aparece na tabulação e no leitor de tela como se levasse. -->
          {#if actions?.onSelect}
            <button
              type="button"
              onclick={() => actions?.onSelect?.(slice.label)}
              class="hover:bg-muted flex w-full cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-left text-xs"
            >
              {@render row(slice, color, percent)}
            </button>
          {:else}
            <div class="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-xs">
              {@render row(slice, color, percent)}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}

{#snippet row(slice: ChartSlice, color: string | undefined, percent: number)}
  <span
    class="size-2 shrink-0 rounded-[2px]"
    style="background-color: {color}"
    aria-hidden="true"
  ></span>
  <!-- O nome ENCOLHE (`min-w-0 flex-1`), e não tem largura fixa.
       Com largura fixa, a soma das partes passava da largura da legenda quando o cartão era
       estreito, e sobrava só o que a rolagem horizontal resolveria — que é o que não se faz
       numa legenda. Aqui quem cede espaço é o nome, que continua inteiro no `title`. -->
  <span class="text-muted-foreground min-w-0 flex-1 truncate" title={slice.label}>
    {slice.label}
  </span>
  <!-- Barrinha de proporção — não é `ProgressBar` (esse componente é pra "quanto já foi
       cumprido de uma obrigação"). Aqui a cor tem que ser a mesma do ponto e da fatia: é a
       identidade da categoria, não uma leitura de "bom ou ruim".

       Largura FIXA e à direita: é o que mantém todas as barrinhas começando na mesma linha
       vertical. Desalinhadas, elas deixam de ser comparáveis de relance, que é a única razão
       de existirem. Some no celular, onde não há largura para ela e para o nome. -->
  <span class="bg-muted hidden h-1.5 w-14 shrink-0 overflow-hidden rounded-full sm:block">
    <span
      class="block h-full rounded-full"
      style="width: {percent}%; background-color: {color}"
    ></span>
  </span>
  <span class="text-foreground shrink-0 font-semibold">{slice.value}</span>
  <span class="text-muted-foreground w-9 shrink-0 text-right">{percent}%</span>
{/snippet}
