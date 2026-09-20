import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach, vi } from 'vitest';
import { FakeStorage } from './test-utils/fake-storage';

// @testing-library/svelte não desmonta os componentes sozinho entre testes
// — sem isso, o segundo teste de um arquivo ainda vê o DOM montado pelo
// primeiro (e queries como getByText passam a achar "elemento duplicado").
afterEach(() => cleanup());

// Precisa ser global (não só dentro de um beforeEach de teste específico):
// módulos como theme.svelte.ts leem localStorage assim que são importados
// — antes de qualquer beforeEach rodar — então o stub precisa existir desde
// o carregamento do arquivo de teste. Ver FakeStorage pro motivo de não
// usar o localStorage nativo aqui.
vi.stubGlobal('localStorage', new FakeStorage());

// O uPlot (usado por AcerolaSparkline) chama matchMedia pra saber a
// densidade de pixel da tela — o jsdom não implementa isso.
vi.stubGlobal(
	'matchMedia',
	vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn()
	}))
);

// AcerolaSparkline observa o próprio container com ResizeObserver pra
// redimensionar o uPlot quando a janela nasce escondida (ver comentário em
// acerola-sparkline.svelte) — o jsdom não implementa essa classe.
class StubResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}
vi.stubGlobal('ResizeObserver', StubResizeObserver);

// O uPlot também usa Path2D pra montar os traçados antes de desenhar — o
// jsdom não implementa essa classe também.
class StubPath2D {
	addPath() {}
	moveTo() {}
	lineTo() {}
	closePath() {}
	rect() {}
	arc() {}
	arcTo() {}
	ellipse() {}
	bezierCurveTo() {}
	quadraticCurveTo() {}
}
vi.stubGlobal('Path2D', StubPath2D);

// jsdom não implementa canvas 2D de verdade (isso exigiria o pacote nativo
// `canvas`, que precisa compilar C++ — frágil demais só pra rodar teste).
// Um Proxy que aceita qualquer método/propriedade como no-op é suficiente
// pra o uPlot desenhar "no vazio" sem lançar exceção — os testes de
// AcerolaSparkline verificam que o componente monta, não o desenho em si.
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
	return new Proxy(
		{ canvas: this },
		{
			get: (target, prop) => (prop in target ? target[prop as keyof typeof target] : () => {}),
			set: (target, prop, value) => {
				(target as Record<string | symbol, unknown>)[prop] = value;
				return true;
			}
		}
	);
} as unknown as typeof HTMLCanvasElement.prototype.getContext;
