<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import PaginationBar from './pagination-bar.svelte';

  const noun: [string, string] = ['alerta', 'alertas'];

  const { Story } = defineMeta({
    title: 'Components/PaginationBar',
    component: PaginationBar,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  args={{ data: { page: 2, pageSize: 25, total: 312, noun }, actions: { onPageChange: fn() } }}
/>

<!-- Primeira página: o "Anterior" fica desligado, e não some. -->
<Story
  name="FirstPage"
  args={{ data: { page: 1, pageSize: 25, total: 312, noun }, actions: { onPageChange: fn() } }}
/>

<!-- Última página, quase sempre incompleta: a faixa termina no total. -->
<Story
  name="LastPage"
  args={{ data: { page: 13, pageSize: 25, total: 312, noun }, actions: { onPageChange: fn() } }}
/>

<!-- Enquanto a página nova vem, os dois botões travam. -->
<Story
  name="Loading"
  args={{
    data: { page: 2, pageSize: 25, total: 312, noun },
    state: { isLoading: true },
    actions: { onPageChange: fn() },
  }}
/>

<!-- Caso limite: tudo cabe numa página — não há para onde andar, e sobra o total. -->
<Story
  name="SinglePage"
  args={{ data: { page: 1, pageSize: 25, total: 7, noun }, actions: { onPageChange: fn() } }}
/>

<!-- Caso limite: um item só, no singular. -->
<Story
  name="SingleItem"
  args={{ data: { page: 1, pageSize: 25, total: 1, noun }, actions: { onPageChange: fn() } }}
/>

<Story
  name="Empty"
  args={{ data: { page: 1, pageSize: 25, total: 0, noun }, actions: { onPageChange: fn() } }}
/>

<!-- Caso limite: na largura de um celular, os blocos empilham. -->
<Story name="OnPhone">
  <div class="w-[360px]">
    <PaginationBar
      data={{ page: 2, pageSize: 25, total: 312, noun }}
      actions={{ onPageChange: () => {} }}
    />
  </div>
</Story>
