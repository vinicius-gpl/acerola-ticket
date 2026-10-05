<script lang="ts" module>
  import {
    inventoryCategoryOptions,
    inventoryUnitOptions,
  } from '@template/shared/domain/inventory-catalog.util';
  import { inventoryPhotoAccept } from '@template/shared/domain/inventory-photo.util';

  import { type FormFieldState } from '$lib/types/form-field.type';

  export type InventoryFormField = 'name' | 'category' | 'unit' | 'location' | 'code' | 'note';

  /**
   * O formulário de cadastrar produto do inventário e o de corrigir o cadastro dele, num modal.
   *
   * Função pura de props: o valor e o erro de cada campo chegam prontos (`FormFieldState`), e
   * a foto chega como um endereço para mostrar. Por isso o modal abre no Storybook preenchido,
   * com foto, com erro ou enviando — sem servidor e sem biblioteca de formulário no meio.
   *
   * A FOTO é um campo à parte, com erro próprio: recusar a imagem não pode apagar o que a
   * pessoa já digitou, e o motivo da recusa precisa aparecer ao lado dela, não no rodapé.
   */
  export type AcerolaInventoryFormDialogProps = {
    data: {
      mode: 'create' | 'edit';
      fields: Record<InventoryFormField, FormFieldState>;
      photo: { previewUrl: string | null; fileName: string | null };
    };
    state: {
      isOpen: boolean;
      isSubmitting?: boolean;
      error?: string | null;
      photoError?: string | null;
    };
    actions: {
      onChange: (field: InventoryFormField, value: string) => void;
      onBlur: (field: InventoryFormField) => void;
      onPhotoChange: (file: File | null) => void;
      onPhotoRemove: () => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };

  const CATEGORY_OPTIONS = inventoryCategoryOptions();
  const UNIT_OPTIONS = inventoryUnitOptions();
</script>

<script lang="ts">
  import ImagePlus from '@lucide/svelte/icons/image-plus';
  import Package from '@lucide/svelte/icons/package';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import SubmitButton from '$lib/components/acerola-submit-button/acerola-submit-button.svelte';
  import TextAreaField from '$lib/components/acerola-text-area-field/acerola-text-area-field.svelte';
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';

  let { data, state: dialogState, actions }: AcerolaInventoryFormDialogProps = $props();

  const isEdit = $derived(data.mode === 'edit');
  const fields = $derived(data.fields);

  let photoInput = $state<HTMLInputElement | undefined>();

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }

  function handlePhoto(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    actions.onPhotoChange(input.files?.[0] ?? null);
    /* Limpa SEMPRE, recusada ou não — senão escolher de novo o MESMO arquivo (para tentar
       outro no lugar) não dispara `onchange` nenhum, e a pessoa acha que o botão travou. */
    input.value = '';
  }

  function removePhoto(): void {
    actions.onPhotoRemove();
    if (photoInput) photoInput.value = '';
  }
</script>

<Dialog
  open={dialogState.isOpen}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent>
    <form novalidate class="flex flex-col gap-4.5" onsubmit={handleSubmit}>
      <DialogHeader class="gap-1.5">
        <div class="flex items-center gap-2.5">
          <span
            class="rounded-chip bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center"
          >
            <Package class="size-4" aria-hidden="true" />
          </span>
          <DialogTitle class="text-lg font-semibold tracking-tight">
            {isEdit ? 'Corrigir produto' : 'Cadastrar produto'}
          </DialogTitle>
        </div>
        <DialogDescription class="text-muted-foreground text-xs">
          {isEdit
            ? 'O que é o produto, como ele é contado e onde fica.'
            : 'Cadastre o que existe no escritório: mobiliário, mercadinho, limpeza e o resto.'}
        </DialogDescription>
      </DialogHeader>

      <TextField
        data={{
          label: 'Nome do produto',
          name: 'name',
          value: fields.name.value,
          placeholder: 'Ex: Cadeira giratória, Café em pó 500 g',
        }}
        state={{
          error: fields.name.error,
          isDisabled: dialogState.isSubmitting,
          isAutoFocused: true,
        }}
        actions={{
          onChange: (value: string) => actions.onChange('name', value),
          onBlur: () => actions.onBlur('name'),
        }}
      />

      <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Categoria</span>
          <OptionPicker
            data={{ value: fields.category.value, options: CATEGORY_OPTIONS }}
            ui={{ ariaLabel: 'Categoria', fullWidth: true }}
            state={{ isDisabled: dialogState.isSubmitting }}
            actions={{ onChange: (value: string) => actions.onChange('category', value) }}
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Como é contado</span>
          <OptionPicker
            data={{ value: fields.unit.value, options: UNIT_OPTIONS }}
            ui={{ ariaLabel: 'Como é contado', fullWidth: true }}
            state={{ isDisabled: dialogState.isSubmitting }}
            actions={{ onChange: (value: string) => actions.onChange('unit', value) }}
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <TextField
          data={{
            label: 'Onde fica',
            name: 'location',
            value: fields.location.value,
            placeholder: 'Ex: Copa, Sala da contabilidade',
          }}
          state={{ error: fields.location.error, isDisabled: dialogState.isSubmitting }}
          actions={{
            onChange: (value: string) => actions.onChange('location', value),
            onBlur: () => actions.onBlur('location'),
          }}
        />

        <TextField
          data={{
            label: 'Código ou patrimônio',
            name: 'code',
            value: fields.code.value,
            placeholder: 'A etiqueta colada no produto',
          }}
          state={{ error: fields.code.error, isDisabled: dialogState.isSubmitting }}
          actions={{
            onChange: (value: string) => actions.onChange('code', value),
            onBlur: () => actions.onBlur('code'),
          }}
        />
      </div>

      <!-- A FOTO ao lado da prévia, e não um campo de arquivo solto: quem cadastra precisa ver
           que a imagem que escolheu é a certa antes de salvar. -->
      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Foto</span>
        <div class="flex items-center gap-3">
          <div
            class="rounded-control border-border bg-muted/40 flex size-20 shrink-0 items-center justify-center overflow-hidden border"
          >
            {#if data.photo.previewUrl}
              <img
                src={data.photo.previewUrl}
                alt="Foto do produto"
                class="size-full object-cover"
              />
            {:else}
              <ImagePlus class="text-muted-foreground size-5" aria-hidden="true" />
            {/if}
          </div>

          <div class="flex min-w-0 flex-col gap-1.5">
            <div class="flex flex-wrap items-center gap-2">
              <ActionButton
                data={{ label: data.photo.previewUrl ? 'Trocar foto' : 'Escolher foto' }}
                ui={{ variant: 'secondary' }}
                state={{ isDisabled: dialogState.isSubmitting }}
                actions={{ onClick: () => photoInput?.click() }}
              />
              {#if data.photo.previewUrl}
                <ActionButton
                  data={{ label: 'Tirar foto' }}
                  ui={{ variant: 'ghost', icon: Trash2 }}
                  state={{ isDisabled: dialogState.isSubmitting }}
                  actions={{ onClick: removePhoto }}
                />
              {/if}
            </div>
            <p class="text-muted-foreground truncate text-xs">
              {data.photo.fileName ?? 'PNG, JPG, WEBP ou HEIC. A imagem é reduzida ao salvar.'}
            </p>
          </div>
        </div>

        <input
          bind:this={photoInput}
          id="photo"
          name="photo"
          type="file"
          accept={inventoryPhotoAccept()}
          disabled={dialogState.isSubmitting}
          onchange={handlePhoto}
          class="sr-only"
        />

        {#if dialogState.photoError}
          <p class="text-destructive text-xs">{dialogState.photoError}</p>
        {/if}
      </div>

      <TextAreaField
        data={{
          label: 'Observação',
          name: 'note',
          value: fields.note.value,
          placeholder: 'O que mais alguém precisa saber sobre este produto',
        }}
        ui={{ rows: 3 }}
        state={{ error: fields.note.error, isDisabled: dialogState.isSubmitting }}
        actions={{
          onChange: (value: string) => actions.onChange('note', value),
          onBlur: () => actions.onBlur('note'),
        }}
      />

      {#if dialogState.error}
        <ErrorState data={{ message: dialogState.error }} ui={{ variant: 'inline' }} />
      {/if}

      <DialogFooter>
        <ActionButton
          data={{ label: 'Cancelar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: dialogState.isSubmitting }}
          actions={{ onClick: actions.onClose }}
        />
        <SubmitButton
          data={{ label: isEdit ? 'Salvar' : 'Cadastrar produto', loadingLabel: 'Salvando…' }}
          ui={{ className: 'sm:w-auto' }}
          state={{ isLoading: dialogState.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
