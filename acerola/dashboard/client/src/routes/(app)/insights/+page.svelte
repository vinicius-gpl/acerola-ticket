<script lang="ts">
  import Lightbulb from '@lucide/svelte/icons/lightbulb';

  import PendingArea from '$lib/components/pending-area/pending-area.svelte';

  /**
   * A rota só compõe (CONTRIBUTING §3).
   *
   * Esta área ainda não foi construída: a tela diz o que vai viver aqui, lido dos requisitos
   * do sistema antigo. Quando ela for feita, este arquivo passa a compor o view-model e a
   * view de verdade, e o `PendingArea` sai.
   */
  const AREA = {
    title: 'Inteligência',
    summary: 'O que os dados juntos dizem, e que nenhuma tela sozinha mostra.',
    features: [
      'Máquinas sobrecarregadas: quem está no limite e há quanto tempo.',
      'Quem precisa de upgrade — troca de disco por SSD, mais memória.',
      'Máquinas que mais geram chamado, para decidir trocar em vez de remendar.',
      'Máquinas de reserva disponíveis e onde elas estão.',
    ],
    dependsOn: 'o Inventário e os Chamados',
  };
</script>

<svelte:head>
  <title>Inteligência</title>
</svelte:head>

<PendingArea data={AREA} ui={{ icon: Lightbulb }} />
