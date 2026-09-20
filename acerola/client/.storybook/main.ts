import { type StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  /* `addon-essentials` não existe mais: do Storybook 9 em diante controls, actions,
     viewport, backgrounds e docs vêm no core, e o pacote foi descontinuado. Sobra o a11y,
     que continua sendo addon — e é o que o CONTRIBUTING exige em todo primitivo. */
  addons: ['@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
  typescript: { reactDocgen: 'react-docgen-typescript' },
};

export default config;
