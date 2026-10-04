<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import Breadcrumb from './acerola-breadcrumb.svelte';

  const { Story } = defineMeta({
    title: 'Components/AcerolaBreadcrumb',
    component: Breadcrumb,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  args={{
    data: {
      items: [
        { label: 'Computadores', href: '/computers' },
        { label: 'Estação 12', href: '/computers/12' },
        { label: 'Histórico' },
      ],
    },
  }}
/>

<!-- Um item do meio sem endereço vira texto, não link quebrado. -->
<Story
  name="MiddleWithoutLink"
  args={{
    data: {
      items: [{ label: 'Peças', href: '/parts' }, { label: 'Memória' }, { label: 'Movimentações' }],
    },
  }}
/>

<!-- Caso limite: um item só — é a página atual, sem separador. -->
<Story name="SingleItem" args={{ data: { items: [{ label: 'Painel' }] } }} />

<!-- Caso limite: nomes compridos em coluna estreita — a trilha quebra linha, não estoura. -->
<Story
  name="LongLabelsInNarrowColumn"
  args={{
    data: {
      items: [
        { label: 'Manutenções preventivas e corretivas', href: '/maintenance' },
        { label: 'Estação de trabalho do setor financeiro, sala 204', href: '/computers/204' },
        { label: 'Troca de fonte e limpeza interna' },
      ],
    },
    ui: { className: 'max-w-[260px]' },
  }}
/>

<!-- Caso limite: sem itens, nada aparece. -->
<Story name="Empty" args={{ data: { items: [] } }} />
