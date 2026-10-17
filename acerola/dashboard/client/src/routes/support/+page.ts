import { redirect } from '@sveltejs/kit';
import { type TicketArea } from '@template/shared/domain/ticket-catalog.util';
import { type SessionUser } from '@template/shared/schemas/user.schema';

import { authApi } from '$lib/api/auth.api';
import { ApiError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { loginPathFor } from '$lib/navigation/login-return';

/**
 * A Central de Chamados exige conta: qualquer pessoa logada abre e acompanha os chamados dela,
 * mesmo sem atender área nenhuma. Sem sessão, vai para o login e volta para cá — com o convite
 * ou o link do WhatsApp (`?invite=`, `?ticket=`) intactos.
 *
 * As áreas que a pessoa atende decidem só o link "Abrir o painel": quem não atende nenhuma
 * não tem painel, e o link a mandaria de volta para cá. Falhar ao ler as áreas não impede
 * ninguém de abrir chamado — só esconde o link.
 */
export async function load({
  url,
}: {
  url: URL;
}): Promise<{ user: SessionUser; areas: TicketArea[] }> {
  try {
    const user = await authApi.me();
    const areas = await ticketsApi.myAreas().catch(() => []);

    return { user, areas };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(307, loginPathFor(url));
    throw error;
  }
}
