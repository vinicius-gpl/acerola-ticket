import { useSyncExternalStore } from 'react';

/**
 * Gerado pelo CLI do shadcn e movido para `lib/`, como todo o resto do código.
 *
 * REESCRITO com `useSyncExternalStore`. A versão do CLI guardava o resultado em `useState` e
 * o gravava dentro de um `useEffect` — o que o `eslint-plugin-react-hooks` 7 passou a
 * recusar, e com razão: chamar `setState` de dentro de um efeito faz a tela renderizar uma
 * vez errada e corrigir depois. Em modo concorrente isso é um piscar visível na largura em
 * que a barra lateral vira gaveta.
 *
 * `useSyncExternalStore` é a API que existe exatamente para isto: ler de uma fonte de fora
 * do React (aqui, o `matchMedia` do navegador) sem intermediar com estado próprio. O valor
 * já sai certo no primeiro render, e não há um segundo.
 */
const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);

  return () => media.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * No servidor não há janela, e o padrão é "não é celular": a barra lateral é o formato
 * completo, e abrir na gaveta para depois corrigir seria o mesmo piscar por outro caminho.
 */
function getServerSnapshot(): boolean {
  return false;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
