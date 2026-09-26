<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ThemeToggle from './theme-toggle.svelte';

  const { Story } = defineMeta({
    title: 'Components/ThemeToggle',
    component: ThemeToggle,
  });
</script>

<Story name="Default" />

<!-- Onde ele mora de verdade: ao lado do rótulo, no rodapé do menu lateral. -->
<Story name="InSidebarFooter">
  <div class="bg-sidebar text-sidebar-foreground flex w-56 items-center justify-between rounded-lg p-2">
    <span class="text-xs font-medium opacity-70">Tema</span>
    <ThemeToggle />
  </div>
</Story>
