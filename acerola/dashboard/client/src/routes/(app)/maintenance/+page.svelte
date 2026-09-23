<script lang="ts">
  import Wrench from '@lucide/svelte/icons/wrench';

  import PendingArea from '$lib/components/pending-area/pending-area.svelte';

  /**
   * A rota só compõe (CONTRIBUTING §3).
   *
   * Esta área ainda não foi construída: a tela diz o que vai viver aqui, lido dos requisitos
   * do sistema antigo. Quando ela for feita, este arquivo passa a compor o view-model e a
   * view de verdade, e o `PendingArea` sai.
   */
  const AREA = {
    title: 'Manutenção',
    summary: 'O que já foi feito em cada computador, e o que está para vencer.',
    features: [
      'Registrar a manutenção: qual máquina, o tipo, o que foi feito, quem fez e quando.',
      'Histórico por computador, para enxergar quais dão trabalho demais e já valem uma troca.',
      'Lembretes de manutenção preventiva, para ela não depender de alguém lembrar.',
    ],
    dependsOn: 'o Inventário',
  };
</script>

<svelte:head>
  <title>Manutenção</title>
</svelte:head>

<PendingArea data={AREA} ui={{ icon: Wrench }} />
