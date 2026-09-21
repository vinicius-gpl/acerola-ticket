<script lang="ts" module>
  import { cn } from '$lib/utils/cn';

  /**
   * Um selo de situação: texto curto sobre fundo de cor.
   *
   * O TOM É PASSADO, NÃO ESCOLHIDO AQUI. Quem sabe que "Concluída" é verde é o domínio (ex.:
   * `taskStatusTone` em `shared/src/domain`) — deixar cada tela escolher a cor é como a mesma
   * situação aparece verde numa lista e cinza em outra.
   */
  export type StatusBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

  export type StatusBadgeProps = {
    data: { label: string | null | undefined };
    ui?: { tone?: StatusBadgeTone; size?: 'sm' | 'md'; className?: string };
  };

  const TONE_CLASSES: Record<StatusBadgeTone, string> = {
    neutral: 'bg-gray-100 text-gray-700',
    info: 'bg-blue-100 text-blue-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-700',
    brand: 'bg-brand-blue-100 text-brand-blue-900',
  };
</script>

<script lang="ts">
  let { data, ui }: StatusBadgeProps = $props();
</script>

<!-- Situação vazia não é uma situação: um selo cinza escrito "—" faria parecer que alguém
     respondeu algo. Linha que ninguém tocou fica sem selo. -->
{#if !data.label}
  <span class={cn('text-ink-500 text-xs', ui?.className)}>Não preenchido</span>
{:else}
  <span
    class={cn(
      'inline-flex items-center rounded-full font-semibold whitespace-nowrap',
      ui?.size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
      TONE_CLASSES[ui?.tone ?? 'neutral'],
      ui?.className,
    )}
  >
    {data.label}
  </span>
{/if}
