import { createRootRoute, Outlet } from '@tanstack/react-router';

import AppShell from '$lib/components/app-shell/app-shell.svelte';
import EmptyState from '$lib/components/empty-state/empty-state.svelte';
import { useAppShellModel } from '$lib/view-models/use-app-shell.model';

/**
 * A rota raiz só compõe. Nenhuma regra de negócio, nenhum `useQuery` solto — a seção 3 do
 * CONTRIBUTING vale aqui como em qualquer outra rota.
 */
export const Route = createRootRoute({
  component: RootRoute,
  notFoundComponent: RouteNotFound,
});

function RootRoute() {
  const { data, state } = useAppShellModel();

  return (
    <AppShell data={data} state={state}>
      <Outlet />
    </AppShell>
  );
}

function RouteNotFound() {
  return (
    <div className="mx-auto w-full max-w-lg px-6 py-16">
      <EmptyState
        data={{
          title: 'Esta tela não existe',
          description: 'O endereço pode estar errado, ou a tela ainda não foi construída.',
        }}
      />
    </div>
  );
}
