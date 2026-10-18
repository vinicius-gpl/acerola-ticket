<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import AppShell from '$lib/components/acerola-app-shell/acerola-app-shell.svelte';

  const { Story } = defineMeta({
    title: 'Components/AcerolaSidebarControls',
    component: AppShell,
  });
</script>

<Story name="Expanded">
  {#snippet template()}
    <AppShell><p>Arraste a borda para recolher o menu.</p></AppShell>
  {/snippet}
</Story>
<Story name="Collapsed">
  {#snippet template()}
    <AppShell initialSidebarOpen={false}><p>Arraste a borda para expandir o menu.</p></AppShell>
  {/snippet}
</Story>
