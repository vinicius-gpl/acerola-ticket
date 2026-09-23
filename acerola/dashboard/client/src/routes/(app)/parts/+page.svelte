<script lang="ts">
  import Package from '@lucide/svelte/icons/package';

  import PendingArea from '$lib/components/pending-area/pending-area.svelte';

  /**
   * A rota só compõe (CONTRIBUTING §3).
   *
   * Esta área ainda não foi construída: a tela diz o que vai viver aqui, lido dos requisitos
   * do sistema antigo. Quando ela for feita, este arquivo passa a compor o view-model e a
   * view de verdade, e o `PendingArea` sai.
   */
  const AREA = {
    title: 'Depósito',
    summary: 'As peças de reposição que a TI tem em mãos.',
    features: [
      'Cadastro de peças por categoria, com a quantidade atual.',
      'Entrada e saída com responsável e observação — o saldo se ajusta sozinho a cada movimentação.',
      'Diferenciar peça nova de peça usada.',
      'Ligar a movimentação à máquina que recebeu a peça, para a ficha dela mostrar o que foi trocado.',
    ],
    dependsOn: null,
  };
</script>

<svelte:head>
  <title>Depósito</title>
</svelte:head>

<PendingArea data={AREA} ui={{ icon: Package }} />
