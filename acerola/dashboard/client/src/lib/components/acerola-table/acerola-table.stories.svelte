<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';

  import {
    Table,
    TableActions,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from './acerola-table';

  const parts = [
    { id: 'p-1', name: 'Memória 8 GB', category: 'Memória', balance: 12 },
    { id: 'p-2', name: 'Fonte 500 W', category: 'Fonte', balance: 3 },
    { id: 'p-3', name: 'SSD 480 GB', category: 'Armazenamento', balance: 0 },
  ];

  const { Story } = defineMeta({
    title: 'Components/AcerolaTable',
    component: Table,
    parameters: { layout: 'padded' },
  });
</script>

{#snippet rows(list: typeof parts)}
  <TableHeader>
    <TableRow>
      <TableHead>Peça</TableHead>
      <TableHead>Categoria</TableHead>
      <TableHead class="text-right">Saldo</TableHead>
      <TableHead class="text-right"><span class="sr-only">Ações</span></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each list as part (part.id)}
      <TableRow>
        <TableCell class="font-medium">{part.name}</TableCell>
        <TableCell>{part.category}</TableCell>
        <TableCell class="text-right tabular-nums">{part.balance}</TableCell>
        <TableCell class="text-right">
          <TableActions>
            <ActionButton
              data={{ label: 'Ver histórico' }}
              ui={{ variant: 'ghost', size: 'sm' }}
              actions={{ onClick: () => {} }}
            />
          </TableActions>
        </TableCell>
      </TableRow>
    {/each}
  </TableBody>
{/snippet}

<Story name="Default">
  <Table>{@render rows(parts)}</Table>
</Story>

<!-- Com o rodapé: fonte do dado à esquerda, contagem à direita. -->
<Story name="WithFooter">
  <Table>
    {@render rows(parts)}
    {#snippet footer()}
      <span>Estoque de peças</span>
      <span>3 peças</span>
    {/snippet}
  </Table>
</Story>

<!-- Dentro de um cartão que já tem borda: a superfície da tabela some. -->
<Story name="InsideCard">
  <div class="border-border bg-card rounded-surface border shadow-xs">
    <Table containerClass="rounded-none border-0 bg-transparent shadow-none">
      {@render rows(parts)}
    </Table>
  </div>
</Story>

<!-- Caso limite: uma linha só — sem divisória sobrando embaixo. -->
<Story name="SingleRow">
  <Table>{@render rows(parts.slice(0, 1))}</Table>
</Story>

<!-- Caso limite: texto comprido quebra dentro da célula; em tela estreita quem rola é a caixa. -->
<Story name="LongTextInNarrowColumn">
  <div class="max-w-[360px]">
    <Table class="min-w-[520px]">
      {@render rows([
        {
          id: 'p-9',
          name: 'Placa de rede sem fio com antena destacável e suporte de perfil baixo',
          category: 'Rede e conectividade',
          balance: 1,
        },
      ])}
    </Table>
  </div>
</Story>
