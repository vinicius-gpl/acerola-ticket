<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import BrandMark from './brand-mark.svelte';

  const { Story } = defineMeta({
    title: 'Components/BrandMark',
    component: BrandMark,
    parameters: { layout: 'padded' },
  });
</script>

<!-- O tamanho do meio é o da barra lateral aberta. -->
<Story name="Default" args={{}} />

<!-- Pequeno: cabe na barra recolhida e no rodapé. -->
<Story name="Small" args={{ ui: { size: 'sm' } }} />

<!-- Grande: é o tamanho da tela de entrar, onde a marca é o assunto. -->
<Story name="Large" args={{ ui: { size: 'lg' } }} />

<!-- Caso limite: sobre o fundo da barra lateral, que é de onde a cor do texto vem. -->
<Story name="OnSidebar">
  <div class="bg-sidebar rounded-lg p-4">
    <BrandMark />
  </div>
</Story>
