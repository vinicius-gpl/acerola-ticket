<script lang="ts" module>
  import { reportFormatOptions, type ReportFormat } from '@template/shared/schemas/report.schema';

  /**
   * Os três botões de "baixar relatório" — Excel, Word e PDF — na mesma forma em qualquer
   * tela que precisar deles.
   *
   * Função pura de props: quem baixa o arquivo e mostra o navegador salvando é o view-model
   * que chama `onExport`, não este componente.
   */
  export type ReportExportActionsProps = {
    ui?: { className?: string };
    state: { exportingFormat: ReportFormat | null };
    actions: { onExport: (format: ReportFormat) => void };
  };

  const FORMATS = reportFormatOptions();
</script>

<script lang="ts">
  import Download from '@lucide/svelte/icons/download';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import { cn } from '$lib/utils/cn';

  let { ui, state, actions }: ReportExportActionsProps = $props();
</script>

<div class={cn('flex flex-wrap gap-2', ui?.className)}>
  {#each FORMATS as format (format.value)}
    <ActionButton
      data={{ label: format.label, loadingLabel: 'Baixando…' }}
      ui={{ variant: 'secondary', size: 'sm', icon: Download }}
      state={{
        isLoading: state.exportingFormat === format.value,
        isDisabled: state.exportingFormat !== null && state.exportingFormat !== format.value,
      }}
      actions={{ onClick: () => actions.onExport(format.value) }}
    />
  {/each}
</div>
