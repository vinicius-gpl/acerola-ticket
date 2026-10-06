import { redirect } from '@sveltejs/kit';

import { useAreaContextModel } from '$lib/hooks/use-area-context/use-area-context.svelte';
import { contextPath } from '$lib/navigation/navigation';

/**
 * A raiz não tem tela própria: ela manda para os Chamados do ÚLTIMO contexto em que a pessoa
 * esteve (Infraestrutura, na primeira vez).
 *
 * Chamados, e não o Painel, porque é a única tela que existe nos três contextos — Sistema e
 * Manutenção não têm painel. Se o contexto guardado não for da pessoa (o cargo mudou, ou a
 * máquina é de outra), quem corrige é a casca, depois de saber as áreas dela (ver
 * `use-app-shell`).
 */
export function load(): never {
  redirect(307, contextPath(useAreaContextModel().context, '/tickets'));
}
