const MOBILE_BREAKPOINT = 768;
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
