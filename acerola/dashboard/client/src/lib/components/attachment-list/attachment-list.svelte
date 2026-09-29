<script lang="ts" module>
  import { ATTACHMENT_RULES } from '@template/shared/domain/attachment-catalog.util';
  import { canRemoveAttachment } from '@template/shared/domain/attachment-ownership.util';
  import {
    type AttachmentOrigin,
    type TicketAttachment,
  } from '@template/shared/schemas/ticket-attachment.schema';

  /* O rótulo é texto de tela (português); a chave é do contrato (inglês). */
  const ORIGIN_LABELS: Record<AttachmentOrigin, string> = {
    requester: 'enviado por quem abriu',
    support: 'anexado pelo TI',
  };

  export type AttachmentListProps = {
    data: {
      attachments: TicketAttachment[];
    };
    ui?: {
      /** O texto quando não há nenhum arquivo. Cada tela diz isso do jeito dela. */
      emptyLabel?: string;
      /**
       * DE QUE LADO está quem olha a lista — e, portanto, o que ele pode apagar.
       *
       * Cada lado mexe só no que é dele: o TI vê e baixa o que a pessoa mandou, e não apaga.
       * Sem isso, o botão de excluir apareceria em cima da prova de quem pediu socorro (ver
       * `attachment-ownership.util`).
       *
       * @default 'support'
       */
      actor?: AttachmentOrigin;
    };
    state?: {
      isLoading?: boolean;
      /** Qual está sendo excluído agora — trava só a linha dele, não a lista inteira. */
      removingId?: number | null;
      error?: string | null;
    };
    actions?: {
      /** Ausente quando quem está olhando não pode excluir — é assim na consulta pública. */
      onRemove?: (attachment: TicketAttachment) => void;
    };
  };

  /** O tamanho em palavras. Arquivo é coisa de MB: byte cru não diz nada a ninguém. */
  export function fileSizeOf(bytes: number): string {
    const megabytes = bytes / (1024 * 1024);
    if (megabytes >= 1) return `${megabytes.toFixed(1).replace('.', ',')} MB`;

    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
</script>

<script lang="ts">
  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import Download from '@lucide/svelte/icons/download';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  let { data, ui, state: viewState, actions }: AttachmentListProps = $props();

  const actor = $derived(ui?.actor ?? 'support');

  /**
   * O botão de excluir aparece POR ARQUIVO, e não pela lista inteira.
   *
   * Duas condições, e as duas precisam valer: a tela tem que oferecer a exclusão (na consulta
   * pública ela não oferece), e o arquivo tem que ser do lado de quem está olhando. A mesma
   * régua que a API usa para recusar — esconder o botão é conveniência, a recusa do servidor
   * é a que vale.
   */
  const canRemove = $derived(
    (attachment: TicketAttachment) =>
      actions?.onRemove !== undefined && canRemoveAttachment(attachment.origin, actor),
  );
</script>

{#if viewState?.error}
  <ErrorState data={{ title: 'Não consegui excluir o anexo', message: viewState.error }} />
{/if}

{#if viewState?.isLoading}
  <p class="text-ink-500 text-sm">Carregando os anexos…</p>
{:else if data.attachments.length === 0}
  <p class="text-ink-500 text-sm">{ui?.emptyLabel ?? 'Nenhum arquivo anexado.'}</p>
{:else}
  <ul class="divide-y rounded-box border">
    {#each data.attachments as attachment (attachment.id)}
      <li class="flex flex-wrap items-center justify-between gap-2 p-2.5">
        <div class="min-w-0 flex-1">
          <p class="text-ink-900 truncate text-sm">{attachment.fileName}</p>
          <!-- De quem é o arquivo vai ESCRITO na linha. Sem isso, a única pista de por que uns
               têm botão de excluir e outros não seria a ausência do botão — e ausência não
               explica nada a quem está olhando. -->
          <p class="text-ink-500 text-xs">
            {ATTACHMENT_RULES[attachment.kind].label} · {fileSizeOf(attachment.sizeBytes)} ·
            {ORIGIN_LABELS[attachment.origin]}
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-1">
          <!--
            Dois caminhos para o mesmo arquivo, de propósito: ABRIR mostra na tela (quem está
            atendendo quer olhar a foto sem encher a pasta de downloads) e BAIXAR entrega o
            arquivo com o nome original (quem vai anexar a nota num processo precisa dele).
            `rel="noreferrer"` porque o endereço assinado não deve viajar como referência.
          -->
          <a
            class="text-ink-700 hover:bg-muted inline-flex items-center gap-1 rounded-chip px-2 py-1 text-xs"
            href={attachment.viewUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink class="size-3.5" />
            Abrir
          </a>

          <a
            class="text-ink-700 hover:bg-muted inline-flex items-center gap-1 rounded-chip px-2 py-1 text-xs"
            href={attachment.downloadUrl}
            download={attachment.fileName}
            rel="noopener noreferrer"
          >
            <Download class="size-3.5" />
            Baixar
          </a>

          {#if canRemove(attachment)}
            <ActionButton
              data={{ label: 'Excluir' }}
              ui={{ variant: 'ghost', size: 'sm', icon: Trash2, isIconOnly: true }}
              state={{ isLoading: viewState?.removingId === attachment.id }}
              actions={{ onClick: () => actions?.onRemove?.(attachment) }}
            />
          {/if}
        </div>
      </li>
    {/each}
  </ul>
{/if}
