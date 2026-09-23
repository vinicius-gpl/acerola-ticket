<script lang="ts">
  import Wallet from '@lucide/svelte/icons/wallet';

  import PendingArea from '$lib/components/pending-area/pending-area.svelte';

  /**
   * A rota só compõe (CONTRIBUTING §3).
   *
   * Esta área ainda não foi construída: a tela diz o que vai viver aqui, lido dos requisitos
   * do sistema antigo. Quando ela for feita, este arquivo passa a compor o view-model e a
   * view de verdade, e o `PendingArea` sai.
   */
  const AREA = {
    title: 'Orçamento',
    summary: 'O que precisa ser comprado, e quanto isso custa.',
    features: [
      'O que comprar, cruzando a necessidade do parque com o que já existe no depósito.',
      'Referência de preços e onde comprar, para não começar a pesquisa do zero toda vez.',
    ],
    dependsOn: 'o Inventário e o Depósito',
  };
</script>

<svelte:head>
  <title>Orçamento</title>
</svelte:head>

<PendingArea data={AREA} ui={{ icon: Wallet }} />
