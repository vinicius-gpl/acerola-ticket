<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ComputerDisposalDialog from './computer-disposal-dialog.svelte';

  const data = { computerName: 'RECEPCAO-09' };

  const actions = { onConfirm: () => {}, onCancel: () => {} };

  const { Story } = defineMeta({
    title: 'Components/ComputerDisposalDialog',
    component: ComputerDisposalDialog,
  });
</script>

<Story name="Default" args={{ data, state: { isOpen: true }, actions }} />

<Story name="Confirming" args={{ data, state: { isOpen: true, isConfirming: true }, actions }} />

<!-- Recusa do servidor: o diálogo continua aberto, com o que foi escolhido. -->
<Story
  name="Error"
  args={{
    data,
    state: { isOpen: true, error: 'Você não tem permissão para alterar o cadastro.' },
    actions,
  }}
/>

<Story name="Closed" args={{ data, state: { isOpen: false }, actions }} />

<!-- CASO LIMITE: nome de máquina comprido dentro da frase de explicação. -->
<Story
  name="Long machine name"
  args={{
    data: { computerName: 'PARALEGAL-11-ESTACAO-COMPARTILHADA' },
    state: { isOpen: true },
    actions,
  }}
/>
