<script lang="ts">
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import PendingArea from '$lib/components/pending-area/pending-area.svelte';

  /**
   * A rota só compõe (CONTRIBUTING §3).
   *
   * Esta área ainda não foi construída: a tela diz o que vai viver aqui, lido dos requisitos
   * do sistema antigo. Quando ela for feita, este arquivo passa a compor o view-model e a
   * view de verdade, e o `PendingArea` sai.
   */
  const AREA = {
    title: 'Descarte',
    summary: 'As máquinas que saíram de uso, e o motivo de cada uma.',
    features: [
      'Marcar um computador como descartado, com o motivo e a data.',
      'Histórico do que já saiu, sem apagar nada do inventário — o equipamento some da fila, não da memória.',
    ],
    dependsOn: 'o Inventário',
  };
</script>

<svelte:head>
  <title>Descarte</title>
</svelte:head>

<PendingArea data={AREA} ui={{ icon: Trash2 }} />
