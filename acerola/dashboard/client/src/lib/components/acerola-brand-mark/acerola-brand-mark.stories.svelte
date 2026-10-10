<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import BrandMark from './acerola-brand-mark.svelte';

  const { Story } = defineMeta({
    title: 'Components/AcerolaBrandMark',
    component: BrandMark,
    parameters: { layout: 'padded' },
  });
</script>

<!-- O tamanho do meio: a logo sozinha, sem o nome ao lado. -->
<Story name="Default" args={{}} />

<!-- Pequeno: é o do topo da barra lateral aberta. -->
<Story name="Small" args={{ ui: { size: 'sm' } }} />

<!-- Grande: é o tamanho da tela de entrar, onde a marca é o assunto. -->
<Story name="Large" args={{ ui: { size: 'lg' } }} />

<!-- Caso limite: sobre o fundo da barra lateral, onde a logo precisa continuar legível. -->
<Story name="OnSidebar">
  <div class="bg-sidebar rounded-box p-4">
    <BrandMark />
  </div>
</Story>
