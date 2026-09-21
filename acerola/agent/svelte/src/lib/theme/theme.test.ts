import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeStorage } from '../../test-utils/fake-storage';

const STORAGE_KEY = 'acerola-agent-theme';

async function freshTheme() {
	// O módulo guarda o tema num $state no escopo do módulo, então cada teste
	// precisa de uma instância nova pra não herdar o estado do teste anterior.
	vi.resetModules();
	return import('./theme.svelte');
}

beforeEach(() => {
	vi.stubGlobal('localStorage', new FakeStorage());
	document.documentElement.removeAttribute('data-theme');
});

describe('useTheme', () => {
	it('começa em catppuccin-mocha quando não há nada salvo', async () => {
		// feliz
		const { useTheme } = await freshTheme();
		const theme = useTheme();
		expect(theme.value).toBe('catppuccin-mocha');
		expect(document.documentElement.getAttribute('data-theme')).toBe('catppuccin-mocha');
	});

	it('alterna entre mocha e latte e persiste no localStorage', async () => {
		// feliz
		const { useTheme } = await freshTheme();
		const theme = useTheme();

		theme.toggle();
		expect(theme.value).toBe('catppuccin-latte');
		expect(window.localStorage.getItem(STORAGE_KEY)).toBe('catppuccin-latte');
		expect(document.documentElement.getAttribute('data-theme')).toBe('catppuccin-latte');

		theme.toggle();
		expect(theme.value).toBe('catppuccin-mocha');
	});

	it('ignora valor inválido salvo no localStorage e cai no padrão', async () => {
		// triste: alguém (ou uma versão antiga) gravou um tema que não existe mais
		window.localStorage.setItem(STORAGE_KEY, 'nord');
		const { useTheme } = await freshTheme();
		expect(useTheme().value).toBe('catppuccin-mocha');
	});
});
