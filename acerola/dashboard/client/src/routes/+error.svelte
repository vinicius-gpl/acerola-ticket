<script lang="ts">
  import EmptyState from '$lib/components/empty-state/empty-state.svelte';
</script>

<!-- Endereço que não existe. Não é erro do sistema, então não é tela vermelha: é a mesma
     linguagem de "não há nada aqui" usada no resto do sistema. -->
<div class="mx-auto w-full max-w-lg px-6 py-16">
  <EmptyState
    data={{
      title: 'Esta tela não existe',
      description: 'O endereço pode estar errado, ou a tela ainda não foi construída.',
    }}
  />
</div>
