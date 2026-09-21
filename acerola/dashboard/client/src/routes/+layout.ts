/**
 * O dashboard é uma SPA: nada é renderizado no servidor.
 *
 * Quem serve a tela em produção é o próprio Nest, como arquivo estático, e quem decide o que
 * aparece é o navegador. Ligar a renderização no servidor exigiria um Node servindo o
 * SvelteKit ao lado da API — outra peça para instalar, monitorar e manter viva, sem nada em
 * troca num sistema que só abre depois de identificar quem entrou.
 *
 * `adapter-static` com `fallback: index.html` (ver svelte.config.js) é o que faz qualquer
 * endereço cair na mesma página e o roteamento acontecer no navegador.
 */
export const ssr = false;
export const prerender = false;
