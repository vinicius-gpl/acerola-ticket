<script lang="ts" module>
  import {
    ROLE_CONTEXT_LABELS,
    ROLE_CONTEXTS,
    USER_ROLE_LABELS,
    type ContextRoles,
    type RoleContext,
    type UserRole,
  } from '@template/shared/schemas/user.schema';

  export type AcerolaUserProfileDialogProps = {
    data: {
      user?: {
        name: string;
        email: string;
        role: string;
        roles?: Partial<ContextRoles>;
      };
    };
    state: {
      isOpen: boolean;
    };
    actions: {
      onClose: () => void;
      onViewRoles?: () => void;
      onLogout?: () => void;
    };
  };

  const CONTEXT_DESCRIPTIONS: Record<RoleContext, string> = {
    sistema: 'Acesso à administração da plataforma, configurações e equipe',
    infra: 'Acesso ao inventário de máquinas, equipamentos e agentes',
    manutencao: 'Abertura, acompanhamento e atendimento de ordens de serviço',
  };

  function roleBadgeTone(role: UserRole | string | undefined) {
    if (role === 'admin' || role === 'Administrador') return 'brand';
    if (role === 'manager' || role === 'Gerente') return 'info';
    return 'neutral';
  }
</script>

<script lang="ts">
  import LogOut from '@lucide/svelte/icons/log-out';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import Users from '@lucide/svelte/icons/users';
  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import PersonAvatar from '$lib/components/acerola-person-avatar/acerola-person-avatar.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';

  let { data, state, actions }: AcerolaUserProfileDialogProps = $props();

  const user = $derived(data.user);
  const userName = $derived(user?.name ?? 'Usuário');
  const userEmail = $derived(user?.email ?? '');
  const roles = $derived(user?.roles);

  function getContextRole(ctx: RoleContext): UserRole {
    return (roles?.[ctx] as UserRole) ?? 'user';
  }
</script>

<Dialog open={state.isOpen} onOpenChange={(open) => !open && actions.onClose()}>
  <DialogContent class="max-w-md">
    <DialogHeader class="items-center text-center pb-2">
      <div class="mb-2">
        <PersonAvatar name={userName} ui={{ size: 'md', className: 'size-16 text-lg shadow-sm' }} />
      </div>
      <DialogTitle class="text-xl font-bold">{userName}</DialogTitle>
      <DialogDescription class="text-sm text-muted-foreground">{userEmail}</DialogDescription>
    </DialogHeader>

    <div class="space-y-4">
      <!-- Seus Cargos por Área -->
      <div class="rounded-box border border-border bg-card p-4 space-y-3">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck class="size-4 text-primary" />
          <span>Seus Cargos Internos por Área</span>
        </div>

        <div class="space-y-2.5 divide-y divide-border/60">
          {#each ROLE_CONTEXTS as ctx (ctx)}
            {@const role = getContextRole(ctx)}
            <div class="flex items-center justify-between pt-2 first:pt-0">
              <div class="space-y-0.5">
                <div class="text-xs font-semibold text-foreground">
                  {ROLE_CONTEXT_LABELS[ctx]}
                </div>
                <div class="text-[11px] text-muted-foreground leading-tight">
                  {CONTEXT_DESCRIPTIONS[ctx]}
                </div>
              </div>
              <StatusBadge
                data={{ label: USER_ROLE_LABELS[role] }}
                ui={{ tone: roleBadgeTone(role), size: 'sm' }}
              />
            </div>
          {/each}
        </div>
      </div>

      <!-- Perfis da Equipe -->
      <div class="rounded-box border border-border bg-muted/30 p-4 space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users class="size-4 text-muted-foreground" />
            <span>Perfis e Cargos da Equipe</span>
          </div>
        </div>
        <p class="text-xs text-muted-foreground leading-relaxed">
          Consulte as atribuições de cada membro da organização e os cargos distribuídos por contexto funcional.
        </p>
        {#if actions.onViewRoles}
          <div class="pt-1">
            <ActionButton
              data={{ label: 'Ver cargos da equipe' }}
              ui={{ icon: Users, variant: 'secondary', size: 'sm', className: 'w-full justify-center' }}
              actions={{ onClick: actions.onViewRoles }}
            />
          </div>
        {/if}
      </div>
    </div>

    <DialogFooter class="mt-4 flex flex-row items-center justify-between sm:justify-between">
      {#if actions.onLogout}
        <ActionButton
          data={{ label: 'Sair da conta' }}
          ui={{ icon: LogOut, variant: 'ghost', size: 'sm', className: 'text-destructive hover:text-destructive' }}
          actions={{ onClick: actions.onLogout }}
        />
      {/if}
      <ActionButton
        data={{ label: 'Fechar' }}
        ui={{ variant: 'secondary', size: 'sm' }}
        actions={{ onClick: actions.onClose }}
      />
    </DialogFooter>
  </DialogContent>
</Dialog>
