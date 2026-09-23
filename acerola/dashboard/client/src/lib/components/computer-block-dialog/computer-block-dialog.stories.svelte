<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ComputerBlockDialog from './computer-block-dialog.svelte';

  const data = { computerName: 'CS-06' };

  const actions = { onConfirm: () => {}, onCancel: () => {} };

  const { Story } = defineMeta({
    title: 'Components/ComputerBlockDialog',
    component: ComputerBlockDialog,
  });
</script>

<Story name="Default" args={{ data, state: { isOpen: true }, actions }} />

<Story name="Confirming" args={{ data, state: { isOpen: true, isConfirming: true }, actions }} />

<!-- Recusa do servidor: o diálogo continua aberto, com o motivo digitado. -->
<Story
  name="Error"
  args={{
    data,
    state: { isOpen: true, error: 'Você não tem permissão para bloquear máquinas.' },
    actions,
  }}
/>

<Story name="Closed" args={{ data, state: { isOpen: false }, actions }} />

<!-- CASO LIMITE: nome de máquina comprido dentro da frase de explicação. -->
<Story
  name="Long machine name"
  args={{
    data: { computerName: 'PARALEGAL-08-ESTACAO-COMPARTILHADA' },
    state: { isOpen: true },
    actions,
  }}
/>
