import { onDestroy } from 'svelte';
import { type Readable } from 'svelte/store';

/**
 * Espelha uma store do `@tanstack/svelte-query` num valor que os runes acompanham.
 *
 * O `fromStore` do Svelte NÃO serve aqui, e o motivo é sutil o bastante para valer o
 * registro: ele assina a store dentro de um efeito. Como cada emissão da consulta escreve no
 * `$state` que esse mesmo efeito lê, o efeito é invalidado e **reassina** — e reassinar uma
 * store do svelte-query cria um observador novo, que dispara outra busca.
 *
 * Quando a resposta é boa, o laço se esconde: a segunda busca acha o resultado em cache e
 * para. Quando a resposta é um erro, não há cache, e a consulta fica buscando para sempre —
 * `status` nunca sai de `pending`, e a tela fica carregando em vez de mostrar o motivo da
 * falha. Foi exatamente esse o defeito que apareceu ao migrar os view-models.
 *
 * Aqui a assinatura acontece UMA vez, fora de qualquer efeito, e é desfeita quando o
 * componente morre. Quando o svelte-query migrar para runes, este arquivo some.
 */
export function mirrorStore<T>(store: Readable<T>): { readonly current: T } {
  let current = $state<T>(undefined as T);

  // `subscribe` chama de volta na hora, então `current` já sai preenchido daqui.
  onDestroy(store.subscribe((value) => (current = value)));

  return {
    get current() {
      return current;
    },
  };
}
