<script lang="ts">
  /**
   * Um item do menu — extraído do `AppShell` só porque a animação de "virou ativo" precisa do
   * próprio ciclo de vida do componente (`$effect` por item). Não é peça pública: nada fora de
   * `app-shell.component.svelte` importa isto.
   */
  import { highlightIn, popIn } from '../../motion/motion.util';
  import { SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from '../../vendor/ui/sidebar';
  import type { NavItem } from '../navigation';

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
  <SidebarMenuButton {isActive} tooltip={item.label} size="lg" class="text-base [&_svg]:size-5">
    {#snippet child({ props })}
      <a bind:this={linkEl} href={item.to} {...props}>
        <span bind:this={iconEl} class="contents">
          <Icon aria-hidden="true" />
        </span>
        <span>{item.label}</span>
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
