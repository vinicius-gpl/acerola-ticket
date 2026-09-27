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
    state?: {
      isCollapsed?: boolean;
      activeKey?: string;
      /** O caminho da rota atual — trocar de valor é o gatilho da animação entre telas. */
      routeKey?: string;
    };
    actions?: { onLogout?: () => void };
  };
</script>

<script lang="ts">
  import LogOut from '@lucide/svelte/icons/log-out';
  import { BrandMark } from '$lib/components/brand-mark/brand-mark';
  import { fadeInUp } from '$lib/motion/motion';
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
  import ThemeToggle from '$lib/components/theme-toggle/theme-toggle.svelte';

  /* `state` (o prop) precisa de outro nome aqui dentro: um binding local chamado `state` faz
     o compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune — o
     mesmo problema, e a mesma solução, do `ColumnChart`. */
  let { children, data, ui, state: shellState, actions }: AppShellProps = $props();

  const items = $derived(ui?.items ?? NAV_ITEMS);
  const userName = $derived(data?.user?.name ?? 'Visitante');

  let contentEl: HTMLDivElement | undefined = $state();

  /* A troca de tela nasce com um fade sutil — sem isso, uma rota substitui a outra num corte
     seco, e o sistema inteiro parece uma sucessão de telas desconectadas em vez de um só
     lugar. `routeKey` é o caminho da rota: só ele muda a cada navegação, então é nele que o
     efeito escuta — reagir ao conteúdo (`children`) reanimaria a cada re-render à toa. */
  $effect(() => {
    void shellState?.routeKey;
    fadeInUp(contentEl ?? null);
  });
</script>

<SidebarProvider defaultOpen={!shellState?.isCollapsed}>
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
                isActive={shellState?.activeKey === item.key}
              />
            {/each}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <!-- Acima do perfil, de propósito: é a última coisa que a pessoa mexe antes de sair,
           não uma ação do dia a dia — não compete por atenção com o menu de navegação. -->
      <div
        class="text-sidebar-foreground/70 flex items-center justify-between px-2 py-1 group-data-[collapsible=icon]:justify-center"
      >
        <span class="text-xs font-medium group-data-[collapsible=icon]:hidden">Tema</span>
        <ThemeToggle />
      </div>

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
        <SidebarMenuItem>
          <!-- Sem `tooltip=`: nesse componente baixado, o `props` do gatilho do tooltip é
               espalhado DEPOIS do `onclick` que passamos e o sobrescreve (bug do vendor, não
               editamos `lib/components/ui/`). O rótulo continua visível, só some junto com o
               resto quando a barra recolhe para ícones. -->
          <SidebarMenuButton onclick={actions?.onLogout}>
            <LogOut />
            <span>Sair</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>

    <!-- A borda arrastável: recolher também pela lateral, sem procurar o botão. -->
    <SidebarRail />
  </Sidebar>

  <SidebarInset class="border-sidebar-border bg-background border">
    <header class="flex h-12 shrink-0 items-center gap-2 px-4">
      <SidebarTrigger />
    </header>

    <div bind:this={contentEl} class="min-w-0 flex-1">
      {@render children()}
    </div>
  </SidebarInset>
</SidebarProvider>
