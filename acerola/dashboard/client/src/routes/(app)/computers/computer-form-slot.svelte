<script lang="ts" module>
  import { type Computer } from '@template/shared/schemas/computer.schema';

  import { type CreatedAgentToken } from '$lib/hooks/use-computer-form/use-computer-form.svelte';

  /**
   * A ponte entre a tela e o formulário de máquina.
   *
   * Existe como componente separado, e dentro de `routes/`, por dois motivos: o view-model do
   * formulário precisa nascer junto com o diálogo (e morrer com ele), e componente de
   * `lib/components` não pode buscar o próprio dado — é a regra que o ESLint cobra ali.
   *
   * `onSaved` recebe o token quando foi um CADASTRO: é a única vez que ele existe legível, e
   * quem abriu o formulário precisa mostrá-lo antes que a resposta se perca.
   */
  export type ComputerFormSlotProps = {
    computer: Computer | null;
    onSaved: (created: CreatedAgentToken | null) => void;
    onClose: () => void;
  };
</script>

<script lang="ts">
  import ComputerFormDialog from '$lib/components/computer-form-dialog/computer-form-dialog.svelte';
  import { useComputerFormModel } from '$lib/hooks/use-computer-form/use-computer-form.svelte';

  let { computer, onSaved, onClose }: ComputerFormSlotProps = $props();

  /* O compilador avisa que isto lê as props uma vez só — e é exatamente o que se quer. O
     formulário fotografa a máquina na montagem e não acompanha mudanças dela: quem troca de
     máquina é o `{#key}` da rota, que monta este componente de novo. Acompanhar apagaria o
     que a pessoa está digitando quando a lista recarregasse por trás. */
  // svelte-ignore state_referenced_locally
  const form = useComputerFormModel({ computer, onSaved });
</script>

<ComputerFormDialog
  data={form.data}
  state={{ ...form.state, isOpen: true }}
  actions={{
    ...form.actions,
    onClose: () => (form.state.isSubmitting ? undefined : onClose()),
  }}
/>
