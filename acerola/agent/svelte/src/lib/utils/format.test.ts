import { describe, expect, it } from 'vitest';
import { bytes, bytesPerSec, percent, uptime } from './format';

describe('bytes', () => {
	it('formata quantidades pequenas em bytes', () => {
		// feliz
		expect(bytes(512)).toBe('512 B');
	});

	it('escolhe a unidade certa pra cada faixa', () => {
		// feliz
		expect(bytes(1024)).toBe('1.0 KB');
		expect(bytes(1024 * 1024 * 3.5)).toBe('3.5 MB');
	});

	it('trata zero e negativo como "0 B"', () => {
		// triste
		expect(bytes(0)).toBe('0 B');
		expect(bytes(-10)).toBe('0 B');
	});
});

describe('bytesPerSec', () => {
	it('adiciona o sufixo /s à formatação de bytes', () => {
		// feliz
		expect(bytesPerSec(1024)).toBe('1.0 KB/s');
	});
});

describe('uptime', () => {
	it('mostra dias e horas quando passou de um dia', () => {
		// feliz
		expect(uptime(90000)).toBe('1d 1h');
	});

	it('mostra horas e minutos quando passou de uma hora mas não um dia', () => {
		// feliz
		expect(uptime(3660)).toBe('1h 1min');
	});

	it('mostra só minutos pra menos de uma hora, incluindo zero', () => {
		// triste (caso limite: zero segundos)
		expect(uptime(0)).toBe('0min');
		expect(uptime(120)).toBe('2min');
	});
});

describe('percent', () => {
	it('arredonda pra número inteiro com o símbolo %', () => {
		// feliz
		expect(percent(42.6)).toBe('43%');
	});

	it('lida com zero', () => {
		// triste
		expect(percent(0)).toBe('0%');
	});
});
