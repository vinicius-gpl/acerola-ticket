/**
 * A VOLTA DEPOIS DO LOGIN: quem chega sem sessão vai para `/login?next=<onde estava>`, e o
 * login devolve a pessoa para lá.
 *
 * É o que mantém o link do WhatsApp funcionando agora que abrir chamado exige conta: o
 * `/support?invite=…` (ou `?ticket=…`) atravessa o login inteiro, em vez de a pessoa cair na
 * raiz e perder o convite.
 */
export const LOGIN_RETURN_PARAM = 'next';

/** O endereço do login que, depois de entrar, volta para `url`. */
export function loginPathFor(url: URL): string {
  const back = `${url.pathname}${url.search}`;
  if (back === '/' || back === '/login') return '/login';

  return `/login?${new URLSearchParams({ [LOGIN_RETURN_PARAM]: back }).toString()}`;
}

/**
 * Para onde o login manda depois de entrar. Só aceita caminho DESTE site — `/algo`, nunca
 * `//outro-site` nem `https://…`: um `next` de fora transformaria o nosso login num trampolim
 * para página de golpe. Qualquer coisa estranha vira a raiz.
 */
export function safeReturnPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  if (raw === '/login' || raw.startsWith('/login?')) return '/';

  return raw;
}
