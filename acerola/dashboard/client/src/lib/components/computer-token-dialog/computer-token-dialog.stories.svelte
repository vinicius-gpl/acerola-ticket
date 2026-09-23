<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ComputerTokenDialog from './computer-token-dialog.svelte';

  /* Token INVENTADO: nenhum código que funcione entra num arquivo versionado. */
  const TOKEN = 'agt_3f9a6c1e8b4d47a2b0c5e7f1a9d2b6c4';

  const actions = { onClose: () => {} };

  const { Story } = defineMeta({
    title: 'Components/ComputerTokenDialog',
    component: ComputerTokenDialog,
  });
</script>

<Story
  name="Default"
  args={{ data: { computerName: 'RECEPCAO-01', token: TOKEN }, actions }}
/>

<!-- Fechado: o diálogo só existe no instante seguinte ao cadastro. -->
<Story
  name="Closed"
  args={{ data: { computerName: 'RECEPCAO-01', token: TOKEN }, state: { isOpen: false }, actions }}
/>

<!-- CASO LIMITE: nome de máquina comprido no título, que não pode empurrar o botão de fechar. -->
<Story
  name="Long machine name"
  args={{
    data: { computerName: 'PARALEGAL-08-ESTACAO-COMPARTILHADA', token: TOKEN },
    actions,
  }}
/>
