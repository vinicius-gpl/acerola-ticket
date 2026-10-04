<script lang="ts" module>
  import type { Snippet } from 'svelte';

  import type { ChartConfig } from '$lib/utils/chart-config';

  /**
   * A MOLDURA DE TODO GRÁFICO — o que fica em volta do desenho do LayerChart.
   *
   * É o `ChartContainer` do shadcn-svelte, escrito aqui em vez de baixado: o arquivo baixado
   * não compila no `strict` deste projeto, e componente em `ui/` não se edita (CONTRIBUTING
   * §5). O visual é o mesmo, e é isto que ela faz:
   *
   *  1. **Dá cor a cada série**, transformando o `config` em variáveis CSS `--color-<chave>`
   *     que o desenho e o balão leem. É o que mantém "Memória" da mesma cor em toda tela.
   *  2. **Acerta o traço do LayerChart** ao tema do sistema: some com os tracinhos do eixo,
   *     com a régua que a biblioteca desenha por cima das marcas e com o realce que apaga as
   *     outras séries quando o ponteiro passa por uma.
   *
   * Nenhum gráfico do projeto desenha sem ela.
   */
  export type AcerolaChartFrameProps = {
    data: { config: ChartConfig };
    ui?: { className?: string };
    children: Snippet;
  };
</script>

<script lang="ts">
  import { chartStyleOf, setChartConfigContext } from '$lib/utils/chart-config';
  import { cn } from '$lib/utils/cn';

  let { data, ui, children }: AcerolaChartFrameProps = $props();

  /* O id precisa ser único por gráfico na página: é ele que amarra as variáveis de cor a
     ESTE desenho, e dois gráficos com o mesmo id trocariam de paleta. */
  const uid = $props.id();
  const chartId = $derived(`chart-${uid.replace(/:/g, '')}`);
  const style = $derived(chartStyleOf(chartId, data.config));

  setChartConfigContext({
    get config() {
      return data.config;
    },
  });
</script>

<div
  data-chart={chartId}
  data-slot="chart"
  class={cn(
    'flex justify-center overflow-visible text-xs',
    /* Sem contorno no ponto realçado e sem a linha que a biblioteca cruza no ponto. */
    '[&_.lc-highlight-line]:stroke-0 [&_.lc-highlight-point]:stroke-transparent',
    '[&_.lc-line]:stroke-border/50',
    /* Passar o ponteiro numa série não apaga as outras: aqui a comparação é o assunto. */
    '[&_.lc-area-path]:opacity-100 [&_.lc-highlight-line]:opacity-100 [&_.lc-highlight-point]:opacity-100 [&_.lc-spline-path]:opacity-100',
    '[&_.lc-text]:text-xs [&_.lc-text-svg]:overflow-visible',
    /* Os tracinhos entre o rótulo e o desenho, e a régua do eixo, são ruído: a grade já
       está lá, e a régua ainda por cima é desenhada depois das marcas. */
    '[&_.lc-axis-tick]:stroke-0',
    '[&_.lc-rule-x-line:not(.lc-grid-x-rule)]:stroke-0 [&_.lc-rule-y-line:not(.lc-grid-y-rule)]:stroke-0',
    '[&_.lc-axis-tick-label]:fill-muted-foreground [&_.lc-axis-tick-label]:font-normal',
    '[&_.lc-labels-text:not([fill])]:fill-foreground [&_text]:stroke-transparent',
    '[&_.lc-layout-svg-g]:fill-transparent [&_.lc-tooltip-rects-g]:fill-transparent',
    '[&_.lc-root-container]:w-full',
    ui?.className,
  )}
>
  {#if style}
    {#key chartId}
      <!-- `svelte:element` e não `<style>` escrito: uma tag `<style>` na marcação seria
           recolhida pelo compilador para o CSS do componente, e estas regras precisam
           existir no documento, com o `data-chart` deste desenho. -->
      <svelte:element this={'style'}>{style}</svelte:element>
    {/key}
  {/if}
  {@render children()}
</div>
