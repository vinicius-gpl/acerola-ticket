<script lang="ts">
  import Monitor from '@lucide/svelte/icons/monitor';

  import PendingArea from '$lib/components/pending-area/pending-area.svelte';

  /**
   * A rota só compõe (CONTRIBUTING §3).
   *
   * Esta área ainda não foi construída: a tela diz o que vai viver aqui, lido dos requisitos
   * do sistema antigo. Quando ela for feita, este arquivo passa a compor o view-model e a
   * view de verdade, e o `PendingArea` sai.
   */
  const AREA = {
    title: 'Painel',
    summary: 'A saúde do parque num lugar só: o que está pegando fogo hoje.',
    features: [
      'Mapa dos maiores problemas do parque, do mais grave para o menos.',
      'Alertas do mês, juntando chamados e máquinas com problema.',
      'Manutenções feitas no período, para saber onde o tempo foi gasto.',
      'Problemas por tipo e departamentos que mais pedem socorro.',
    ],
    dependsOn: 'o Inventário e a Manutenção',
  };
</script>

<svelte:head>
  <title>Painel</title>
</svelte:head>

<PendingArea data={AREA} ui={{ icon: Monitor }} />
