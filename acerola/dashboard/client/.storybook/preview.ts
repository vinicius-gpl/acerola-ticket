import { type Preview } from '@storybook/svelte';

import '../src/lib/theme/tokens.css';

const preview: Preview = {
  /* Gera a página "Docs" pra todo componente automaticamente — puxa o comentário que já
     existe em cima de cada `export function` como descrição, mais a tabela de props. Sem
     isto, a única forma de saber o que um compositor faz é abrir o `.tsx` e ler o código. */
  tags: ['autodocs'],
  parameters: {
    controls: { expanded: true },
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
