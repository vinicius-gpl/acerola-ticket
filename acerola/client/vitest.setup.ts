import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * Sem a limpeza, o DOM do teste anterior continua montado e uma consulta por texto
 * encontra o elemento da outra história — o teste passa por acaso e falha quando a ordem
 * dos arquivos muda.
 */
afterEach(() => {
  cleanup();
});

/**
 * O jsdom não implementa Pointer Events nem `scrollIntoView`. Componentes do Radix (o Select
 * baixado em `lib/vendor/ui`, por exemplo) chamam os três ao abrir — sem o stub, o teste
 * quebra com "is not a function" antes de testar o que importa.
 */
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

/**
 * O jsdom também não implementa `matchMedia`. O `Sidebar` do shadcn o consulta na montagem,
 * por `useIsMobile`, para decidir entre a barra e a gaveta — sem o stub toda tela que tem
 * menu quebra antes de renderizar qualquer coisa.
 *
 * O padrão é "não é celular": é o que vale na suíte, e deixar `matches: true` faria os
 * testes exercitarem a gaveta em vez da barra, que não é o caso que eles descrevem.
 */
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
