// O `localStorage` que o jsdom/Node desta máquina expõe globalmente não
// implementa `.clear()`/`.getItem()` direito (efeito colateral do backend
// experimental de webstorage do Node 25 — não é algo deste projeto). Um
// Storage falso e simples, sob nosso controle, evita depender desse
// detalhe de ambiente em qualquer teste que precise de localStorage.
export class FakeStorage implements Storage {
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
