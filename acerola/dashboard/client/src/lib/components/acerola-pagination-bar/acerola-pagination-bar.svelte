<script lang="ts" module>
  /**
   * A BARRA DE PÁGINA de uma lista longa.
   *
   * Ela diz TRÊS coisas, e as três importam:
   *
   *  1. **Quantos itens existem ao todo** — "26–50 de 312". Sem isso a lista é cortada em
   *     silêncio, e quem lê não sabe que há mais (CONTRIBUTING §15).
   *  2. **Onde a pessoa está** — página 2 de 13.
   *  3. **Como andar** — anterior e próxima, desligadas nas pontas em vez de escondidas: um
   *     botão que some faz a barra pular de lugar a cada clique.
   *
   * Não tem lista de números de página, de propósito: com trezentas páginas ela viraria uma
   * régua, e a pergunta que se faz numa lista ordenada por data é "mais um pouco para trás",
   * não "me leve à página 47".
   */
  export type AcerolaPaginationBarProps = {
    data: {
      page: number;
      pageSize: number;
      /** Quantos itens existem ao todo, e não quantos vieram nesta página. */
      total: number;
      /** O que está sendo contado, no singular e no plural: "alerta" / "alertas". */
      noun: [singular: string, plural: string];
    };
    state?: { isLoading?: boolean };
    ui?: { className?: string };
    actions: { onPageChange: (page: number) => void };
  };

  /** Quantas páginas existem. Zero item ainda é UMA página — a que diz que não há nada. */
  export function pageCountOf(total: number, pageSize: number): number {
    if (pageSize <= 0) return 1;

    return Math.max(1, Math.ceil(total / pageSize));
  }

  /**
   * "26–50 de 312 alertas" — a faixa desta página dentro do total.
   *
   * Exportada para ter teste próprio: é a frase que impede a lista de mentir por omissão, e
   * errar a conta aqui é dizer à pessoa que ela já viu tudo quando não viu.
   */
  export function rangeLabelOf(data: AcerolaPaginationBarProps['data']): string {
    const [singular, plural] = data.noun;
    if (data.total === 0) return `Nenhum ${singular}`;

    const first = (data.page - 1) * data.pageSize + 1;
    const last = Math.min(data.total, data.page * data.pageSize);
    const noun = data.total === 1 ? singular : plural;

    /* Uma página só: dizer "1–7 de 7" é ruído — o total já responde tudo. */
    if (data.total <= data.pageSize) return `${data.total} ${noun}`;

    return `${first}–${last} de ${data.total} ${noun}`;
  }
</script>

<script lang="ts">
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';

  import { cn } from '$lib/utils/cn';

  let { data, state: barState, ui, actions }: AcerolaPaginationBarProps = $props();

  const pageCount = $derived(pageCountOf(data.total, data.pageSize));
  const isFirst = $derived(data.page <= 1);
  const isLast = $derived(data.page >= pageCount);
</script>

<!-- Empilha no celular: os três blocos lado a lado a 360 px espremem o texto do meio. -->
<div
  class={cn(
    'text-muted-foreground flex flex-col items-center justify-between gap-2 pt-3 text-xs sm:flex-row',
    ui?.className,
  )}
>
  <span>{rangeLabelOf(data)}</span>

  {#if pageCount > 1}
    <div class="flex items-center gap-2">
      <button
        type="button"
        disabled={isFirst || barState?.isLoading}
        onclick={() => actions.onPageChange(data.page - 1)}
        class="border-border/70 bg-card hover:bg-muted/50 text-foreground inline-flex cursor-pointer items-center gap-1 rounded-control control-sm border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft class="size-3.5" aria-hidden="true" />
        Anterior
      </button>

      <span class="tabular-nums">Página {data.page} de {pageCount}</span>

      <button
        type="button"
        disabled={isLast || barState?.isLoading}
        onclick={() => actions.onPageChange(data.page + 1)}
        class="border-border/70 bg-card hover:bg-muted/50 text-foreground inline-flex cursor-pointer items-center gap-1 rounded-control control-sm border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        Próxima
        <ChevronRight class="size-3.5" aria-hidden="true" />
      </button>
    </div>
  {/if}
</div>
