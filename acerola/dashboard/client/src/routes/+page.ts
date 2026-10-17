import { redirect } from '@sveltejs/kit';

import { ticketsApi } from '$lib/api/tickets.api';
import { ApiError } from '$lib/api/http-client';
import { useAreaContextModel } from '$lib/hooks/use-area-context/use-area-context.svelte';
import { contextPath } from '$lib/navigation/navigation';
import { loginPathFor } from '$lib/navigation/login-return';

/**
 * A raiz não tem tela própria: ela manda para os Chamados do ÚLTIMO contexto em que a pessoa
 * esteve (Infraestrutura, na primeira vez).
 *
 * Chamados, e não o Painel, porque é a única tela que existe nos três contextos — Sistema e
 * Manutenção não têm painel. Se o contexto guardado não for da pessoa (o cargo mudou, ou a
 * máquina é de outra), quem corrige é a casca, depois de saber as áreas dela (ver
 * `use-app-shell`).
 *
 * Quem não atende área NENHUMA não tem painel: é quem só pede socorro, e o lugar dela é a
 * Central de Chamados. Sem sessão, o login — e depois de entrar, de volta à raiz.
 */
export async function load({ url }: { url: URL }): Promise<never> {
  let areas: unknown[];
  try {
    areas = await ticketsApi.myAreas();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(307, loginPathFor(url));
    throw error;
  }

  if (areas.length === 0) redirect(307, '/support');
  redirect(307, contextPath(useAreaContextModel().context, '/tickets'));
}
