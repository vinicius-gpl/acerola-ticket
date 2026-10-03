/* Mesmo ponto de quebra da troca tabela → cartão (`xl`, 1280px). Abaixo disso a coluna de
   conteúdo é estreita — no tablet deitado os dois gráficos dividem ~750px —, e sem a forma
   compacta os nomes em volta da teia saem cortados pela borda. */
export const XL_BREAKPOINT = 1280;

/** "A janela está abaixo de `breakpoint` px?" — para o que CSS não resolve (gráfico, gaveta). */
export class MediaQueryBelow {
  current = $state(false);

  constructor(breakpoint: number) {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
      this.current = media.matches;
      media.addEventListener('change', (e) => {
        this.current = e.matches;
      });
    }
  }
}

/* Uma instância por breakpoint: dez gráficos na tela dividem o mesmo ouvinte, não dez. */
const instances: Record<number, MediaQueryBelow> = {};

export function useMediaQuery(breakpoint: number): MediaQueryBelow {
  instances[breakpoint] ??= new MediaQueryBelow(breakpoint);

  return instances[breakpoint];
}
