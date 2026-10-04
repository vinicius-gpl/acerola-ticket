<script lang="ts">
  /**
   * `Dialog`/`ResponsiveDialogContent` precisam de `open`/`onOpenChange` do lado de fora — o
   * casulo monta essa composição para o teste poder espiar o fechamento sem precisar de uma
   * tela de verdade.
   */
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ResponsiveDialogContent from './acerola-responsive-dialog-content.svelte';

  let {
    onOpenChange,
    showCloseButton = true,
  }: { onOpenChange: (open: boolean) => void; showCloseButton?: boolean } = $props();
</script>

<Dialog open={true} {onOpenChange}>
  <ResponsiveDialogContent {showCloseButton}>
    <DialogHeader>
      <DialogTitle>Excluir esta peça?</DialogTitle>
      <DialogDescription>A ação não pode ser desfeita.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <ActionButton data={{ label: 'Excluir' }} ui={{ variant: 'danger' }} />
    </DialogFooter>
  </ResponsiveDialogContent>
</Dialog>
