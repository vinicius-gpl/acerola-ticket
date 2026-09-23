<script lang="ts">
  /**
   * Um item do menu — extraído do `AppShell` só porque a animação de "virou ativo" precisa do
   * próprio ciclo de vida do componente (`$effect` por item). Não é peça pública: nada fora de
   * `app-shell.component.svelte` importa isto.
   */
  import { highlightIn, popIn } from '$lib/motion/motion';
  import { SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from '$lib/components/ui/sidebar';
  import type { NavItem } from '$lib/navigation/navigation';

  let { item, badge, isActive }: { item: NavItem; badge: number | undefined; isActive: boolean } =
    $props();

  const Icon = $derived(item.icon);

  /* `Icon` (bits-ui/lucide) não expõe `ref`; um `<span>` em volta dá ao GSAP um elemento de
     verdade pra animar. */
  let iconEl: HTMLSpanElement | undefined = $state();
  let linkEl: HTMLAnchorElement | undefined = $state();

  /* Ícone pulsa, fundo nasce com fade — só na TROCA para ativo. A dependência é `isActive`
     lido aqui dentro: o efeito só reage quando ele muda, nunca em re-render à toa. */
  $effect(() => {
    if (!isActive) return;

    popIn(iconEl ?? null);
    highlightIn(linkEl ?? null);
  });
</script>

<SidebarMenuItem>
  <!-- `tooltip` é o que salva a barra recolhida: o ícone sozinho nem sempre diz o que é. O
       componente só o mostra quando está em modo ícone. -->
  <!-- Recolhida, o botão vira um quadrado de 32px e o ícone tem 20: com o padding de 8 que
       vem do componente, ele não cabe e é cortado, parecendo empurrado para a esquerda.
       `p-0` devolve o espaço e `justify-center` o põe no meio do quadrado. -->
  <!-- O tamanho da fonte vai como `text-[1rem]`, e NÃO como `text-base`: a paleta declara um
       token de cor chamado `base` (`--color-base` em `tokens.css`), então o Tailwind lê
       `text-base` como COR, não como tamanho. O resultado era o menu inteiro pintado de
       #eff1f5 — quase branco sobre a barra clara, ou seja, invisível. -->
  <SidebarMenuButton
    {isActive}
    tooltip={item.label}
    size="lg"
    class="text-[1rem] [&_svg]:size-5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
  >
    {#snippet child({ props })}
      <a bind:this={linkEl} href={item.to} {...props}>
        <span bind:this={iconEl} class="contents">
          <Icon aria-hidden="true" />
        </span>
        <!-- Recolhida, a barra é só ícone: o rótulo SOME, não encolhe. Sem isto ele fica
             truncado em "T…" dentro dos 32px do botão, espremendo o ícone junto — a barra
             perde a leitura de relance e não ganha espaço nenhum. Quem diz o nome ali é o
             `tooltip` do SidebarMenuButton, logo acima. -->
        <span class="group-data-[collapsible=icon]:hidden">{item.label}</span>
      </a>
    {/snippet}
  </SidebarMenuButton>

  <!-- Zero não vira selo: um "0" ao lado de cada item é ruído. O `SidebarMenuBadge` some
       sozinho quando a barra está recolhida. -->
  {#if badge}
    <SidebarMenuBadge
      class="bg-gradient-to-r from-rose-500 to-red-600 font-bold text-white shadow-lg shadow-rose-500/40"
    >
      {badge}
    </SidebarMenuBadge>
  {/if}
</SidebarMenuItem>
