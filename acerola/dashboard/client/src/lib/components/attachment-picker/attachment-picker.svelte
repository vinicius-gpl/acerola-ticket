<script lang="ts" module>
  import {
    ATTACHMENT_KINDS,
    ATTACHMENT_RULES,
    attachmentAccept,
    attachmentKindOf,
    megabytesOf,
    refuseAttachment,
    type AttachmentKind,
  } from '@template/shared/domain/attachment-catalog.util';

  export type AttachmentPickerProps = {
    data: {
      /** Os arquivos já escolhidos, ainda não enviados. */
      files: File[];
      /**
       * De que grupo são os arquivos que o chamado JÁ TEM. A conta do limite soma os dois:
       * quem já mandou dois vídeos não pode escolher um terceiro aqui.
       */
      existingKinds?: AttachmentKind[];
    };
    state?: {
      isDisabled?: boolean;
      /** A recusa da última escolha, em português, vinda do domínio. */
      error?: string | null;
    };
    actions: {
      onChange: (files: File[]) => void;
      onError: (message: string | null) => void;
    };
  };

  /** A linha que resume o que cabe, para a pessoa saber antes de tentar. */
  export function limitsSummary(): string {
    return ATTACHMENT_KINDS.map((kind) => {
      const rule = ATTACHMENT_RULES[kind];

      return `${rule.maxCount} ${rule.label} de até ${megabytesOf(rule.maxBytes)}`;
    }).join(' · ');
  }

  /**
   * Julga os arquivos escolhidos contra o que já existe e o que já foi escolhido.
   *
   * A mesma função que a API usa para recusar (`refuseAttachment`): é o que garante que a tela
   * não aceite algo que o envio vai devolver, nem recuse algo que passaria.
   *
   * Para no PRIMEIRO problema, e não acumula uma lista: quem escolheu cinco arquivos errados
   * conserta um de cada vez, e cinco frases de erro de uma vez não ajudam ninguém.
   */
  export function reviewChoice(
    chosen: readonly File[],
    already: readonly File[],
    existingKinds: readonly AttachmentKind[],
  ): { accepted: File[]; error: string | null } {
    const kinds: AttachmentKind[] = [
      ...existingKinds,
      ...already.map((file) => attachmentKindOf(file.type, file.name)).filter(isKind),
    ];

    const accepted: File[] = [];

    for (const file of chosen) {
      const refusal = refuseAttachment(
        { contentType: file.type, fileName: file.name, sizeBytes: file.size },
        kinds,
      );
      if (refusal) return { accepted, error: refusal.message };

      const kind = attachmentKindOf(file.type, file.name);
      if (kind) kinds.push(kind);
      accepted.push(file);
    }

    return { accepted, error: null };
  }

  function isKind(value: AttachmentKind | null): value is AttachmentKind {
    return value !== null;
  }
</script>

<script lang="ts">
  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import { fileSizeOf } from '$lib/components/attachment-list/attachment-list.svelte';
  import Paperclip from '@lucide/svelte/icons/paperclip';
  import X from '@lucide/svelte/icons/x';

  let { data, state: pickerState, actions }: AttachmentPickerProps = $props();

  /* Puramente visual: o `<input type="file">` não deixa tirar um arquivo da seleção por
     código sem limpar o campo inteiro, então ele é zerado a cada escolha e quem guarda a
     lista é o view-model. */
  let input: HTMLInputElement | undefined = $state();

  const isDisabled = $derived(pickerState?.isDisabled === true);

  function choose(event: Event) {
    const chosen = Array.from((event.currentTarget as HTMLInputElement).files ?? []);
    if (input) input.value = '';
    if (chosen.length === 0) return;

    const review = reviewChoice(chosen, data.files, data.existingKinds ?? []);

    actions.onError(review.error);
    if (review.accepted.length > 0) actions.onChange([...data.files, ...review.accepted]);
  }

  function drop(file: File) {
    actions.onError(null);
    actions.onChange(data.files.filter((chosen) => chosen !== file));
  }
</script>

<!--
  `relative` NÃO É ENFEITE, e foi um defeito de verdade.

  O `<input type="file">` abaixo é `sr-only`, e `sr-only` é `position: absolute`. Sem um
  ancestral posicionado, ele se ancorava no PAINEL DO DIÁLOGO — ou seja, no canto superior
  esquerdo da janela inteira, a centenas de pixels do rótulo que o aciona.

  Quando o seletor de arquivos do sistema fechava, o navegador devolvia o foco ao campo e o
  rolava para dentro da vista. Como ele estava ancorado no painel, quem rolava era o PAINEL:
  o cabeçalho do chamado saía por cima, sobrava um vazio embaixo do rodapé, e não havia como
  desfazer — o painel é `overflow-hidden`, então não existe barra de rolagem para voltar.

  Com `relative` aqui, o campo passa a morar onde o rótulo está. Rolá-lo para dentro da vista
  vira uma operação sem efeito, porque ele já está visível.
-->
<div class="relative flex flex-col gap-2">
  <label
    class="border-input hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm"
    class:pointer-events-none={isDisabled}
    class:opacity-60={isDisabled}
    for="attachments"
  >
    <Paperclip class="text-ink-500 size-4 shrink-0" />
    <span class="text-ink-700">Escolher arquivos</span>
  </label>

  <input
    bind:this={input}
    id="attachments"
    class="sr-only"
    type="file"
    multiple
    accept={attachmentAccept()}
    disabled={isDisabled}
    onchange={choose}
  />

  <p class="text-ink-500 text-xs">{limitsSummary()}</p>

  {#if pickerState?.error}
    <p class="text-destructive text-xs" role="alert">{pickerState.error}</p>
  {/if}

  {#if data.files.length > 0}
    <ul class="divide-y rounded-lg border">
      {#each data.files as file (file.name + file.size)}
        <li class="flex items-center justify-between gap-2 p-2">
          <div class="min-w-0">
            <p class="text-ink-900 truncate text-sm">{file.name}</p>
            <p class="text-ink-500 text-xs">{fileSizeOf(file.size)}</p>
          </div>

          <ActionButton
            data={{ label: 'Tirar' }}
            ui={{ variant: 'ghost', size: 'sm', icon: X, isIconOnly: true }}
            state={{ isDisabled }}
            actions={{ onClick: () => drop(file) }}
          />
        </li>
      {/each}
    </ul>
  {/if}
</div>
