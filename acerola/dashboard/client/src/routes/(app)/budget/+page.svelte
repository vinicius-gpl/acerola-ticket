<script lang="ts">
  import BudgetView from '$lib/components/budget-view/budget-view.svelte';
  import { useBudgetModel } from '$lib/hooks/use-budget/use-budget.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * Não há estado de tela aqui — não há filtro nenhum nesta tela: a pergunta que ela responde
   * ("o que eu preciso pedir?") é sempre sobre o parque inteiro, hoje.
   */
  const budget = useBudgetModel();
</script>

<svelte:head>
  <title>Orçamento</title>
</svelte:head>

<BudgetView data={budget.data} state={budget.state} actions={budget.actions} />
