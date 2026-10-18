<script lang="ts" module>
  /**
   * O TOKEN DO AGENTE, mostrado uma única vez.
   *
   * Esta tela existe porque o token não pode ser pedido de novo: o banco guarda só o hash
   * dele, como senha. Se a pessoa fechar sem copiar, o caminho é gerar outro — e é isso que
   * o texto diz, em vez de deixá-la procurar um botão de "ver token" que nunca vai existir.
   *
   * Função pura de props: ela recebe o token e avisa quando foi fechada. Não busca nada, não
   * guarda nada e não copia sozinha.
   */
  export type AcerolaComputerTokenDialogProps = {
    data: { computerName: string; token: string };
    state?: { isOpen?: boolean };
    actions: {
      onClose: () => void;
      onDownloadScript?: () => void;
    };
  };
</script>

<script lang="ts">
  import DialogContent from '$lib/components/acerola-responsive-dialog-content/acerola-responsive-dialog-content.svelte';
  import Copy from '@lucide/svelte/icons/copy';
  import Check from '@lucide/svelte/icons/check';
  import Download from '@lucide/svelte/icons/download';

  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/acerola-dialog/acerola-dialog';
  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import { downloadAgentInstallerScript } from '$lib/utils/agent-installer-script.util';

  import KeyRound from '@lucide/svelte/icons/key-round';

  /* O prop precisa de outro nome aqui dentro: um binding local chamado `state` faz o
     compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let { data, state: dialogState, actions }: AcerolaComputerTokenDialogProps = $props();

  /* Estado puramente visual — mostrar "Copiado" por um instante. Não é dado de domínio, e
     por isso pode morar dentro do componente (CONTRIBUTING §3). */
  let hasCopied = $state(false);
  let hasCopiedCommand = $state(false);

  async function copyToken(): Promise<void> {
    /* Navegador sem área de transferência (ou sem permissão) não pode quebrar a tela: o
       token continua escrito na frente da pessoa, que seleciona e copia à mão. */
    try {
      await navigator.clipboard.writeText(data.token);
      hasCopied = true;
    } catch {
      hasCopied = false;
    }
  }

  async function copyCommand(): Promise<void> {
    try {
      await navigator.clipboard.writeText(`.\\install-agent.ps1 -Token '${data.token}'`);
      hasCopiedCommand = true;
    } catch {
      hasCopiedCommand = false;
    }
  }

  function downloadScript(): void {
    if (actions.onDownloadScript) {
      actions.onDownloadScript();
      return;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const safeName = data.computerName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    downloadAgentInstallerScript({
      serverUrl: origin,
      token: data.token,
      fileName: `instalar-${safeName || 'agente'}.ps1`,
    });
  }
</script>

<Dialog
  open={dialogState?.isOpen ?? true}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent>
    <DialogHeader class="gap-1.5">
      <div class="flex items-center gap-2.5">
        <span class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-primary/10 text-primary">
          <KeyRound class="size-4" aria-hidden="true" />
        </span>
        <DialogTitle class="text-lg font-semibold tracking-tight">Token de {data.computerName}</DialogTitle>
      </div>
      <DialogDescription class="text-xs text-muted-foreground">
        Guarde agora: por segurança, este código não pode ser mostrado de novo. Se perder, gere
        outro pela ficha da máquina.
      </DialogDescription>
    </DialogHeader>

    <div
      class="rounded-box border border-border/80 bg-foreground p-4 font-mono text-xs text-background break-all select-all flex items-center justify-between gap-3"
      data-testid="agent-token"
    >
      <span class="tracking-wider">{data.token}</span>
    </div>

    <div class="rounded-box border border-border bg-muted/40 p-3 text-xs text-muted-foreground flex flex-col gap-2">
      <div class="flex items-center justify-between gap-2">
        <span class="font-medium text-foreground">Comando no PowerShell:</span>
        <button
          type="button"
          class="text-primary hover:underline text-xs flex items-center gap-1 cursor-pointer font-medium"
          onclick={() => void copyCommand()}
        >
          {hasCopiedCommand ? 'Copiado!' : 'Copiar comando'}
        </button>
      </div>
      <code class="font-mono text-xs break-all select-all text-foreground bg-background p-2 rounded-box border border-border">
        .\install-agent.ps1 -Token '{data.token}'
      </code>
    </div>

    <p class="text-ink-500 text-sm">
      Instale o agente no computador com o instalador e o script acima. A máquina conectará
      automaticamente e aparecerá aqui com a ficha completa.
    </p>

    <DialogFooter class="flex flex-col sm:flex-row gap-2">
      <ActionButton
        data={{ label: 'Baixar script desta máquina' }}
        ui={{ variant: 'secondary', icon: Download }}
        actions={{ onClick: () => downloadScript() }}
      />
      <ActionButton
        data={{ label: hasCopied ? 'Copiado' : 'Copiar código' }}
        ui={{ variant: 'secondary', icon: hasCopied ? Check : Copy }}
        actions={{ onClick: () => void copyToken() }}
      />
      <ActionButton
        data={{ label: 'Já guardei' }}
        ui={{ className: 'sm:w-auto' }}
        actions={{ onClick: actions.onClose }}
      />
    </DialogFooter>
  </DialogContent>
</Dialog>
