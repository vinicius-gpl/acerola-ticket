<script lang="ts">
  import Wifi from '@lucide/svelte/icons/wifi';

  import PendingArea from '$lib/components/pending-area/pending-area.svelte';

  /**
   * A rota só compõe (CONTRIBUTING §3).
   *
   * Esta área ainda não foi construída: a tela diz o que vai viver aqui, lido dos requisitos
   * do sistema antigo. Quando ela for feita, este arquivo passa a compor o view-model e a
   * view de verdade, e o `PendingArea` sai.
   */
  const AREA = {
    title: 'Rede',
    summary: 'Quedas e instabilidade do link de internet.',
    features: [
      'Receber os alertas do UniFi e registrar quando a internet caiu e quando voltou.',
      'Latência e perda de pacote por link, com a severidade de cada evento.',
      'Marcar um alerta como resolvido, sem perder o registro de que ele aconteceu.',
    ],
    dependsOn: null,
  };
</script>

<svelte:head>
  <title>Rede</title>
</svelte:head>

<PendingArea data={AREA} ui={{ icon: Wifi }} />
