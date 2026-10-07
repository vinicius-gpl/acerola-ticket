import { error, redirect } from '@sveltejs/kit';

import { authApi } from '$lib/api/auth.api';
import { ApiError } from '$lib/api/http-client';

/**
 * O ENDEREÇO QUE NÃO EXISTE — é aqui que cai tudo o que nenhuma outra rota atende.
 *
 * Sem sessão, qualquer endereço do sistema leva à Central de Chamados (`/support`), e isso
 * inclui o endereço errado: quem não tem conta e digitou ou recebeu um link torto veio pedir
 * socorro, e "Esta tela não existe" não diz a ela para onde ir. As telas internas já fazem
 * isso pela guarda de `(app)/+layout.ts`; esta rota cobre o que fica FORA daquele grupo.
 *
 * Com sessão, o endereço errado continua sendo um endereço errado: 404, e a tela de erro
 * explica.
 *
 * Só 401 vira redirecionamento, pelo mesmo motivo da guarda: API fora do ar não é "não estou
 * logado".
 */
export async function load(): Promise<never> {
  try {
    await authApi.me();
  } catch (failure) {
    if (failure instanceof ApiError && failure.status === 401) redirect(307, '/support');
    throw failure;
  }

  error(404, 'Not Found');
}
