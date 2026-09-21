<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import ConfirmDialog from './confirm-dialog.component.svelte';

  const baseData = {
    title: 'Excluir esta tarefa?',
    description: '"Ligar para o cliente" será excluída. Não dá para desfazer.',
    confirmLabel: 'Excluir tarefa',
    confirmingLabel: 'Excluindo…',
  };

  const { Story } = defineMeta({
    title: 'Composers/ConfirmDialog',
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
    state: { isOpen: true, error: 'Excluir tarefas é uma ação de administrador.' },
    actions: { onConfirm: fn(), onCancel: fn() },
  }}
/>

<!-- Ação que não é destrutiva: botão primário. -->
<Story
  name="PrimaryTone"
  args={{
    data: {
      title: 'Enviar para aprovação?',
      description: 'A tarefa sai da sua lista e vai para quem aprova.',
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
      title: 'Excluir esta tarefa?',
      description: `"${'Tarefa com um título muito comprido '.repeat(6)}" será excluída. Não dá para desfazer.`,
      confirmLabel: 'Excluir tarefa',
    },
    state: { isOpen: true },
    actions: { onConfirm: fn(), onCancel: fn() },
  }}
/>
