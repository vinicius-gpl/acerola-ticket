<script lang="ts" module>
  import type { WhatsappTemplate } from '@template/shared/schemas/whatsapp-template.schema';

  /**
   * A edição dos textos do bot de WhatsApp — só o super admin chega aqui.
   *
   * Cada mensagem é um modelo com variáveis entre chaves duplas. A pessoa escolhe a mensagem,
   * mexe no texto e vê, embaixo, como ela fica com um chamado de exemplo. As variáveis que
   * valem para aquela mensagem ficam à vista: clicar numa a acrescenta ao fim do texto.
   *
   * Função pura de props: a prévia, o erro do rascunho e o "pode salvar" chegam prontos.
   */
  export type AcerolaWhatsappTemplatesDialogProps = {
    data: {
      templates: WhatsappTemplate[];
      selected: WhatsappTemplate | null;
      /** O texto que está no campo — ainda não salvo. */
      draft: string;
      /** O rascunho com as variáveis preenchidas por um chamado de exemplo. */
      preview: string;
    };
    state: {
      isOpen: boolean;
      isLoading?: boolean;
      isSaving?: boolean;
      isRestoring?: boolean;
      /** Acabou de salvar ou restaurar — some na próxima tecla. */
      isSaved?: boolean;
      canSave?: boolean;
      /** Por que o rascunho não pode ser salvo (variável que não existe, texto vazio…). */
      draftError?: string | null;
      error?: string | null;
    };
    actions: {
      onSelect: (key: string) => void;
      onDraftChange: (text: string) => void;
      onSave: () => void;
      onRestore: () => void;
      onClose: () => void;
    };
  };
</script>

<script lang="ts">
  import DialogContent from '$lib/components/acerola-responsive-dialog-content/acerola-responsive-dialog-content.svelte';
  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/acerola-dialog/acerola-dialog';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import TextAreaField from '$lib/components/acerola-text-area-field/acerola-text-area-field.svelte';

  let { data, state, actions }: AcerolaWhatsappTemplatesDialogProps = $props();

  const options = $derived(
    data.templates.map((template) => ({ value: template.key, label: template.label })),
  );
  const isBusy = $derived(Boolean(state.isSaving || state.isRestoring));

  function insertVariable(name: string): void {
    const separator = data.draft.length === 0 || data.draft.endsWith(' ') ? '' : ' ';
    actions.onDraftChange(`${data.draft}${separator}{{${name}}}`);
  }
</script>

<Dialog
  open={state.isOpen}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent showCloseButton={false} class="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
    <DialogHeader class="gap-1.5">
      <DialogTitle class="text-lg font-semibold tracking-tight">Textos do bot de WhatsApp</DialogTitle>
      <DialogDescription class="text-muted-foreground text-xs">
        Valem para todos os números vinculados. Use *negrito*, _itálico_ e as variáveis entre
        chaves duplas, que o sistema preenche na hora de enviar.
      </DialogDescription>
    </DialogHeader>

    {#if state.isLoading}
      <p class="text-muted-foreground py-6 text-center text-sm" role="status">Carregando os textos…</p>
    {:else if data.selected}
      {@const selected = data.selected}
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Mensagem</span>
          <OptionPicker
            data={{ value: selected.key, options }}
            ui={{ ariaLabel: 'Mensagem', fullWidth: true }}
            state={{ isDisabled: isBusy }}
            actions={{ onChange: actions.onSelect }}
          />
          <p class="text-muted-foreground text-xs">{selected.description}</p>
        </div>

        <TextAreaField
          data={{ label: 'Texto', name: 'whatsapp-template-body', value: data.draft, isRequired: true }}
          ui={{ rows: 7 }}
          state={{ error: state.draftError, isDisabled: isBusy }}
          actions={{ onChange: actions.onDraftChange }}
        />

        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Variáveis desta mensagem</span>
          <div class="flex flex-wrap gap-1.5">
            {#each selected.variables as variable (variable)}
              <button
                type="button"
                class="rounded-chip border-border bg-muted/40 text-foreground hover:bg-muted border px-2 py-1 font-mono text-xs transition-colors"
                disabled={isBusy}
                aria-label={`Inserir a variável ${variable}`}
                onclick={() => insertVariable(variable)}
              >
                {`{{${variable}}}`}
              </button>
            {/each}
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Como fica</span>
          <!-- `whitespace-pre-wrap`: as quebras de linha do texto são parte da mensagem. -->
          <p
            class="rounded-box border-border bg-muted/30 text-foreground border p-3 text-sm whitespace-pre-wrap"
            data-testid="whatsapp-template-preview"
          >
            {data.preview}
          </p>
          <p class="text-muted-foreground text-xs">Prévia com um chamado de exemplo.</p>
        </div>

        {#if state.error}
          <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
        {/if}
        {#if state.isSaved}
          <p class="text-success text-sm" role="status">Texto salvo.</p>
        {/if}
      </div>
    {:else}
      <ErrorState
        data={{ message: state.error ?? 'Não consegui carregar os textos.' }}
        ui={{ variant: 'inline' }}
      />
    {/if}

    <DialogFooter>
      <ActionButton
        data={{ label: 'Fechar' }}
        ui={{ variant: 'secondary' }}
        state={{ isDisabled: isBusy }}
        actions={{ onClick: actions.onClose }}
      />
      {#if data.selected?.isCustomized}
        <ActionButton
          data={{ label: 'Restaurar o original', loadingLabel: 'Restaurando…' }}
          ui={{ variant: 'ghost' }}
          state={{ isLoading: state.isRestoring, isDisabled: state.isSaving }}
          actions={{ onClick: actions.onRestore }}
        />
      {/if}
      <ActionButton
        data={{ label: 'Salvar texto', loadingLabel: 'Salvando…' }}
        state={{ isLoading: state.isSaving, isDisabled: !state.canSave || state.isRestoring }}
        actions={{ onClick: actions.onSave }}
      />
    </DialogFooter>
  </DialogContent>
</Dialog>
