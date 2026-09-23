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
  export type ComputerTokenDialogProps = {
    data: { computerName: string; token: string };
    state?: { isOpen?: boolean };
    actions: { onClose: () => void };
  };
</script>

<script lang="ts">
  import Copy from '@lucide/svelte/icons/copy';
  import Check from '@lucide/svelte/icons/check';

  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import ActionButton from '$lib/components/action-button/action-button.svelte';

  /* O prop precisa de outro nome aqui dentro: um binding local chamado `state` faz o
     compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let { data, state: dialogState, actions }: ComputerTokenDialogProps = $props();

  /* Estado puramente visual — mostrar "Copiado" por um instante. Não é dado de domínio, e
     por isso pode morar dentro do componente (CONTRIBUTING §3). */
  let hasCopied = $state(false);

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
</script>

<Dialog
  open={dialogState?.isOpen ?? true}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Token de {data.computerName}</DialogTitle>
      <DialogDescription>
        Guarde agora: por segurança, este código não pode ser mostrado de novo. Se perder, gere
        outro pela ficha da máquina.
      </DialogDescription>
    </DialogHeader>

    <p
      class="bg-muted text-ink-900 rounded-lg px-3 py-3 font-mono text-sm break-all select-all"
      data-testid="agent-token"
    >
      {data.token}
    </p>

    <p class="text-ink-500 text-sm">
      Instale o agente no computador e informe este código quando ele pedir. A partir daí a
      máquina aparece sozinha aqui, com a ficha completa.
    </p>

    <DialogFooter>
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
