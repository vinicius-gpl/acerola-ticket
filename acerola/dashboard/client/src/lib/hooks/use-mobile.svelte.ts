/* Mesmo ponto de quebra da troca tabela → cartão (`xl`, 1280px). Abaixo disso a coluna de
   conteúdo é estreita — no tablet deitado os dois gráficos dividem ~750px —, e sem a forma
   compacta os nomes em volta da teia saem cortados pela borda. */
const MOBILE_BREAKPOINT = 1280;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

export class IsMobile {
  current = $state(false);

  constructor() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia(QUERY);
      this.current = media.matches;
      media.addEventListener('change', (e) => {
        this.current = e.matches;
      });
    }
  }
}

let instance: IsMobile | null = null;

export function useIsMobile(): IsMobile {
  if (!instance) {
    instance = new IsMobile();
  }
  return instance;
}
