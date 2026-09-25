<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type Budget, type BudgetNeed } from '@template/shared/schemas/budget.schema';

  import BudgetView from './budget-view.svelte';

  function need(over: Partial<BudgetNeed> = {}): BudgetNeed {
    return { key: 'memory', needed: 0, inStock: 0, toBuy: 0, machines: [], ...over };
  }

  const machines = [
    {
      computerId: 2,
      computerName: 'FINANCEIRO-02',
      computerDisplayName: 'Financeiro — mesa 2',
      department: 'financeiro' as const,
      value: 4,
    },
    {
      computerId: 7,
      computerName: 'RECEPCAO-07',
      computerDisplayName: null,
      department: 'recepcao' as const,
      value: 4,
    },
  ];

  function budget(over: Partial<Budget> = {}): Budget {
    return {
      needs: [
        need({ key: 'memory', needed: 12, inStock: 4, toBuy: 8, machines }),
        need({
          key: 'disk',
          needed: 3,
          inStock: 3,
          toBuy: 0,
          machines: [{ ...machines[0]!, value: 7 }],
        }),
        need({
          key: 'computer',
          needed: 1,
          inStock: 0,
          toBuy: 1,
          machines: [{ ...machines[1]!, value: 4 }],
        }),
      ],
      ...over,
    };
  }

  const actions = {
    onRetry: () => {},
    onOpenMachine: () => {},
    onOpenComputers: () => {},
    onOpenParts: () => {},
  };

  const settled = { isLoading: false, isEmpty: false, isCovered: false, error: null };

  const nothingNeeded: Budget = {
    needs: [need(), need({ key: 'disk' }), need({ key: 'computer' })],
  };

  const { Story } = defineMeta({
    title: 'Components/BudgetView',
    component: BudgetView,
  });
</script>

<Story name="Default" args={{ data: { budget: budget() }, state: settled, actions }} />

<!-- O depósito cobre tudo: a boa notícia é dita, e as necessidades continuam na tela. -->
<Story
  name="Covered by the storeroom"
  args={{
    data: {
      budget: {
        needs: [
          need({ key: 'memory', needed: 5, inStock: 9, toBuy: 0, machines }),
          need({ key: 'disk', needed: 1, inStock: 4, toBuy: 0 }),
          need({ key: 'computer' }),
        ],
      },
    },
    state: { ...settled, isCovered: true },
    actions,
  }}
/>

<!-- Muitas máquinas na mesma necessidade: a lista corta, e o resto vira um link. -->
<Story
  name="More machines than the list shows"
  args={{
    data: {
      budget: { needs: [need({ key: 'memory', needed: 34, inStock: 0, toBuy: 34, machines })] },
    },
    state: settled,
    actions,
  }}
/>

<Story
  name="Loading"
  args={{ data: { budget: null }, state: { ...settled, isLoading: true }, actions }}
/>

<!-- Parque vazio: o texto diz por onde começar. -->
<Story
  name="No machines yet"
  args={{
    data: { budget: nothingNeeded },
    state: { ...settled, isEmpty: true },
    actions,
  }}
/>

<Story
  name="Error"
  args={{
    data: { budget: null },
    state: { ...settled, error: 'Não consegui falar com o servidor. Confira se ele está rodando.' },
    actions,
  }}
/>
