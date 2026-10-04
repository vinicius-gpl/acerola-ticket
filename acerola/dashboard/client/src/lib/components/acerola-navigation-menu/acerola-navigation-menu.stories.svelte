<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import NavigationMenu from './acerola-navigation-menu.svelte';

  const items = [
    { label: 'Visão geral', href: '/computers/12', isActive: true },
    { label: 'Histórico', href: '/computers/12/history' },
    { label: 'Peças', href: '/computers/12/parts' },
  ];

  const { Story } = defineMeta({
    title: 'Components/AcerolaNavigationMenu',
    component: NavigationMenu,
    parameters: { layout: 'padded' },
    args: { data: { items }, ui: { ariaLabel: 'Seções do computador' } },
  });
</script>

<Story name="Default" />

<!-- Nenhum item marcado: a tela ainda não sabe onde a pessoa está. -->
<Story
  name="NothingActive"
  args={{ data: { items: items.map((item) => ({ ...item, isActive: false })) } }}
/>

<!-- Caso limite: um item só. -->
<Story name="SingleItem" args={{ data: { items: items.slice(0, 1) } }} />

<!-- Caso limite: muitos itens em coluna estreita — quebra linha, não rola para o lado. -->
<Story
  name="ManyItemsInNarrowColumn"
  args={{
    data: {
      items: [
        ...items,
        { label: 'Manutenções', href: '/computers/12/maintenance' },
        { label: 'Transferências', href: '/computers/12/transfers' },
        { label: 'Alertas', href: '/computers/12/alerts' },
      ],
    },
    ui: { ariaLabel: 'Seções do computador', className: 'max-w-[280px]' },
  }}
/>

<!-- Caso limite: sem itens, nada aparece. -->
<Story name="Empty" args={{ data: { items: [] } }} />
