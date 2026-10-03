import { type Preview } from '@storybook/svelte';

import '../src/lib/theme/tokens.css';

const preview: Preview = {
  /* Gera a página "Docs" pra todo componente automaticamente — puxa o comentário que já
     existe em cima de cada `export function` como descrição, mais a tabela de props. Sem
     isto, a única forma de saber o que um compositor faz é abrir o `.tsx` e ler o código. */
  tags: ['autodocs'],
  parameters: {
    controls: { expanded: true },
    /* A régua pede que TUDO funcione em 400px de largura (skill `ui-standards`, §Responsivo).
       Estes dois tamanhos são o que as stories usam para mostrar a mesma tela nas duas
       formas: cartão empilhado no celular e tabela no computador. */
    viewport: {
      options: {
        celular: {
          name: 'Celular (400px)',
          styles: { width: '400px', height: '860px' },
          type: 'mobile',
        },
        tablet: {
          name: 'Tablet (820px)',
          styles: { width: '820px', height: '1180px' },
          type: 'tablet',
        },
      },
    },
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: '#F3F4F6' },
        { name: 'surface', value: '#FFFFFF' },
        { name: 'brand', value: '#1B3A8C' },
      ],
    },
    // A equipe opera o sistema no teclado o dia inteiro; contraste e foco são requisito.
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
};

export default preview;
