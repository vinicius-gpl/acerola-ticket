<script lang="ts">
  import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarProvider,
  } from '$lib/components/ui/sidebar';
  import type { NavItem } from '$lib/navigation/navigation';
  import AppShellNavEntry from './app-shell-nav-entry.svelte';

  /**
   * O item de menu não se sustenta sozinho: `SidebarMenuItem` e `SidebarMenuButton` leem o
   * contexto do `SidebarProvider` para saber se a barra está recolhida. Este apoio monta a
   * mesma composição que o `AppShell` monta, e nada além disso.
   */
  let { item, badge, isActive }: { item: NavItem; badge?: number; isActive?: boolean } = $props();
</script>

<SidebarProvider>
  <Sidebar>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <AppShellNavEntry {item} {badge} isActive={isActive ?? false} />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
</SidebarProvider>
