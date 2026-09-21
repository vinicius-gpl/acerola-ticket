<script lang="ts" module>
  import type { Snippet } from 'svelte';
  import type { NavItem } from '$lib/navigation/navigation';

  /**
   * A casca do sistema: menu à esquerda, conteúdo à direita.
   *
   * A composição segue a documentada pelo shadcn: `SidebarMenu` dentro de `SidebarGroup` ›
   * `SidebarGroupContent`; item ativo pelo `isActive` do próprio componente (é o que põe
   * `data-active` no botão); e o `SidebarTrigger` no CONTEÚDO — dentro da barra ele sumiria
   * junto com o que colapsa, e recolhida não haveria como expandir de volta.
   *
   * A `variant` é `inset`: a página herda a cor da barra, e o conteúdo flutua como um cartão
   * arredondado por cima. A cor vem dos tokens `--sidebar-*` em `lib/theme/tokens.css` — não de
   * `class` empilhada no componente baixado.
   *
   * Os itens vêm de `lib/ui/navigation.ts`. Tela nova no menu é uma linha lá, não aqui.
   */
  export type AppShellProps = {
    children: Snippet;
    data?: {
      /** Contador ao lado do item, pela `key` dele. Zero não desenha selo. */
      badges?: Partial<Record<string, number>>;
      user?: { name: string; email: string; role: string };
    };
    ui?: { items?: readonly NavItem[] };
    state?: { isCollapsed?: boolean; activeKey?: string };
  };
</script>

<script lang="ts">
  import { BrandMark } from '$lib/components/brand-mark/brand-mark';
  import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
  } from '$lib/components/ui/sidebar';
  import { NAV_ITEMS } from '$lib/navigation/navigation';
  import PersonAvatar from '$lib/components/person-avatar/person-avatar.svelte';
  import AppShellNavEntry from '$lib/components/app-shell-nav-entry/app-shell-nav-entry.svelte';

  let { children, data, ui, state }: AppShellProps = $props();

  const items = $derived(ui?.items ?? NAV_ITEMS);
  const userName = $derived(data?.user?.name ?? 'Visitante');
</script>

<SidebarProvider defaultOpen={!state?.isCollapsed}>
  <!-- `collapsible="icon"` e não `offcanvas`: recolhida, a barra vira uma faixa de ícones.
       Sumir por inteiro tiraria da tela a única pista de onde estão as outras telas. -->
  <Sidebar collapsible="icon" variant="inset">
    <SidebarHeader>
      <div class="flex items-center px-2 py-1.5 group-data-[collapsible=icon]:hidden">
        <BrandMark ui={{ size: 'sm' }} />
      </div>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {#each items as item (item.key)}
              <AppShellNavEntry
                {item}
                badge={data?.badges?.[item.key]}
                isActive={state?.activeKey === item.key}
              />
            {/each}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" tooltip={userName}>
            <PersonAvatar name={userName} ui={{ size: 'md' }} />
            <span class="grid flex-1 text-left leading-tight">
              <span class="truncate text-sm font-semibold">{userName}</span>
              <span class="truncate text-[10px] tracking-wider uppercase opacity-70">
                {data?.user?.role ?? '—'}
              </span>
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <!-- Não há botão "Sair": o template não tem login. Quem encerra a sessão é o provedor de
           identidade que fica na frente dele — um botão aqui prometeria um efeito que a
           aplicação não tem como cumprir. -->
    </SidebarFooter>

    <!-- A borda arrastável: recolher também pela lateral, sem procurar o botão. -->
    <SidebarRail />
  </Sidebar>

  <SidebarInset class="border-sidebar-border bg-background border">
    <header class="flex h-12 shrink-0 items-center gap-2 px-4">
      <SidebarTrigger />
    </header>

    <div class="min-w-0 flex-1">
      {@render children()}
    </div>
  </SidebarInset>
</SidebarProvider>
