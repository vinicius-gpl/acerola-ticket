<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Harness from './acerola-search-popover-content-harness.test.svelte';
  const { Story } = defineMeta({
    title: 'Components/AcerolaSearchPopoverContent',
    component: Harness,
  });
</script>

<Story name="Default" />
<Story name="NarrowViewport">
  {#snippet template()}
    <div class="w-64 max-w-full"><Harness /></div>
  {/snippet}
</Story>
