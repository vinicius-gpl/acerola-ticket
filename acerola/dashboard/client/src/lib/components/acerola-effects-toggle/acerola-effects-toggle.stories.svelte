<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import EffectsToggle from './acerola-effects-toggle.svelte';

  /**
   * Alterna entre efeitos visuais completos e leves. O estado é do sistema inteiro: clicar
   * aqui muda o `data-effects` do `<html>`, e o cartão de exemplo abaixo responde na hora.
   */
  const { Story } = defineMeta({
    title: 'Components/AcerolaEffectsToggle',
    component: EffectsToggle,
  });
</script>

<Story name="Default" />

<!-- Onde ele mora de verdade: numa linha do menu lateral, ao lado do rótulo. -->
<Story name="InSidebarRow">
  <div class="flex w-56 items-center justify-between">
    <span class="text-xs font-medium">Efeitos</span>
    <EffectsToggle />
  </div>
</Story>

<!-- Com um item que usa o efeito: passe o mouse no cartão antes e depois de clicar no botão. -->
<Story name="WithHoverFillSample">
  <div class="flex w-72 flex-col gap-3">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium">Efeitos</span>
      <EffectsToggle />
    </div>
    <div
      class="hover-fill border-border bg-card rounded-surface border p-4 text-sm shadow-xs"
      style="--fill-color: var(--warning-soft)"
    >
      Passe o mouse aqui.
    </div>
  </div>
</Story>
