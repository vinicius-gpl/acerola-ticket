<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import BarChart3 from '@lucide/svelte/icons/chart-column';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import Settings from '@lucide/svelte/icons/settings';

  import AppShell from './app-shell.component.svelte';

  const manyItems = [
    { key: 'tasks', label: 'Tarefas', to: '/tasks', icon: ListChecks },
    { key: 'reports', label: 'Relatórios', to: '/reports', icon: BarChart3 },
    { key: 'settings', label: 'Configurações', to: '/settings', icon: Settings },
  ];

  const user = { name: 'Ana Souza', email: 'ana@empresa.com.br', role: 'Administrador' };

  const { Story } = defineMeta({
    title: 'Composers/AppShell',
    component: AppShell,
    parameters: { layout: 'fullscreen' },
  });
</script>

<Story name="Default">
  <AppShell data={{ user }} state={{ activeKey: 'tasks' }}>
    <div class="text-ink-700 p-8 text-sm">Conteúdo da rota entra aqui.</div>
  </AppShell>
</Story>

<!-- Vários itens, com contador. Os contadores vêm prontos por `data` — a casca não busca nada. -->
<Story name="WithBadges">
  <AppShell
    ui={{ items: manyItems }}
    data={{ user, badges: { tasks: 3, reports: 12 } }}
    state={{ activeKey: 'tasks' }}
  >
    <div class="text-ink-700 p-8 text-sm">Conteúdo da rota entra aqui.</div>
  </AppShell>
</Story>

<!-- Recolhida: os rótulos saem e sobra tela para o conteúdo. -->
<Story name="Collapsed">
  <AppShell
    ui={{ items: manyItems }}
    data={{ user, badges: { tasks: 3, reports: 12 } }}
    state={{ isCollapsed: true, activeKey: 'tasks' }}
  >
    <div class="text-ink-700 p-8 text-sm">Conteúdo da rota entra aqui.</div>
  </AppShell>
</Story>

<!-- Sem identidade: o rodapé não quebra. -->
<Story name="WithoutUser">
  <AppShell>
    <div class="text-ink-700 p-8 text-sm">Conteúdo da rota entra aqui.</div>
  </AppShell>
</Story>

<!-- Caso limite: conteúdo mais alto que a tela não deve empurrar o menu para fora. -->
<Story name="TallContent">
  <AppShell data={{ user }} state={{ activeKey: 'tasks' }}>
    <div class="text-ink-700 space-y-4 p-8 text-sm">
      {#each Array.from({ length: 30 }, (_, index) => index) as index (index)}
        <p>Linha de conteúdo {index + 1}, só para esticar a tela.</p>
      {/each}
    </div>
  </AppShell>
</Story>
