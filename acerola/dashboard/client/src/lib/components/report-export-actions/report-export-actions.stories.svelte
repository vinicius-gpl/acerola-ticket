<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import ReportExportActions from './report-export-actions.svelte';

  const { Story } = defineMeta({
    title: 'Components/ReportExportActions',
    component: ReportExportActions,
  });
</script>

<Story
  name="Default"
  args={{ state: { exportingFormat: null }, actions: { onExport: fn() } }}
/>

<!-- Baixando o Excel: só o botão do Excel gira, os outros ficam desabilitados até terminar. -->
<Story
  name="ExportingXlsx"
  args={{ state: { exportingFormat: 'xlsx' }, actions: { onExport: fn() } }}
/>

<!-- Caso limite: dentro de uma coluna estreita os três botões precisam quebrar linha. -->
<Story
  name="NarrowColumn"
  args={{ state: { exportingFormat: null }, actions: { onExport: fn() } }}
>
  {#snippet template(args)}
    <div class="border-ink-300 w-40 border border-dashed p-2">
      <ReportExportActions {...args} />
    </div>
  {/snippet}
</Story>
