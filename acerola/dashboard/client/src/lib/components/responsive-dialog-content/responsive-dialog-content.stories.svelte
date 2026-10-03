<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ResponsiveDialogContent from './responsive-dialog-content.svelte';

  const { Story } = defineMeta({
    title: 'Components/ResponsiveDialogContent',
    component: ResponsiveDialogContent,
  });
</script>

<!-- Estreite a viewport do Storybook para ver a alça e o bottom sheet; acima de `sm` é o
     mesmo modal centrado de sempre. -->
<Story name="Default">
  <Dialog open={true}>
    <ResponsiveDialogContent>
      <DialogHeader>
        <DialogTitle>Excluir esta peça?</DialogTitle>
        <DialogDescription>A ação não pode ser desfeita.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <ActionButton data={{ label: 'Cancelar' }} ui={{ variant: 'secondary' }} />
        <ActionButton data={{ label: 'Excluir' }} ui={{ variant: 'danger' }} />
      </DialogFooter>
    </ResponsiveDialogContent>
  </Dialog>
</Story>

<Story name="WithoutCloseButton">
  <Dialog open={true}>
    <ResponsiveDialogContent showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>Confirmar ação</DialogTitle>
        <DialogDescription>
          Sem X no canto — só a alça (celular) ou os botões do rodapé fecham.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <ActionButton data={{ label: 'Cancelar' }} ui={{ variant: 'secondary' }} />
        <ActionButton data={{ label: 'Confirmar' }} />
      </DialogFooter>
    </ResponsiveDialogContent>
  </Dialog>
</Story>

<!-- Conteúdo alto o bastante para precisar rolar dentro do bottom sheet no celular. -->
<Story name="TallContent">
  <Dialog open={true}>
    <ResponsiveDialogContent>
      <DialogHeader>
        <DialogTitle>Extrato</DialogTitle>
      </DialogHeader>
      <div class="flex flex-col gap-3">
        {#each Array(12) as _, i (i)}
          <div class="rounded-box border border-border p-3 text-sm">Linha {i + 1}</div>
        {/each}
      </div>
    </ResponsiveDialogContent>
  </Dialog>
</Story>
