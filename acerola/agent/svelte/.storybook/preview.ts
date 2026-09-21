import type { Preview } from '@storybook/svelte-vite';
import '../src/theme/tailwind.css';

// Toolbar de tema no Storybook: troca `data-theme` na raiz, o mesmo
// mecanismo que `theme.svelte.ts` usa em produção — assim toda story já
// nasce testável nas duas paletas sem duplicar lógica de tema.
const preview: Preview = {
	globalTypes: {
		theme: {
			description: 'Tema Catppuccin',
			toolbar: {
				title: 'Tema',
				icon: 'mirror',
				items: [
					{ value: 'catppuccin-mocha', title: 'Mocha (escuro)' },
					{ value: 'catppuccin-latte', title: 'Latte (claro)' }
				],
				dynamicTitle: true
			}
		}
	},
	initialGlobals: {
		theme: 'catppuccin-mocha'
	},
	decorators: [
		(story, context) => {
			document.documentElement.setAttribute('data-theme', context.globals.theme);
			return story();
		}
	],
	parameters: {
		backgrounds: { disable: true },
		layout: 'centered',
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},
		a11y: {
			test: 'todo'
		}
	}
};

export default preview;
