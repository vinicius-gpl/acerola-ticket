import { type StorybookConfig } from '@storybook/svelte-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.svelte'],
  /* `addon-essentials` não existe mais: do Storybook 9 em diante controls, actions,
     viewport, backgrounds e docs vêm no core, e o pacote foi descontinuado. Sobra o a11y,
     que continua sendo addon — e é o que o CONTRIBUTING exige em todo primitivo. O
     addon-svelte-csf traz o formato `<Story>` que o Svelte 5 usa no lugar do CSF3 do React. */
  addons: ['@storybook/addon-a11y', '@storybook/addon-svelte-csf'],
  framework: { name: '@storybook/svelte-vite', options: {} },
  core: { disableTelemetry: true },
};

export default config;
