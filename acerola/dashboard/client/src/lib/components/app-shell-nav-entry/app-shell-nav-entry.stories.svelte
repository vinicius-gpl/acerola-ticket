<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import BarChart3 from '@lucide/svelte/icons/chart-column';
  import ListChecks from '@lucide/svelte/icons/list-checks';

  import Harness from './app-shell-nav-entry-harness.test.svelte';

  /**
   * A história monta o mesmo apoio do teste, e pelo mesmo motivo: o item de menu precisa do
   * contexto da barra para existir. Não é peça pública — só o `AppShell` o usa —, mas tem
   * história porque os estados dele (aceso, com contador) são os que mais quebram na tela.
   */
  const tasks = { key: 'tasks', label: 'Tarefas', to: '/tasks', icon: ListChecks };
  const reports = { key: 'reports', label: 'Relatórios', to: '/reports', icon: BarChart3 };

  const { Story } = defineMeta({
    title: 'Components/AppShellNavEntry',
    component: Harness,
  });
</script>

<Story name="Default" args={{ item: tasks }} />

<Story name="Active" args={{ item: tasks, isActive: true }} />

<Story name="WithBadge" args={{ item: reports, badge: 4 }} />

<Story name="ActiveWithBadge" args={{ item: reports, isActive: true, badge: 12 }} />

<!-- Caso limite: zero não vira selo. -->
<Story name="ZeroBadge (edge case)" args={{ item: reports, badge: 0 }} />

<!-- Caso limite: rótulo longo dentro da largura da barra. -->
<Story
  name="LongLabel (edge case)"
  args={{ item: { ...reports, label: 'Relatórios de acompanhamento mensal' } }}
/>
