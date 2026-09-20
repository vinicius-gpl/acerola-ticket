// Tema simplificado em relação ao hook do projeto de referência
// (acerola-reader usa @tauri-apps/plugin-store + 4 paletas + modo "system").
// Aqui só existem duas paletas (mocha/latte), persistidas em localStorage
// como o pedido original especifica — sem API de plugin nenhuma.

export type Theme = 'catppuccin-mocha' | 'catppuccin-latte';

const STORAGE_KEY = 'acerola-agent-theme';
const DEFAULT_THEME: Theme = 'catppuccin-mocha';

function loadInitial(): Theme {
	if (typeof window === 'undefined') return DEFAULT_THEME;
	const saved = window.localStorage.getItem(STORAGE_KEY);
	return saved === 'catppuccin-latte' ? saved : DEFAULT_THEME;
}

const initial = loadInitial();
let theme = $state<Theme>(initial);

function apply(value: Theme) {
	if (typeof document === 'undefined') return;
	document.documentElement.setAttribute('data-theme', value);
}

apply(initial);

export function useTheme() {
	return {
		get value() {
			return theme;
		},
		toggle() {
			theme = theme === 'catppuccin-mocha' ? 'catppuccin-latte' : 'catppuccin-mocha';
			window.localStorage.setItem(STORAGE_KEY, theme);
			apply(theme);
		}
	};
}
