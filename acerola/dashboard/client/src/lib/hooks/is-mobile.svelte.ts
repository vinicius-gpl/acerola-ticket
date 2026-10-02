import { MediaQuery } from "svelte/reactivity";

/* 1024 e não 768: num tablet em pé (iPad Mini, 768px) a barra lateral fixa comia 256px e
   sobravam 494px de conteúdo — título espremido e tabela mostrando 3 das 8 colunas —,
   enquanto as regras de CSS continuavam medindo os 768px da JANELA. Abaixo de 1024 a barra
   vira gaveta e o conteúdo fica com a largura inteira. */
const DEFAULT_MOBILE_BREAKPOINT = 1024;

export class IsMobile extends MediaQuery {
	constructor(breakpoint: number = DEFAULT_MOBILE_BREAKPOINT) {
		super(`max-width: ${breakpoint - 1}px`);
	}
}
