<script lang="ts" module>
  import {
    quoteAttachmentAccept,
    quoteKindOptions,
    quoteStatusOptions,
  } from '@template/shared/domain/maintenance-quote.util';
  import {
    QUOTE_DESCRIPTION_MAX_LENGTH,
    QUOTE_NOTE_MAX_LENGTH,
  } from '@template/shared/schemas/maintenance-quote.schema';

  import { type FormFieldState } from '$lib/types/form-field.type';

  export type QuoteFormField =
    | 'supplier'
    | 'description'
    | 'kind'
    | 'amount'
    | 'quotedOn'
    | 'status'
    | 'note';

  /**
   * O formulário de GUARDAR um orçamento feito com uma empresa de fora e o de corrigi-lo, num
   * modal.
   *
   * Função pura de props: o valor e o erro de cada campo chegam prontos (`FormFieldState`), e
   * o documento chega como um nome para mostrar. Por isso o modal abre no Storybook
   * preenchido, com documento, com erro ou enviando — sem servidor no meio.
   *
   * O DOCUMENTO é um campo à parte, com erro próprio: recusar o arquivo não pode apagar o que
   * a pessoa já digitou, e o motivo da recusa precisa aparecer ao lado dele.
   */
  export type AcerolaQuoteFormDialogProps = {
    data: {
      mode: 'create' | 'edit';
      fields: Record<QuoteFormField, FormFieldState>;
      /** O nome do documento à vista: o escolhido agora, o que já existe, ou nada. */
      attachment: { name: string | null };
    };
    state: {
      isOpen: boolean;
      isSubmitting?: boolean;
      error?: string | null;
      attachmentError?: string | null;
    };
    actions: {
      onChange: (field: QuoteFormField, value: string) => void;
      onBlur: (field: QuoteFormField) => void;
      onAttachmentChange: (file: File | null) => void;
      onAttachmentRemove: () => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };

  const KIND_OPTIONS = quoteKindOptions();
  const STATUS_OPTIONS = quoteStatusOptions();
</script>

<script lang="ts">
  import FileText from '@lucide/svelte/icons/file-text';
  import Paperclip from '@lucide/svelte/icons/paperclip';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import DatePicker from '$lib/components/acerola-date-picker/acerola-date-picker.svelte';
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

  let { data, state: dialogState, actions }: AcerolaQuoteFormDialogProps = $props();

  const isEdit = $derived(data.mode === 'edit');
  const fields = $derived(data.fields);

  let attachmentInput = $state<HTMLInputElement | undefined>();

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }

  function handleAttachment(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    actions.onAttachmentChange(input.files?.[0] ?? null);
    /* Limpa SEMPRE, recusado ou não — senão escolher de novo o MESMO arquivo não dispara
       `onchange` nenhum, e a pessoa acha que o botão travou. */
    input.value = '';
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
            <FileText class="size-4" aria-hidden="true" />
          </span>
          <DialogTitle class="text-lg font-semibold tracking-tight">
            {isEdit ? 'Corrigir orçamento' : 'Guardar orçamento'}
          </DialogTitle>
        </div>
        <DialogDescription class="text-muted-foreground text-xs">
          {isEdit
            ? 'O que foi orçado, por quanto e o que foi decidido.'
            : 'Guarde o orçamento que a empresa mandou: produto, serviço ou o que for.'}
        </DialogDescription>
      </DialogHeader>

      <TextField
        data={{
          label: 'Empresa',
          name: 'supplier',
          value: fields.supplier.value,
          placeholder: 'Quem fez o orçamento',
        }}
        state={{
          error: fields.supplier.error,
          isDisabled: dialogState.isSubmitting,
          isAutoFocused: true,
        }}
        actions={{
          onChange: (value: string) => actions.onChange('supplier', value),
          onBlur: () => actions.onBlur('supplier'),
        }}
      />

      <TextAreaField
        data={{
          label: 'O que foi orçado',
          name: 'description',
          value: fields.description.value,
          placeholder: 'Ex: limpeza e recarga de gás dos três aparelhos de ar-condicionado',
          maxLength: QUOTE_DESCRIPTION_MAX_LENGTH,
        }}
        ui={{ rows: 3 }}
        state={{ error: fields.description.error, isDisabled: dialogState.isSubmitting }}
        actions={{
          onChange: (value: string) => actions.onChange('description', value),
          onBlur: () => actions.onBlur('description'),
        }}
      />

      <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Tipo</span>
          <OptionPicker
            data={{ value: fields.kind.value, options: KIND_OPTIONS }}
            ui={{ ariaLabel: 'Tipo do orçamento', fullWidth: true }}
            state={{ isDisabled: dialogState.isSubmitting }}
            actions={{ onChange: (value: string) => actions.onChange('kind', value) }}
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Situação</span>
          <OptionPicker
            data={{ value: fields.status.value, options: STATUS_OPTIONS }}
            ui={{ ariaLabel: 'Situação do orçamento', fullWidth: true }}
            state={{ isDisabled: dialogState.isSubmitting }}
            actions={{ onChange: (value: string) => actions.onChange('status', value) }}
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <TextField
          data={{
            label: 'Valor (R$)',
            name: 'amount',
            value: fields.amount.value,
            placeholder: '1.250,00',
          }}
          ui={{ inputMode: 'decimal' }}
          state={{ error: fields.amount.error, isDisabled: dialogState.isSubmitting }}
          actions={{
            onChange: (value: string) => actions.onChange('amount', value),
            onBlur: () => actions.onBlur('amount'),
          }}
        />

        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Data do orçamento</span>
          <DatePicker
            name="quotedOn"
            ariaLabel="Data do orçamento"
            value={fields.quotedOn.value}
            disabled={dialogState.isSubmitting}
            placeholder="Selecione a data"
            onValueChange={(value) => {
              actions.onChange('quotedOn', value ?? '');
              actions.onBlur('quotedOn');
            }}
          />
          {#if fields.quotedOn.error}
            <span class="text-destructive text-xs">{fields.quotedOn.error}</span>
          {/if}
        </div>
      </div>

      <!-- O DOCUMENTO que a empresa mandou: PDF, ou a foto do papel tirada com o celular. -->
      <div class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Documento</span>
        <div class="flex flex-wrap items-center gap-2">
          <ActionButton
            data={{ label: data.attachment.name ? 'Trocar documento' : 'Anexar documento' }}
            ui={{ variant: 'secondary', icon: Paperclip }}
            state={{ isDisabled: dialogState.isSubmitting }}
            actions={{ onClick: () => attachmentInput?.click() }}
          />
          {#if data.attachment.name}
            <ActionButton
              data={{ label: 'Remover documento' }}
              ui={{ variant: 'ghost', icon: Trash2 }}
              state={{ isDisabled: dialogState.isSubmitting }}
              actions={{ onClick: actions.onAttachmentRemove }}
            />
          {/if}
        </div>
        <p class="text-muted-foreground truncate text-xs">
          {data.attachment.name ?? 'PDF ou imagem (PNG, JPG, WEBP), até 10 MB.'}
        </p>

        <input
          bind:this={attachmentInput}
          id="attachment"
          name="attachment"
          type="file"
          accept={quoteAttachmentAccept()}
          disabled={dialogState.isSubmitting}
          onchange={handleAttachment}
          class="sr-only"
        />

        {#if dialogState.attachmentError}
          <p class="text-destructive text-xs">{dialogState.attachmentError}</p>
        {/if}
      </div>

      <TextAreaField
        data={{
          label: 'Observação',
          name: 'note',
          value: fields.note.value,
          placeholder: 'Prazo, validade da proposta, o que ficou combinado',
          maxLength: QUOTE_NOTE_MAX_LENGTH,
        }}
        ui={{ rows: 2 }}
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
          data={{ label: isEdit ? 'Salvar' : 'Guardar orçamento', loadingLabel: 'Salvando…' }}
          ui={{ className: 'sm:w-auto' }}
          state={{ isLoading: dialogState.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
