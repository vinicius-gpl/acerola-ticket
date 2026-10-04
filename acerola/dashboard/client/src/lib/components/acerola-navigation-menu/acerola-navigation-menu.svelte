<script lang="ts" module>
  /**
   * Uma fileira de links de seção (Visão geral · Histórico · Peças) para navegar DENTRO de uma
   * tela. Envolve o `ui/navigation-menu` do shadcn. O menu do sistema inteiro é a barra
   * lateral (`acerola-app-shell`); este aqui é para as abas de uma página.
   *
   * São links de verdade (`href`), e não botões: a pessoa pode abrir numa aba nova e o endereço
   * diz onde ela está. Quem sabe qual é o item atual é a tela, que marca `isActive`.
   */
  export type NavigationMenuEntry = { label: string; href: string; isActive?: boolean };

  export type AcerolaNavigationMenuProps = {
    data: { items: NavigationMenuEntry[] };
    ui: {
      /** O que este menu navega, para quem usa leitor de tela. */
      ariaLabel: string;
      className?: string;
    };
  };
</script>

<script lang="ts">
  import {
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuRoot,
  } from '$lib/components/ui/navigation-menu';
  import { cn } from '$lib/utils/cn';

  let { data, ui }: AcerolaNavigationMenuProps = $props();
</script>

<!-- Menu sem itens não é um menu: nada é desenhado. -->
{#if data.items.length > 0}
  <!-- `viewport={false}`: não há submenu para abrir, então a caixa flutuante do shadcn não entra. -->
  <NavigationMenuRoot aria-label={ui.ariaLabel} viewport={false} class={ui.className}>
    <NavigationMenuList class="flex-wrap gap-1">
      {#each data.items as item (item.href)}
        <NavigationMenuItem>
          <NavigationMenuLink
            href={item.href}
            active={item.isActive}
            aria-current={item.isActive ? 'page' : undefined}
            class={cn(
              'control-md rounded-control flex-row items-center text-sm font-medium',
              item.isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-700 hover:text-ink-900',
            )}
          >
            {item.label}
          </NavigationMenuLink>
        </NavigationMenuItem>
      {/each}
    </NavigationMenuList>
  </NavigationMenuRoot>
{/if}
