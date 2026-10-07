<script lang="ts">
  import { page } from '$app/state';

  import EmptyState from '$lib/components/acerola-empty-state/acerola-empty-state.svelte';

  const isNotFound = $derived(page.status === 404);
</script>

<!-- Endereço que não existe ou falha inesperada. Quando 404, usa a linguagem de "não há nada aqui";
     quando outro erro, informa que houve uma falha em vez de dizer falsamente que a tela não existe. -->
<div class="mx-auto w-full max-w-lg px-6 py-16">
  <EmptyState
    data={{
      title: isNotFound ? 'Esta tela não existe' : 'Não foi possível carregar a tela',
      description: isNotFound
        ? 'O endereço pode estar errado, ou a tela ainda não foi construída.'
        : (page.error?.message ?? 'Ocorreu um erro inesperado. Tente novamente mais tarde.'),
    }}
  />
</div>
