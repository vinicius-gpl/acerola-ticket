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
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import ResponsiveDialogContent from './acerola-responsive-dialog-content.svelte';

  let {
    onOpenChange,
    showCloseButton = true,
    withFields = false,
  }: { onOpenChange: (open: boolean) => void; showCloseButton?: boolean; withFields?: boolean } = $props();
  let values = $state(Array.from({ length: 8 }, () => ''));
  let department = $state('');
</script>

<Dialog open={true} {onOpenChange}>
  <ResponsiveDialogContent {showCloseButton}>
    <DialogHeader>
      <DialogTitle>Excluir esta peça?</DialogTitle>
      <DialogDescription>A ação não pode ser desfeita.</DialogDescription>
    </DialogHeader>
    {#if withFields}
      {#each values as value, index (index)}
        <TextField
          data={{ label: `Campo ${index + 1}`, name: `field-${index}`, value }}
          actions={{ onChange: (next: string) => { values[index] = next; } }}
        />
      {/each}
      <OptionPicker
        data={{ value: department, options: ['Recepção', 'Financeiro', 'Contábil', 'Pessoal'].map((label) => ({ value: label, label })) }}
        ui={{ ariaLabel: 'Departamento', fullWidth: true, mode: 'combobox' }}
        actions={{ onChange: (value) => { department = value; } }}
      />
    {/if}
    <DialogFooter>
      <ActionButton data={{ label: 'Excluir' }} ui={{ variant: 'danger' }} />
    </DialogFooter>
  </ResponsiveDialogContent>
</Dialog>
