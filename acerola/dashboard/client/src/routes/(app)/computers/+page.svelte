<script lang="ts">
  import HardDrive from '@lucide/svelte/icons/hard-drive';

  import PendingArea from '$lib/components/pending-area/pending-area.svelte';

  /**
   * A rota só compõe (CONTRIBUTING §3).
   *
   * Esta área ainda não foi construída: a tela diz o que vai viver aqui, lido dos requisitos
   * do sistema antigo. Quando ela for feita, este arquivo passa a compor o view-model e a
   * view de verdade, e o `PendingArea` sai.
   */
  const AREA = {
    title: 'Inventário',
    summary: 'Os computadores da empresa, com o que cada um tem dentro.',
    features: [
      'Cada máquina se cadastra sozinha quando o agente é instalado nela.',
      'Ficha completa: processador, memória e pentes, discos, placa de vídeo, bateria, sistema e número de série.',
      'Nota de saúde de 0 a 100, com os avisos que a baixaram — pouca memória, disco cheio, SSD gasto, disco com falha.',
      'Online ou offline agora, e quando a máquina foi vista pela última vez.',
      'Uso de processador, memória e disco ao vivo, com histórico e os programas que mais consomem.',
      'Alerta automático quando passa do limite, com a causa provável e quando normalizou.',
      'Renomear a máquina, definir o responsável e o departamento dela.',
      'Bloquear uma máquina não autorizada; arquivar uma que saiu de uso, sem apagar os dados.',
    ],
    dependsOn: null,
  };
</script>

<svelte:head>
  <title>Inventário</title>
</svelte:head>

<PendingArea data={AREA} ui={{ icon: HardDrive }} />
