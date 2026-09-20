import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'acerola-agent-theme';

// O jsdom/Node desta máquina expõe um `localStorage` global quebrado (sem
// `.clear()`, por conta do backend experimental de webstorage do Node 25 —
// não é algo deste projeto). Um Storage falso e simples, sob nosso controle,
// evita depender desse detalhe de ambiente.
class FakeStorage implements Storage {
	private store = new Map<string, string>();
	get length() {
		return this.store.size;
	}
	clear() {
		this.store.clear();
	}
	getItem(key: string) {
		return this.store.get(key) ?? null;
	}
	setItem(key: string, value: string) {
		this.store.set(key, value);
	}
	removeItem(key: string) {
		this.store.delete(key);
	}
	key(index: number) {
		return Array.from(this.store.keys())[index] ?? null;
	}
}

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
