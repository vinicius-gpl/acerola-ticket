<script lang="ts">
  import ComputerListView from '$lib/components/computer-list-view/computer-list-view.svelte';
  import ComputerTokenDialog from '$lib/components/computer-token-dialog/computer-token-dialog.svelte';
  import { type CreatedAgentToken } from '$lib/hooks/use-computer-form/use-computer-form.svelte';
  import { useComputerListModel } from '$lib/hooks/use-computer-list/use-computer-list.svelte';
  import ComputerFormSlot from './computer-form-slot.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * O que mora aqui não é dado, é QUAL PEÇA DA TELA ESTÁ NA FRENTE: o formulário de cadastro
   * e, logo depois dele, o token recém-gerado — que precisa sobreviver ao fechamento do
   * formulário, porque é a única vez que ele existe legível.
   */
  const list = useComputerListModel();

  let isRegistering = $state(false);
  let created = $state<CreatedAgentToken | null>(null);
</script>

<svelte:head>
  <title>Inventário</title>
</svelte:head>

<ComputerListView
  data={list.data}
  state={list.state}
  actions={{ ...list.actions, onRegister: () => (isRegistering = true) }}
/>

{#if isRegistering}
  <ComputerFormSlot
    computer={null}
    onSaved={(saved) => {
      created = saved;
      isRegistering = false;
    }}
    onClose={() => (isRegistering = false)}
  />
{/if}

<!-- O token aparece depois que o formulário some, e só até a pessoa dizer que guardou. -->
{#if created}
  <ComputerTokenDialog
    data={{ computerName: created.computerName, token: created.token }}
    actions={{ onClose: () => (created = null) }}
  />
{/if}
