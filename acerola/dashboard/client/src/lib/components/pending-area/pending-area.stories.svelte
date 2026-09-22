<script module lang="ts">
  import HardDrive from '@lucide/svelte/icons/hard-drive';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import PendingArea from './pending-area.svelte';

  const { Story } = defineMeta({
    title: 'Components/PendingArea',
    component: PendingArea,
  });
</script>

<Story
  name="Default"
  args={{
    data: {
      title: 'Inventário',
      summary: 'Os computadores da empresa, com o que cada um tem dentro.',
      features: [
        'Cada máquina se cadastra sozinha quando o agente é instalado nela.',
        'Ficha com processador, memória, discos, placa de vídeo e sistema.',
        'Nota de saúde de 0 a 100, com os avisos que a baixaram.',
        'Online ou offline agora, e quando foi visto pela última vez.',
      ],
    },
    ui: { icon: HardDrive },
  }}
/>

<!-- Área que só faz sentido depois de outra: dizer isso evita a pergunta "por que não
     fizeram esta primeiro?". -->
<Story
  name="Blocked"
  args={{
    data: {
      title: 'Descarte',
      summary: 'As máquinas que saíram de uso, e por quê.',
      features: [
        'Marcar uma máquina como descartada, com o motivo e a data.',
        'Histórico do que já foi descartado, sem apagar nada do inventário.',
      ],
      dependsOn: 'o Inventário',
    },
  }}
/>

<!-- Caso limite: uma única frase, para conferir que a lista não fica órfã. -->
<Story
  name="SingleFeature"
  args={{
    data: {
      title: 'Rede',
      summary: 'Quedas e instabilidade do link de internet.',
      features: ['Receber os alertas do UniFi e registrar quando a internet caiu.'],
    },
  }}
/>

<!-- Caso limite: frase longa, para conferir que ela quebra linha em vez de empurrar a caixa. -->
<Story
  name="LongFeature"
  args={{
    data: {
      title: 'Inteligência',
      summary: 'O que os dados juntos dizem, e que nenhuma tela sozinha mostra.',
      features: [
        'Cruzar desempenho, chamados e manutenções para apontar quais máquinas dão mais trabalho do que valem, e sugerir a troca antes de a pessoa que usa reclamar pela terceira vez.',
      ],
      dependsOn: 'o Inventário e a Manutenção',
    },
  }}
/>
