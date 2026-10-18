<script lang="ts" module>
  /**
   * O diálogo de vínculo do WhatsApp, em dois passos.
   *
   *  1. RISCOS. Vincular o número pessoal a uma automação tem consequência de verdade (o
   *     WhatsApp pode banir o número). O botão de confirmar fica travado por alguns segundos:
   *     é o tempo de ler, e não de clicar por reflexo.
   *  2. QR CODE. A pessoa lê o código com o celular; quando o vínculo fecha, quem fecha o
   *     diálogo é a tela.
   *
   * A contagem e a imagem do QR code vêm prontas por props: aqui não há relógio nem geração de
   * imagem.
   */
  export type AcerolaWhatsappLinkDialogProps = {
    data: {
      /** A imagem do QR code (data URL). Nula enquanto o código não chegou. */
      qrImage: string | null;
    };
    state: {
      step: 'closed' | 'risks' | 'qr';
      /** Quantos segundos faltam para o botão de confirmar destravar. */
      secondsLeft: number;
      isLinking?: boolean;
      error?: string | null;
    };
    actions: { onConfirm: () => void; onClose: () => void };
  };

  export const WHATSAPP_LINK_RISKS = [
    'O WhatsApp pode banir números que usam automação. O risco é do seu número, e o sistema não tem como desfazer um banimento.',
    'O sistema passa a enviar mensagens de chamados em seu nome, pelo seu número.',
    'A conexão dá ao sistema acesso às mensagens que chegam no seu número. Ele usa só as que tratam de chamados e não guarda as demais.',
    'Você pode desvincular quando quiser: aqui no perfil, ou no celular, em Aparelhos conectados.',
  ] as const;
</script>

<script lang="ts">
  import DialogContent from '$lib/components/acerola-responsive-dialog-content/acerola-responsive-dialog-content.svelte';
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import QrCode from '@lucide/svelte/icons/qr-code';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/acerola-dialog/acerola-dialog';

  let { data, state, actions }: AcerolaWhatsappLinkDialogProps = $props();

  const isWaiting = $derived(state.secondsLeft > 0);
  const confirmLabel = $derived(
    isWaiting ? `Leia os riscos (${state.secondsLeft}s)` : 'Entendi os riscos, vincular',
  );
</script>

<Dialog
  open={state.step !== 'closed'}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent showCloseButton={false}>
    {#if state.step === 'qr'}
      <DialogHeader class="gap-1.5">
        <div class="flex items-center gap-2.5">
          <span
            class="bg-primary/10 text-primary rounded-chip flex size-7 shrink-0 items-center justify-center"
          >
            <QrCode class="size-4" aria-hidden="true" />
          </span>
          <DialogTitle class="text-lg font-semibold tracking-tight">Leia o QR code</DialogTitle>
        </div>
        <DialogDescription class="text-muted-foreground text-xs">
          No celular, abra o WhatsApp, entre em Aparelhos conectados, toque em Conectar um aparelho
          e aponte a câmera para o código.
        </DialogDescription>
      </DialogHeader>

      <div class="flex min-h-72 items-center justify-center">
        {#if data.qrImage}
          <!-- Fundo branco fixo, nos dois temas: QR code em fundo escuro não é lido pela câmera. -->
          <img
            src={data.qrImage}
            alt="QR code para vincular o WhatsApp"
            class="rounded-box size-64 bg-white p-2"
          />
        {:else}
          <p class="text-muted-foreground text-sm" role="status">Gerando o QR code…</p>
        {/if}
      </div>

      <p class="text-muted-foreground text-xs">
        O código troca sozinho a cada poucos segundos. Esta janela fecha quando o vínculo for
        concluído.
      </p>

      <DialogFooter>
        <ActionButton
          data={{ label: 'Fechar' }}
          ui={{ variant: 'secondary' }}
          actions={{ onClick: actions.onClose }}
        />
      </DialogFooter>
    {:else}
      <DialogHeader class="gap-1.5">
        <div class="flex items-center gap-2.5">
          <span
            class="bg-destructive/10 text-destructive rounded-chip flex size-7 shrink-0 items-center justify-center"
          >
            <AlertTriangle class="size-4" aria-hidden="true" />
          </span>
          <DialogTitle class="text-lg font-semibold tracking-tight">
            Antes de vincular seu WhatsApp
          </DialogTitle>
        </div>
        <DialogDescription class="text-muted-foreground text-xs">
          Leia com atenção. O botão de confirmar libera em alguns segundos.
        </DialogDescription>
      </DialogHeader>

      <ul class="text-foreground flex list-disc flex-col gap-2 pl-5 text-sm">
        {#each WHATSAPP_LINK_RISKS as risk (risk)}
          <li>{risk}</li>
        {/each}
      </ul>

      {#if state.error}
        <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
      {/if}

      <DialogFooter>
        <ActionButton
          data={{ label: 'Cancelar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: state.isLinking }}
          actions={{ onClick: actions.onClose }}
        />
        <ActionButton
          data={{ label: confirmLabel, loadingLabel: 'Vinculando…' }}
          state={{ isLoading: state.isLinking, isDisabled: isWaiting }}
          actions={{ onClick: actions.onConfirm }}
        />
      </DialogFooter>
    {/if}
  </DialogContent>
</Dialog>
