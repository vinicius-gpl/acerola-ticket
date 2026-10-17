<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import ConfirmDialog from './acerola-confirm-dialog.svelte';

  const baseData = {
    title: 'Excluir este chamado?',
    description: '"Ligar para o cliente" será excluído. Não dá para desfazer.',
    confirmLabel: 'Excluir chamado',
    confirmingLabel: 'Excluindo…',
  };

  const { Story } = defineMeta({
    title: 'Components/AcerolaConfirmDialog',
    component: ConfirmDialog,
  });
</script>

<Story name="Default" args={{ data: baseData, state: { isOpen: true }, actions: { onConfirm: fn(), onCancel: fn() } }} />

<Story
  name="Confirming"
  args={{ data: baseData, state: { isOpen: true, isConfirming: true }, actions: { onConfirm: fn(), onCancel: fn() } }}
/>

<!-- A recusa aparece dentro do modal, e ele continua aberto. -->
<Story
  name="WithError"
  args={{
    data: baseData,
    state: { isOpen: true, error: 'Excluir chamados é uma ação de administrador.' },
    actions: { onConfirm: fn(), onCancel: fn() },
  }}
/>

<!-- Ação que não é destrutiva: botão primário. -->
<Story
  name="PrimaryTone"
  args={{
    data: {
      title: 'Enviar para aprovação?',
      description: 'O chamado sai da sua fila e vai para quem aprova.',
      confirmLabel: 'Enviar',
    },
    ui: { tone: 'primary' },
    state: { isOpen: true },
    actions: { onConfirm: fn(), onCancel: fn() },
  }}
/>

<!-- Caso limite: título do registro enorme dentro da descrição. -->
<Story
  name="LongDescription"
  args={{
    data: {
      title: 'Excluir este chamado?',
      description: `"${'Chamado com um título muito comprido '.repeat(6)}" será excluído. Não dá para desfazer.`,
      confirmLabel: 'Excluir chamado',
    },
    state: { isOpen: true },
    actions: { onConfirm: fn(), onCancel: fn() },
  }}
/>
