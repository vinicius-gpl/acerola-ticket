<script lang="ts" module>
  export type AcerolaGithubLinkGateProps = {
    state: {
      isLoading: boolean;
      isConfigured: boolean;
      isConnecting: boolean;
      error: string | null;
    };
    actions: { onConnect: () => void; onRetry: () => void; onLeave: () => void };
  };
</script>

<script lang="ts">
  import GitBranch from '@lucide/svelte/icons/git-branch';
  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  let { state, actions }: AcerolaGithubLinkGateProps = $props();
</script>

<section
  aria-label="Vinculação obrigatória do GitHub"
  class="flex min-h-svh w-full items-center justify-center bg-background p-6"
>
  <div
    class="flex w-full max-w-md flex-col items-center gap-5 rounded-surface border border-border bg-card p-8 text-center shadow-xs"
  >
    <GitBranch class="size-10 text-primary" aria-hidden="true" />
    <h1 class="text-xl font-semibold text-foreground">Vincule seu GitHub para acessar Sistema</h1>
    {#if state.isLoading}
      <p role="status" class="text-sm text-muted-foreground">Verificando sua vinculação…</p>
    {:else}
      <p class="text-sm text-muted-foreground">
        Conecte sua conta para acompanhar os projetos, issues e pull requests. O acesso ao módulo
        será liberado após a autorização.
      </p>
      {#if state.error}
        <p role="alert" class="text-sm text-destructive">{state.error}</p>
      {/if}
      {#if !state.isConfigured && !state.error}
        <p role="status" class="text-sm text-muted-foreground">
          A integração ainda precisa ser configurada pelo administrador.
        </p>
      {/if}
      <ActionButton
        data={{ label: 'Vincular GitHub', loadingLabel: 'Abrindo GitHub…' }}
        ui={{ icon: GitBranch, size: 'lg', className: 'w-full' }}
        state={{ isLoading: state.isConnecting, isDisabled: !state.isConfigured }}
        actions={{ onClick: actions.onConnect }}
      />
      <ActionButton
        data={{ label: 'Verificar novamente' }}
        ui={{ variant: 'secondary', className: 'w-full' }}
        actions={{ onClick: actions.onRetry }}
      />
    {/if}
    <ActionButton
      data={{ label: 'Ir para meu perfil' }}
      ui={{ variant: 'ghost' }}
      actions={{ onClick: actions.onLeave }}
    />
  </div>
</section>
