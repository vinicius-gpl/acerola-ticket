<script lang="ts">
  import { Popover, PopoverTrigger } from '$lib/components/ui/popover';
  import SearchPopoverContent from './acerola-search-popover-content.svelte';
  let { onOpenAutoFocus }: { onOpenAutoFocus?: (event: Event) => void } = $props();
</script>

<Popover>
  <PopoverTrigger>Escolher opção</PopoverTrigger>
  <SearchPopoverContent {onOpenAutoFocus}>
    <div class="p-2"><input aria-label="Buscar opções" /></div>
    <div class="overflow-y-auto p-2"><button type="button">Recepção</button></div>
  </SearchPopoverContent>
</Popover>
