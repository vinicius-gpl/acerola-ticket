<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import type { AreaContext } from '$lib/hooks/use-area-context/use-area-context.svelte';
  import type { NavItem } from '$lib/navigation/navigation';
  import type { ContextRoles } from '@template/shared/schemas/user.schema';

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
  export type AcerolaAppShellProps = {
    children: Snippet;
    data?: {
      /** Contador ao lado do item, pela `key` dele. Zero não desenha selo. */
      badges?: Partial<Record<string, number>>;
      user?: {
        name: string;
        email: string;
        role: string;
        roles?: ContextRoles;
      };
      /**
       * O seletor de contexto (#13) — os contextos que a pessoa atende. Vazio (o padrão)
       * esconde o controle: é o caso de quem só tem uma área, ou nenhuma.
       */
      areaOptions?: { value: AreaContext; label: string; icon?: LucideIcon }[];
    };
    ui?: { items?: readonly NavItem[] };
    state?: {
      isCollapsed?: boolean;
      activeKey?: string;
      /** O caminho da rota atual — trocar de valor é o gatilho da animação entre telas. */
      routeKey?: string;
      isProfileOpen?: boolean;
      areaContext?: AreaContext;
    };
    actions?: {
      onLogout?: () => void;
      onOpenProfile?: () => void;
      onCloseProfile?: () => void;
      onViewRoles?: () => void;
      onAreaContextChange?: (context: AreaContext) => void;
    };
  };
</script>

<script lang="ts">
  import LogOut from '@lucide/svelte/icons/log-out';
  import { BrandMark } from '$lib/components/acerola-brand-mark/acerola-brand-mark';
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
  import PersonAvatar from '$lib/components/acerola-person-avatar/acerola-person-avatar.svelte';
  import AppShellNavEntry from '$lib/components/acerola-app-shell-nav-entry/acerola-app-shell-nav-entry.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import SelectField from '$lib/components/acerola-select-field/acerola-select-field.svelte';
  import EffectsToggle from '$lib/components/acerola-effects-toggle/acerola-effects-toggle.svelte';
  import ThemeToggle from '$lib/components/acerola-theme-toggle/acerola-theme-toggle.svelte';

  /* `state` (o prop) precisa de outro nome aqui dentro: um binding local chamado `state` faz
     o compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune — o
     mesmo problema, e a mesma solução, do `ColumnChart`. */
  let { children, data, ui, state: shellState, actions }: AcerolaAppShellProps = $props();

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

<SidebarProvider open={!shellState?.isCollapsed}>
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
          <!-- `gap-1`: o item marcado e o item sob o cursor ganham fundo, e sem folga entre
               eles os fundos encostam e viram um bloco só — o menu perde a leitura de quantos
               itens são. O componente baixado vem com `gap-0`, e `lib/components/ui/` não se
               edita (CONTRIBUTING §5): a folga entra por aqui, e o `cn` resolve a disputa em
               favor desta. -->
          <SidebarMenu class="gap-1">
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

      <!-- Efeitos visuais completos ou leves: o sistema escolhe sozinho pela máquina, e aqui a
           pessoa pode mandar. Mesma linha discreta do tema, pelo mesmo motivo. -->
      <div
        class="text-sidebar-foreground/70 flex items-center justify-between px-2 py-1 group-data-[collapsible=icon]:justify-center"
      >
        <span class="text-xs font-medium group-data-[collapsible=icon]:hidden">Efeitos</span>
        <EffectsToggle />
      </div>

      <!-- A mesma folga do menu de cima: aqui são o cartão de quem entrou e o Sair. -->
      <SidebarMenu class="gap-1">
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            tooltipContent={userName}
            onclick={actions?.onOpenProfile}
            aria-label="Abrir perfil do usuário"
          >
            <PersonAvatar name={userName} ui={{ size: 'md' }} />
            <span class="grid flex-1 text-left leading-tight">
              <span class="truncate text-sm font-semibold">{userName}</span>
              <span class="truncate text-xs tracking-wider uppercase opacity-70">
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

  <!-- `min-w-0`: sem isto a área de conteúdo não encolhe abaixo da largura natural da tabela,
       e quem rola para o lado é a PÁGINA inteira, em vez da tabela dentro da caixa dela. -->
  <SidebarInset class="border-sidebar-border bg-background border min-w-0">
    <!-- `min-h` e `flex-wrap`, e não altura fixa: no celular as pastilhas de contexto quebram
         para a linha de baixo em vez de vazar pela lateral. -->
    <header class="flex min-h-12 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1">
      <SidebarTrigger />

      <!-- Seletor de contexto (#13): só aparece para quem atende mais de uma área — ver
           `areaOptions` em `use-app-shell`. Fica no cabeçalho, e não no menu lateral, porque
           é sobre O QUE a pessoa está vendo agora, não sobre PARA ONDE ela pode ir.

           São PASTILHAS, coladas no botão do menu, e não uma lista suspensa no canto oposto:
           o contexto muda o MENU e tudo o que a tela mostra, então a pessoa precisa VER em
           qual está sem abrir nada — e trocar com um clique. -->
      {#if data?.areaOptions && data.areaOptions.length > 0}
        <!-- DOIS DESENHOS do mesmo controle, um por largura. Com espaço (`lg` em diante), as
             pastilhas: o contexto fica à vista e troca com um clique. No tablet e no celular,
             três pastilhas não cabem ao lado do botão do menu e quebravam em duas linhas —
             ali ele vira uma lista suspensa, que ocupa o lugar de um botão só e ainda mostra a
             área atual. Só um dos dois aparece por vez; quem esconde é o CSS. -->
        <OptionPicker
          data={{ value: shellState?.areaContext ?? 'infra', options: data.areaOptions }}
          ui={{ ariaLabel: 'Área que você está vendo', className: 'hidden lg:inline-flex' }}
          actions={{
            onChange: (value: string) => actions?.onAreaContextChange?.(value as never),
          }}
        />
        <SelectField
          data={{ value: shellState?.areaContext ?? 'infra', options: data.areaOptions }}
          ui={{ ariaLabel: 'Área que você está vendo', className: 'w-auto min-w-[150px] lg:hidden' }}
          actions={{
            onChange: (value: string) => actions?.onAreaContextChange?.(value as never),
          }}
        />
      {/if}
    </header>

    <!-- A MARGEM DO CONTEÚDO É DA CASCA, e não de cada tela: quando cada tela definia a sua,
         uma esquecia o respiro de cima, outra usava uma medida diferente, e trocar de tela (ou
         de contexto) fazia o conteúdo "pular" de lugar. A tela decide só a largura máxima. -->
    <div bind:this={contentEl} class="min-w-0 flex-1 px-4 pt-4 pb-10 sm:px-6">
      {@render children()}
    </div>
  </SidebarInset>
</SidebarProvider>
